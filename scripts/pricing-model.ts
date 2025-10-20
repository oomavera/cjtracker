/**
 * Cleaning Pricing Matrix – TypeScript implementation
 * ---------------------------------------------------
 * Features: sqft, bedrooms, bathrooms (numeric, standardized);
 *           deep_clean, fridge, oven (binary);
 *           clutter (categorical: low|medium|high -> one-hot)
 * Model:    Ridge regression with K-fold CV for alpha
 * Extras:   Bootstrap PI for ad-hoc predictions; production-rate sanity check; CSV matrix export
 */

import * as fs from "fs";
import Papa from "papaparse";
import { Matrix, inverse } from "ml-matrix";

// ----- Types -----
type Row = {
  sqft: number; bedrooms: number; bathrooms: number;
  deep_clean: number; fridge: number; oven: number;
  clutter: string; // "low" | "medium" | "high"
  labor_hours?: number; // absent for prediction-only rows
};

type TrainResult = {
  beta: number[];                 // coefficients incl. intercept
  means: Record<string, number>;  // for numeric standardization
  stds: Record<string, number>;
  alpha: number;                  // chosen ridge strength
  cats: string[];                 // clutter levels seen in training, for OHE order
  residualStd: number;            // RMSE
  r2: number;                     // R-squared
  mae: number;                    // Mean absolute error
};

