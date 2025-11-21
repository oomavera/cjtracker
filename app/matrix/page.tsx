'use client';

import { useState } from 'react';

export default function MatrixPage() {
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [sqFeet, setSqFeet] = useState('');
  const [deepCleanPrice, setDeepCleanPrice] = useState<number | null>(null);
  const [standardCleanPrice, setStandardCleanPrice] = useState<number | null>(null);
  const [standardHours, setStandardHours] = useState<number | null>(null);
  const [deepCleanHours, setDeepCleanHours] = useState<number | null>(null);
  const [soloStandardHours, setSoloStandardHours] = useState<number | null>(null);
  const [soloDeepHours, setSoloDeepHours] = useState<number | null>(null);
  const [soloStandardPrice, setSoloStandardPrice] = useState<number | null>(null);
  const [soloDeepPrice, setSoloDeepPrice] = useState<number | null>(null);

  // Clutter level - key factor in estimation
  const [clutterLevel, setClutterLevel] = useState<'low' | 'medium' | 'high'>('low');

  // Add-ons
  const [addFridge, setAddFridge] = useState(false);
  const [addOven, setAddOven] = useState(false);

  // Sales call checklist (compact UI above the pricing matrix)
  const checklistItems = [
    'Understand what is wrong with the home, and how they want it to look.',
    'Get the address and condition of the home details.',
    "Figure out what they've tried to keep it cleaned (solo, spouse, other cleaners).",
    'Communicate how their current approach was admirable, but missing a key that we have.',
    'Quick pitch then reveal price.',
    'Attempt to value stack our 3 bonuses.',
    'Assumptive close by presenting dates that might work for them.',
    'Objection handling.',
    'Nudging questions into endzone.',
    'Qualifying statements + onboarding questions.',
  ];
  const [checklistState, setChecklistState] = useState<boolean[]>(() =>
    Array(checklistItems.length).fill(false)
  );
  const toggleChecklist = (index: number) => {
    setChecklistState((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };
  const resetChecklist = () => setChecklistState(Array(checklistItems.length).fill(false));

  // Ridge regression model (K-fold CV, trained on Ref1.csv)
  // Model: 5-fold CV R² = 0.8210, MAE = 0.499 hours, RMSE = 0.610 hours, Alpha = 0.25
  const ridgeModel = {
    coefficients: {
      intercept: 2.791896,
      sqft: -0.080504,
      bedrooms: 0.594798,
      bathrooms: -0.099479,
      deep_clean: 2.117875,
      fridge: -0.558166,
      oven: 0.8788,
      clutter_high: 0.290614,
      clutter_low: -0.245159,
      clutter_medium: -0.045455
    },
    standardization: {
      means: {
        sqft: 2349.8462,
        bedrooms: 3.6923,
        bathrooms: 2.6346
      },
      stds: {
        sqft: 1438.2056,
        bedrooms: 0.9515,
        bathrooms: 0.9152
      }
    },
    categories: {
      clutter: ["high", "low", "medium"]
    }
  };

  // Reference data from Ref1.csv - for display purposes
  const referenceData = [
    { name: 'Raj', beds: 4, baths: 3, sqft: 2758, type: 'standard', fridge: false, oven: false, clutter: 'high', hours: 3 },
    { name: 'Patrick', beds: 3, baths: 2, sqft: 1554, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 1.75 },
    { name: 'Rida', beds: 6, baths: 5, sqft: 6648, type: 'standard', fridge: false, oven: false, clutter: 'high', hours: 4 },
    { name: 'Rida', beds: 6, baths: 5, sqft: 6648, type: 'deep', fridge: false, oven: false, clutter: 'high', hours: 6.2 },
    { name: 'Aj', beds: 2, baths: 2, sqft: 1002, type: 'standard', fridge: false, oven: false, clutter: 'high', hours: 2 },
    { name: 'Brianna', beds: 3, baths: 2, sqft: 1167, type: 'deep', fridge: true, oven: true, clutter: 'high', hours: 5 },
    { name: 'Anthony', beds: 2, baths: 2, sqft: 1188, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 2.3 },
    { name: 'Trey', beds: 5, baths: 4, sqft: 4214, type: 'standard', fridge: false, oven: false, clutter: 'high', hours: 3.5 },
    { name: 'Michael', beds: 4, baths: 3, sqft: 2551, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 3 },
    { name: 'Hany', beds: 4, baths: 2, sqft: 2042, type: 'deep', fridge: true, oven: false, clutter: 'low', hours: 4 },
    { name: 'Leilani', beds: 3, baths: 2, sqft: 1497, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 2 },
    { name: 'Leilani', beds: 3, baths: 2, sqft: 1497, type: 'deep', fridge: true, oven: true, clutter: 'low', hours: 4 },
    { name: 'Sundeep', beds: 4, baths: 2, sqft: 1846, type: 'deep', fridge: true, oven: true, clutter: 'high', hours: 6 },
    { name: 'Patricia', beds: 3, baths: 2, sqft: 1957, type: 'standard', fridge: false, oven: false, clutter: 'medium', hours: 2.5 },
    { name: 'Chitra', beds: 4, baths: 2, sqft: 1777, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 2.5 },
    { name: 'Celeste', beds: 3, baths: 2, sqft: 1260, type: 'deep', fridge: true, oven: true, clutter: 'medium', hours: 5.2 },
    { name: 'Kathy', beds: 3, baths: 3, sqft: 1687, type: 'deep', fridge: false, oven: false, clutter: 'medium', hours: 4.1 },
    { name: 'Mike', beds: 3, baths: 2, sqft: 1875, type: 'deep', fridge: true, oven: false, clutter: 'low', hours: 4.4 },
    { name: 'Jack', beds: 4, baths: 2, sqft: 2271, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 2.5 },
    { name: 'Craig', beds: 4, baths: 2, sqft: 2467, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 3.2 },
    { name: 'Jonathan', beds: 4, baths: 3, sqft: 2090, type: 'deep', fridge: false, oven: false, clutter: 'low', hours: 5.17 },
    { name: 'Alyssa', beds: 4, baths: 3, sqft: 2023, type: 'standard', fridge: false, oven: false, clutter: 'medium', hours: 3.5 },
    { name: 'Debbie', beds: 4, baths: 2, sqft: 1428, type: 'deep', fridge: false, oven: true, clutter: 'high', hours: 7 },
    { name: 'Joanne', beds: 4, baths: 4, sqft: 3859, type: 'deep', fridge: false, oven: true, clutter: 'low', hours: 5.5 },
    { name: 'Andrea', beds: 3, baths: 2.5, sqft: 1700, type: 'standard', fridge: false, oven: false, clutter: 'medium', hours: 2 },
    { name: 'Jonathan', beds: 4, baths: 3, sqft: 2090, type: 'standard', fridge: false, oven: false, clutter: 'medium', hours: 2.6 },
  ];

  // Ridge regression model: Predicts labor hours from property attributes
  // Trained with K-fold CV, includes proper standardization
  const estimateCleaningTime = (
    beds: number,
    baths: number,
    sqft: number,
    isDeepClean: boolean,
    includeFridge: boolean,
    includeOven: boolean,
    clutterLevel: 'low' | 'medium' | 'high'
  ): number => {
    const { coefficients, standardization } = ridgeModel;

    // Start with intercept
    let hours = coefficients.intercept;

    // Standardize numeric features (z-score normalization)
    const sqft_std = (sqft - standardization.means.sqft) / standardization.stds.sqft;
    const beds_std = (beds - standardization.means.bedrooms) / standardization.stds.bedrooms;
    const baths_std = (baths - standardization.means.bathrooms) / standardization.stds.bathrooms;

    // Add standardized numeric features
    hours += coefficients.sqft * sqft_std;
    hours += coefficients.bedrooms * beds_std;
    hours += coefficients.bathrooms * baths_std;

    // Binary features (not standardized)
    hours += coefficients.deep_clean * (isDeepClean ? 1 : 0);
    hours += coefficients.fridge * (includeFridge ? 1 : 0);
    hours += coefficients.oven * (includeOven ? 1 : 0);

    // One-hot encoded clutter (all categories get coefficients)
    if (clutterLevel === 'high') {
      hours += coefficients.clutter_high;
    } else if (clutterLevel === 'low') {
      hours += coefficients.clutter_low;
    } else if (clutterLevel === 'medium') {
      hours += coefficients.clutter_medium;
    }

    // Ensure non-negative and round to nearest 0.25 hours
    hours = Math.max(0.5, hours);
    return Math.round(hours * 4) / 4;
  };

  const calculatePricing = () => {
    const beds = parseFloat(bedrooms);
    const baths = parseFloat(bathrooms);
    const sqft = parseFloat(sqFeet);

    if (isNaN(beds) || isNaN(baths) || isNaN(sqft)) {
      alert('Please enter valid numbers for all fields');
      return;
    }

    // Calculate standard clean hours using regression model
    const standardHoursEstimate = estimateCleaningTime(
      beds,
      baths,
      sqft,
      false,  // isDeepClean = false
      addFridge,
      addOven,
      clutterLevel
    );

    // Calculate deep clean hours using regression model
    const deepHoursEstimate = estimateCleaningTime(
      beds,
      baths,
      sqft,
      true,  // isDeepClean = true
      addFridge,
      addOven,
      clutterLevel
    );

    const hourlyRate = 90; // Team rate (2 cleaners)
    const soloRate = 45;   // Single-cleaner rate

    // Model predicts actual clock hours (time on site with 2 cleaners)
    // No need to divide - the training data is already in clock hours
    setStandardHours(standardHoursEstimate);
    setDeepCleanHours(deepHoursEstimate);

    // Price is based on clock hours × hourly rate
    // If cleaners are there 2 hours at $90/hr = $180
    setStandardCleanPrice(standardHoursEstimate * hourlyRate);
    setDeepCleanPrice(deepHoursEstimate * hourlyRate);

    if (standardHoursEstimate < 3) {
      const soloHours = standardHoursEstimate * 2;
      setSoloStandardHours(soloHours);
      setSoloStandardPrice(soloHours * soloRate);
    } else {
      setSoloStandardHours(null);
      setSoloStandardPrice(null);
    }

    if (deepHoursEstimate < 3) {
      const soloHours = deepHoursEstimate * 2;
      setSoloDeepHours(soloHours);
      setSoloDeepPrice(soloHours * soloRate);
    } else {
      setSoloDeepHours(null);
      setSoloDeepPrice(null);
    }
  };

  const reset = () => {
    setBedrooms('');
    setBathrooms('');
    setSqFeet('');
    setDeepCleanPrice(null);
    setStandardCleanPrice(null);
    setStandardHours(null);
    setDeepCleanHours(null);
    setSoloStandardHours(null);
    setSoloDeepHours(null);
    setSoloStandardPrice(null);
    setSoloDeepPrice(null);
    setClutterLevel('low');
    setAddFridge(false);
    setAddOven(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Cleaning Pricing Matrix
          </h1>

          <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Sales Call Checklist</p>
              <button
                onClick={resetChecklist}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Reset
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {checklistItems.map((item, idx) => (
                <label key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={checklistState[idx]}
                    onChange={() => toggleChecklist(idx)}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="leading-snug">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bedrooms
              </label>
              <input
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter number of bedrooms"
                min="0"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bathrooms
              </label>
              <input
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter number of bathrooms"
                min="0"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Square Feet
              </label>
              <input
                type="number"
                value={sqFeet}
                onChange={(e) => setSqFeet(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter total square footage"
                min="0"
                step="1"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Clutter Level</h3>
            <div className="space-y-3">
              <div>
                <select
                  value={clutterLevel}
                  onChange={(e) => setClutterLevel(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low - Minimal items out, well maintained</option>
                  <option value="medium">Medium - Moderate items, typical lived-in home</option>
                  <option value="high">High - Many items out, requires extra organization</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add-Ons</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addFridge}
                  onChange={(e) => setAddFridge(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Clean Inside Fridge</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addOven}
                  onChange={(e) => setAddOven(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Clean Inside Oven</span>
              </label>
              <p className="text-xs text-gray-500 italic mt-2">
                Note: Add-ons affect both Standard and Deep Clean estimates. Ceiling fans are included in Deep Clean only.
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={calculatePricing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Calculate Pricing
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>

          {deepCleanPrice !== null && standardCleanPrice !== null && (
            <div className="mt-8 space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-300 rounded-lg p-6 space-y-3">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Deep Clean Price
                </h2>
                <p className="text-4xl font-bold text-purple-700">
                  ${deepCleanPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Estimated time: {deepCleanHours?.toFixed(2)} hours
                </p>
                {soloDeepPrice !== null && soloDeepHours !== null && (
                  <div className="mt-2 p-3 bg-white/70 border border-purple-200 rounded-lg">
                    <p className="text-sm font-semibold text-purple-800">Solo Deep (1 cleaner)</p>
                    <p className="text-xl font-bold text-purple-700">
                      ${soloDeepPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Estimated time: {soloDeepHours.toFixed(2)} hours @ $45/hr
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-6 space-y-3">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Standard Clean Price
                </h2>
                <p className="text-4xl font-bold text-blue-700">
                  ${standardCleanPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Estimated time: {standardHours?.toFixed(2)} hours
                </p>
                {soloStandardPrice !== null && soloStandardHours !== null && (
                  <div className="mt-2 p-3 bg-white/70 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-800">Solo Standard (1 cleaner)</p>
                    <p className="text-xl font-bold text-blue-700">
                      ${soloStandardPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Estimated time: {soloStandardHours.toFixed(2)} hours @ $45/hr
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                <p className="text-xs text-gray-600 text-center">
                  $90/hour service rate (2 cleaners) | Eligible solos shown when 2-person time &lt; 3 hrs (solo time &lt; 6 hrs) at $45/hour | Deep cleans include ceiling fans
                </p>
              </div>
            </div>
          )}
      </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Reference Data from Ref1.csv (26 properties)
          </h3>
          <div className="text-xs text-gray-600 space-y-1 max-h-64 overflow-y-auto">
            {referenceData.map((data, idx) => (
              <p key={idx}>
                • {data.name}: {data.beds} bed, {data.baths} bath, {data.sqft.toLocaleString()} sqft
                {data.type === 'standard' ? ' (Standard)' : ' (Deep)'}
                {data.fridge ? ' +Fridge' : ''}
                {data.oven ? ' +Oven' : ''}
                {' - '}{data.clutter.charAt(0).toUpperCase() + data.clutter.slice(1)} clutter
                {' = '}{data.hours}hrs
              </p>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Algorithm:</strong> Ridge regression (L2-regularized) with 5-fold cross-validation for α tuning (best α = 0.25). Trained on 26 actual cleaning jobs with standardized square footage, bedrooms, and bathrooms. Predicts labor-hours from property size, bed/baths, deep-clean flag, clutter level, and fridge/oven tasks. CV performance: R² = 0.821 (82% variance explained), MAE = 0.499 hours, RMSE = 0.610 hours. This approach uses production-rate thinking aligned with custodial workloading frameworks and industry time-study methods.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
