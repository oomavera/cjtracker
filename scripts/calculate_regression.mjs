#!/usr/bin/env node
/**
 * Calculate linear regression coefficients from Ref1.csv
 * Uses ordinary least squares (OLS) regression
 * No external dependencies - pure JavaScript
 */

import fs from 'fs';

// Load and parse CSV
const csv = fs.readFileSync('ReferenceData/Ref1.csv', 'utf-8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',');

// Parse data
const data = lines.slice(1).map(line => {
  const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g).map(v => v.replace(/"/g, '').trim());

  const sqft = parseFloat(values[3].replace(/,/g, ''));
  const bedrooms = parseInt(values[1]);
  const bathrooms = parseFloat(values[2]);
  const deepClean = values[4].toLowerCase().includes('deep') ? 1 : 0;
  const fridge = values[5].toLowerCase() === 'yes' ? 1 : 0;
  const oven = values[6].toLowerCase() === 'yes' ? 1 : 0;
  const clutter = values[7].toLowerCase().trim();
  const hours = parseFloat(values[8]);

  return { sqft, bedrooms, bathrooms, deepClean, fridge, oven, clutter, hours };
});

console.log(`Loaded ${data.length} observations\n`);

// Convert clutter to dummy variables (low is reference)
const clutterMedium = data.map(d => d.clutter === 'medium' ? 1 : 0);
const clutterHigh = data.map(d => d.clutter === 'high' ? 1 : 0);

// Create design matrix X and target vector y
const n = data.length;
const X = [];
const y = data.map(d => d.hours);

for (let i = 0; i < n; i++) {
  X.push([
    1,  // intercept
    data[i].sqft,
    data[i].bedrooms,
    data[i].bathrooms,
    data[i].deepClean,
    data[i].fridge,
    data[i].oven,
    clutterMedium[i],
    clutterHigh[i]
  ]);
}

// Matrix operations
function transpose(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}

function multiply(A, B) {
  const result = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      result[i][j] = 0;
      for (let k = 0; k < A[0].length; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

function inverse(matrix) {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  return augmented.map(row => row.slice(n));
}

// OLS: β = (X'X)^(-1) X'y
const Xt = transpose(X);
const XtX = multiply(Xt, X);
const XtX_inv = inverse(XtX);
const Xty = multiply(Xt, y.map(val => [val]));
const beta = multiply(XtX_inv, Xty).map(row => row[0]);

const featureNames = [
  'intercept',
  'sqft',
  'bedrooms',
  'bathrooms',
  'deep_clean',
  'fridge',
  'oven',
  'clutter_medium',
  'clutter_high'
];

console.log('=== Regression Coefficients ===');
featureNames.forEach((name, i) => {
  console.log(`${name.padEnd(20)}: ${beta[i].toFixed(6)}`);
});

// Calculate R² and metrics
const predictions = X.map(row => row.reduce((sum, x, i) => sum + x * beta[i], 0));
const residuals = y.map((yi, i) => yi - predictions[i]);
const yMean = y.reduce((a, b) => a + b) / n;
const sst = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
const ssr = residuals.reduce((sum, r) => sum + r * r, 0);
const r2 = 1 - (ssr / sst);
const mae = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;
const rmse = Math.sqrt(ssr / n);

console.log(`\n=== Model Fit ===`);
console.log(`R²:   ${r2.toFixed(4)}`);
console.log(`MAE:  ${mae.toFixed(2)} hours`);
console.log(`RMSE: ${rmse.toFixed(2)} hours`);

// Export to JSON
const modelData = {
  coefficients: {
    intercept: beta[0],
    sqft: beta[1],
    bedrooms: beta[2],
    bathrooms: beta[3],
    deep_clean: beta[4],
    fridge: beta[5],
    oven: beta[6],
    clutter_medium: beta[7],
    clutter_high: beta[8]
  },
  metrics: {
    r2: r2,
    mae: mae,
    rmse: rmse,
    n_samples: n
  },
  reference_category: {
    clutter: 'low'
  }
};

fs.writeFileSync('scripts/regression_model.json', JSON.stringify(modelData, null, 2));
console.log(`\nModel saved to scripts/regression_model.json`);

// Test predictions
console.log(`\n=== Sample Predictions ===`);
[0, 6, 10].forEach(idx => {
  console.log(`${data[idx].sqft}sqft, ${data[idx].bedrooms}bed, ${data[idx].bathrooms}bath, ${data[idx].deepClean ? 'deep' : 'standard'}, ${data[idx].clutter} clutter, fridge:${data[idx].fridge}, oven:${data[idx].oven}`);
  console.log(`  Predicted: ${predictions[idx].toFixed(2)}h, Actual: ${y[idx]}h, Error: ${Math.abs(predictions[idx] - y[idx]).toFixed(2)}h\n`);
});