// ----- Utilities -----
function readCSV(path: string): Row[] {
  const csv = fs.readFileSync(path, "utf8");

  // Manual parsing to handle the specific format
  const lines = csv.trim().split('\n');
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
    if (!values || values.length < 9) continue;

    const sqft = parseFloat(values[3].replace(/[",]/g, ''));
    const bedrooms = parseInt(values[1]);
    const bathrooms = parseFloat(values[2]);
    const deepClean = values[4].toLowerCase().includes('deep') ? 1 : 0;
    const fridge = values[5].toLowerCase().trim() === 'yes' ? 1 : 0;
    const oven = values[6].toLowerCase().trim() === 'yes' ? 1 : 0;
    const clutter = values[7].toLowerCase().trim();
    const hours = parseFloat(values[8]);

    if (!isNaN(sqft) && !isNaN(bedrooms) && !isNaN(bathrooms) && !isNaN(hours)) {
      rows.push({
        sqft, bedrooms, bathrooms,
        deep_clean: deepClean,
        fridge, oven, clutter,
        labor_hours: hours
      });
    }
  }

  return rows;
}

function unique<T>(arr: T[]) { return Array.from(new Set(arr)); }

function standardize(cols: string[], rows: Row[]) {
  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};
  for (const c of cols) {
    const v = rows.map(r => Number((r as any)[c]));
    const m = v.reduce((a,b)=>a+b,0)/v.length;
    const s = Math.sqrt(v.reduce((a,b)=>a+(b-m)*(b-m),0)/Math.max(1, v.length-1));
    means[c]=m; stds[c]= s===0?1:s;
  }
  return {means, stds};
}

function designMatrix(rows: Row[], numeric: string[], binary: string[], clutterLevels: string[], means: Record<string,number>, stds: Record<string,number>) {
  const X: number[][] = [];
  for (const r of rows) {
    const x: number[] = [1]; // intercept
    for (const c of numeric) x.push((Number((r as any)[c]) - means[c]) / stds[c]);
    for (const b of binary) x.push(Number((r as any)[b]));
    // one-hot for clutter in the given order
    const cl = (r.clutter||"").toString();
    for (const lev of clutterLevels) x.push(cl===lev ? 1 : 0);
    X.push(x);
  }
  return new Matrix(X);
}

function ridgeFit(X: Matrix, y: Matrix, alpha: number, interceptIndex=0): number[] {
  // Closed-form (X'X + alpha * P)^-1 X'y with no penalty on intercept column
  const Xt = X.transpose();
  let G = Xt.mmul(X); // Gram
  const p = G.rows;
  const P = Matrix.eye(p, p);
  P.set(interceptIndex, interceptIndex, 0); // don't penalize intercept
  G = G.add(P.mul(alpha));

  // Invert and multiply
  const Xty = Xt.mmul(y);
  const G_inv = inverse(G);
  const beta = G_inv.mmul(Xty);
  return beta.to1DArray();
}

function predictOne(row: Row, model: TrainResult): number {
  const numeric = ["sqft","bedrooms","bathrooms"];
  const binary = ["deep_clean","fridge","oven"];
  const X = designMatrix([row], numeric, binary, model.cats, model.means, model.stds);
  const yhat = X.getRowVector(0).dot(new Matrix([model.beta]).transpose());
  return yhat;
}

function kfoldIndices(n: number, k: number, seed=42) {
  const idx = Array.from({length:n},(_,i)=>i);
  // Fisher-Yates shuffle
  let r = seed; // simple LCG
  for (let i=n-1;i>0;i--){
    r = (r*1664525 + 1013904223) >>> 0;
    const j = r%(i+1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const folds: number[][] = Array.from({length:k},()=>[]);
  idx.forEach((v,i)=>folds[i%k].push(v));
  return folds;
}

function mae(a: number[], b: number[]) {
  let s=0; for (let i=0;i<a.length;i++) s+=Math.abs(a[i]-b[i]); return s/a.length;
}

// ----- Training -----
function trainRidge(data: Row[], alphaGrid = Array.from({length:50},(_,i)=>Math.pow(10, -3 + i*(6/49))), kFold = Math.min(5, Math.max(2, Math.floor(data.length)))): TrainResult {
  const rows = data.filter(r => r.labor_hours!=null);
  const numeric = ["sqft","bedrooms","bathrooms"];
  const binary  = ["deep_clean","fridge","oven"];
  const cats = unique(rows.map(r => (r.clutter||"").toString())).sort(); // keep stable order

  const {means, stds} = standardize(numeric, rows);
  const X = designMatrix(rows, numeric, binary, cats, means, stds);
  const y = new Matrix(rows.map(r => [Number(r.labor_hours)]));

  // K-fold CV to pick alpha
  const folds = kfoldIndices(rows.length, kFold);
  let bestAlpha = alphaGrid[0], bestMAE = Infinity;

  for (const a of alphaGrid) {
    const foldErrors: number[] = [];
    for (let f=0; f<folds.length; f++){
      const testIdx = new Set(folds[f]);
      const Xtr = new Matrix(X.rows - folds[f].length, X.columns);
      const ytr = new Matrix(X.rows - folds[f].length, 1);
      const XteArr: number[][] = []; const yteArr: number[] = [];
      let ri=0;
      for (let i=0;i<X.rows;i++){
        if (!testIdx.has(i)) {
          Xtr.setRow(ri, X.getRow(i));
          ytr.set(ri,0, y.get(i,0));
          ri++;
        } else {
          XteArr.push(X.getRow(i));
          yteArr.push(y.get(i,0));
        }
      }
      const beta = ridgeFit(Xtr, ytr, a);
      const yhat = XteArr.map(row => row.reduce((s, v, j)=> s + v*beta[j], 0));
      foldErrors.push(mae(yteArr, yhat));
    }
    const m = foldErrors.reduce((s,v)=>s+v,0)/foldErrors.length;
    if (m < bestMAE) { bestMAE=m; bestAlpha=a; }
  }

  // Final fit
  const beta = ridgeFit(X, y, bestAlpha);

  // Calculate metrics
  const yhat = X.mmul(new Matrix([beta]).transpose());
  let rss=0, tss=0;
  const yMean = y.to1DArray().reduce((a,b)=>a+b,0) / y.rows;
  const residuals: number[] = [];

  for (let i=0;i<y.rows;i++) {
    const actual = y.get(i,0);
    const pred = yhat.get(i,0);
    const e = actual - pred;
    residuals.push(Math.abs(e));
    rss += e*e;
    tss += (actual - yMean) * (actual - yMean);
  }

  const rmse = Math.sqrt(rss/Math.max(1, y.rows - X.columns));
  const r2 = 1 - (rss / tss);
  const maeValue = residuals.reduce((a,b)=>a+b,0) / residuals.length;

  return { beta, means, stds, alpha: bestAlpha, cats, residualStd: rmse, r2, mae: maeValue };
}

// ----- Bootstrap PI for a single prediction -----
function bootstrapPI(train: Row[], query: Row, B=2000, seed=42): {low:number, high:number, point: number} {
  const rng = (function*(){ let r=seed>>>0; while(true){ r=(r*1664525+1013904223)>>>0; yield r/2**32; }})();
  const rows = train.filter(r => r.labor_hours!=null);
  const preds: number[] = [];
  for (let b=0;b<B;b++){
    const sample: Row[] = [];
    for (let i=0;i<rows.length;i++){
      const u = (rng.next().value as number);
      const j = Math.floor(u * rows.length);
      sample.push(rows[j]);
    }
    const m = trainRidge(sample);
    preds.push(predictOne(query, m));
  }
  preds.sort((a,b)=>a-b);
  const q = (p:number) => {
    const idx = Math.floor(p*(preds.length-1));
    return preds[idx];
  };
  const median = preds[Math.floor(preds.length/2)];
  return { low: q(0.025), high: q(0.975), point: median };
}

// ----- Production-rate sanity check learned from data -----
function learnRateChecks(rows: Row[]) {
  const withHours = rows.filter(r=>r.labor_hours!=null && r.sqft>0);
  if (withHours.length<3) return null;
  // productivity = sqft / hours
  const prodAll = withHours.map(r => r.sqft/Number(r.labor_hours));
  const median = (arr:number[]) => { const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2;};

  const medAll = median(prodAll);

  const group = (pred:(r:Row)=>boolean) => {
    const a = withHours.filter(pred).map(r=> r.sqft/Number(r.labor_hours));
    return a.length? median(a): medAll;
  };

  const base = group(r=> r.deep_clean===0);
  const deep = group(r=> r.deep_clean===1);
  const deepMult = base>0 ? (base/deep) : 1.0;

  const byClutter: Record<string, number> = {};
  for (const c of ["low","medium","high"]) {
    const g = group(r=> (r.clutter||"").toString().toLowerCase()===c);
    byClutter[c] = base>0 ? (base/g) : 1.0; // multiplier to apply on base rate
  }

  // Appliance add-ons (median deltas)
  const delta = (flag: "fridge"|"oven") => {
    const yes = withHours.filter(r=>r[flag]===1);
    const no  = withHours.filter(r=>r[flag]===0);
    if (yes.length && no.length) {
      const medYes = median(yes.map(r=>Number(r.labor_hours)));
      const medNo  = median(no.map(r=>Number(r.labor_hours)));
      return Math.max(0, medYes - medNo);
    }
    return 0.5; // fallback minutes ~30m = 0.5h
  };

  return {
    baseRateSqftPerHour: base, // e.g., 500 sqft/h
    deepMultiplier: isFinite(deepMult)&&deepMult>0? deepMult: 1.3,
    clutterMultipliers: byClutter,
    addOnHours: { fridge: delta("fridge"), oven: delta("oven") }
  };
}

function rateCheckHours(q: Row, rates: ReturnType<typeof learnRateChecks>|null) {
  if (!rates || !isFinite(rates.baseRateSqftPerHour) || rates.baseRateSqftPerHour<=0) return NaN;
  const cm = rates.clutterMultipliers[(q.clutter||"").toString().toLowerCase()] ?? 1.0;
  const effRate = rates.baseRateSqftPerHour / ( (q.deep_clean? rates.deepMultiplier:1.0) * (cm||1.0) );
  const add = (q.fridge? rates.addOnHours.fridge:0) + (q.oven? rates.addOnHours.oven:0);
  return (q.sqft / effRate) + add;
}

// ----- Matrix generation -----
function roundToNearest5(x:number){ return Math.round(x/5)*5; }

function buildMatrix(model: TrainResult, data: Row[], opts?: {
  hourlyRate?: number, minCharge?: number, travelFee?: number,
  sqftStart?: number, sqftEnd?: number, sqftStep?: number,
  bedrooms?: number[], bathrooms?: number[], deepValues?: number[], clutterLevels?: string[],
  includeAppliances?: number[]
}) {
  const hourlyRate = opts?.hourlyRate ?? 80;
  const minCharge = opts?.minCharge ?? 120;
  const travelFee = opts?.travelFee ?? 0;
  const sqftStart = opts?.sqftStart ?? 800;
  const sqftEnd   = opts?.sqftEnd ?? 5000;
  const sqftStep  = opts?.sqftStep ?? 200;
  const bedrooms  = opts?.bedrooms ?? [1,2,3,4,5,6];
  const bathrooms = opts?.bathrooms ?? [1,2,3,4,5];
  const deepVals  = opts?.deepValues ?? [0,1];
  const clutters  = opts?.clutterLevels ?? ["low","medium","high"];
  const appl      = opts?.includeAppliances ?? [0,1];

  const rates = learnRateChecks(data);

  const rows: any[] = [];
  for (let sqft=sqftStart; sqft<=sqftEnd; sqft+=sqftStep){
    for (const br of bedrooms) for (const ba of bathrooms)
      for (const d of deepVals) for (const c of clutters)
        for (const f of appl) for (const o of appl) {
          const q: Row = {sqft, bedrooms:br, bathrooms:ba, deep_clean:d, clutter:c, fridge:f, oven:o};
          const hours = predictOne(q, model);
          const rc    = rateCheckHours(q, rates);
          const hoursPoint = Math.max(0.5, hours);

          // Calculate for 2 cleaners (divide by 2 for clock hours)
          const clockHours = hoursPoint / 2;
          const pricePoint = Math.max(minCharge, roundToNearest5(clockHours*hourlyRate)) + travelFee;

          rows.push({
            sqft,
            bedrooms:br,
            bathrooms:ba,
            clean_type: d===1 ? 'deep' : 'standard',
            clutter:c,
            fridge: f===1 ? 'yes' : 'no',
            oven: o===1 ? 'yes' : 'no',
            labor_hours: +hoursPoint.toFixed(2),
            clock_hours: +clockHours.toFixed(2),
            rate_check_hours: isNaN(rc)? "": +rc.toFixed(2),
            price: +pricePoint.toFixed(2)
          });
        }
  }
  const csv = Papa.unparse(rows);
  fs.writeFileSync("./pricing_matrix.csv", csv, "utf8");
  return rows.length;
}

// ----- Example main -----
const input = process.argv[2] ?? "ReferenceData/Ref1.csv";
const data = readCSV(input);

console.log(`Loaded ${data.length} observations\n`);

const model = trainRidge(data);
console.log("=== Model Training Results ===");
console.log(`Chosen alpha (regularization): ${model.alpha.toFixed(6)}`);
console.log(`R² (variance explained): ${model.r2.toFixed(4)}`);
console.log(`MAE (mean absolute error): ${model.mae.toFixed(3)} hours`);
console.log(`RMSE (root mean square error): ${model.residualStd.toFixed(3)} hours\n`);

// Show coefficients
console.log("=== Model Coefficients ===");
const featureNames = ["intercept", "sqft", "bedrooms", "bathrooms", "deep_clean", "fridge", "oven", ...model.cats.map(c => `clutter_${c}`)];
model.beta.forEach((coef, i) => {
  console.log(`${featureNames[i].padEnd(20)}: ${coef > 0 ? '+' : ''}${coef.toFixed(6)}`);
});
console.log();

// Example ad-hoc prediction with bootstrap PI for a single job
const query: Row = { sqft:2390, bedrooms:4, bathrooms:2, deep_clean:1, clutter:"medium", fridge:0, oven:0 };
const point = predictOne(query, model);
console.log("=== Example Prediction ===");
console.log(`Input: ${query.sqft}sqft, ${query.bedrooms}bed, ${query.bathrooms}bath, deep clean, medium clutter`);
console.log(`Point prediction: ${point.toFixed(2)} hours`);

// Bootstrap PI only for targeted queries (B can be large since we do it once)
console.log("\nCalculating 95% bootstrap prediction interval (2000 samples)...");
const {low, high, point: bootPoint} = bootstrapPI(data, query, 2000);
console.log(`Bootstrap median: ${bootPoint.toFixed(2)} hours`);
console.log(`95% PI: [${low.toFixed(2)}, ${high.toFixed(2)}] hours\n`);

// Production rate check
const rates = learnRateChecks(data);
if (rates) {
  console.log("=== Production Rate Sanity Check ===");
  console.log(`Base rate: ${rates.baseRateSqftPerHour.toFixed(0)} sqft/hour`);
  console.log(`Deep clean multiplier: ${rates.deepMultiplier.toFixed(2)}x`);
  console.log(`Clutter multipliers:`, rates.clutterMultipliers);
  console.log(`Appliance add-ons:`, rates.addOnHours);
  const rcHours = rateCheckHours(query, rates);
  if (!isNaN(rcHours)) {
    console.log(`Rate check for example: ${rcHours.toFixed(2)} hours\n`);
  }
}

// Save model to JSON
const modelExport = {
  coefficients: Object.fromEntries(featureNames.map((name, i) => [name, model.beta[i]])),
  standardization: {
    means: model.means,
    stds: model.stds
  },
  categories: {
    clutter: model.cats
  },
  metrics: {
    r2: model.r2,
    mae: model.mae,
    rmse: model.residualStd,
    alpha: model.alpha,
    n_samples: data.length
  }
};

fs.writeFileSync("./scripts/ridge_model.json", JSON.stringify(modelExport, null, 2));
console.log("Model saved to ./scripts/ridge_model.json");

// Build the full pricing matrix
const n = buildMatrix(model, data, {
  hourlyRate: 80,
  minCharge: 120,
  travelFee: 0,
  sqftStart: 800,
  sqftEnd: 5000,
  sqftStep: 200
});
console.log(`\nWrote pricing_matrix.csv with ${n} rows`);
