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

  // Clutter level - key factor in estimation
  const [clutterLevel, setClutterLevel] = useState<'low' | 'medium' | 'high'>('low');

  // Add-ons
  const [addFridge, setAddFridge] = useState(false);
  const [addOven, setAddOven] = useState(false);

  // Ridge regression model (K-fold CV, trained on Ref1.csv)
  // Model: R² = 0.9598, MAE = 0.229 hours, RMSE = 0.433 hours, Alpha = 0.494
  const ridgeModel = {
    coefficients: {
      intercept: 2.970799,
      sqft: 0.001006,
      bedrooms: 0.570017,
      bathrooms: 0.198949,
      deep_clean: 1.123613,
      fridge: 0.422382,
      oven: 0.664175,
      clutter_high: 0.411362,
      clutter_low: -0.447349,
      clutter_medium: 0.035987
    },
    standardization: {
      means: {
        sqft: 2429,
        bedrooms: 3.647,
        bathrooms: 2.647
      },
      stds: {
        sqft: 1761.318,
        bedrooms: 1.169,
        bathrooms: 1.057
      }
    },
    categories: {
      clutter: ["high", "low", "medium"]
    }
  };

  // Reference data from Ref1.csv - for display purposes
  const referenceData = [
    { name: 'Raj', beds: 4, baths: 3, sqft: 2758, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 3 },
    { name: 'Patrick', beds: 3, baths: 2, sqft: 1554, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 1.75 },
    { name: 'Rida', beds: 6, baths: 5, sqft: 6648, type: 'standard', fridge: false, oven: false, clutter: 'medium', hours: 4 },
    { name: 'Rida', beds: 6, baths: 5, sqft: 6648, type: 'deep', fridge: false, oven: false, clutter: 'medium', hours: 6.2 },
    { name: 'Aj', beds: 2, baths: 2, sqft: 1002, type: 'standard', fridge: false, oven: false, clutter: 'medium', hours: 2 },
    { name: 'Brianna', beds: 3, baths: 2, sqft: 1167, type: 'deep', fridge: true, oven: true, clutter: 'high', hours: 5 },
    { name: 'Anthony', beds: 2, baths: 2, sqft: 1188, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 1.75 },
    { name: 'Trey', beds: 5, baths: 4, sqft: 4214, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 3.5 },
    { name: 'Michael', beds: 4, baths: 3, sqft: 2551, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 3 },
    { name: 'Hany', beds: 4, baths: 2, sqft: 2042, type: 'deep', fridge: true, oven: false, clutter: 'low', hours: 4 },
    { name: 'Leilani', beds: 3, baths: 2, sqft: 1497, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 2 },
    { name: 'Leilani', beds: 3, baths: 2, sqft: 1497, type: 'deep', fridge: true, oven: true, clutter: 'low', hours: 4 },
    { name: 'Sundeep', beds: 4, baths: 2, sqft: 1846, type: 'deep', fridge: true, oven: true, clutter: 'high', hours: 6 },
    { name: 'Patricia', beds: 3, baths: 2, sqft: 1957, type: 'standard', fridge: false, oven: false, clutter: 'medium', hours: 2.5 },
    { name: 'Chitra', beds: 4, baths: 2, sqft: 1777, type: 'standard', fridge: false, oven: false, clutter: 'low', hours: 2.5 },
    { name: 'Celeste', beds: 3, baths: 2, sqft: 1260, type: 'deep', fridge: true, oven: true, clutter: 'medium', hours: 5.2 },
    { name: 'Kathy', beds: 3, baths: 3, sqft: 1687, type: 'deep', fridge: false, oven: false, clutter: 'medium', hours: 3.75 },
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
    const standardHours = estimateCleaningTime(
      beds,
      baths,
      sqft,
      false,  // isDeepClean = false
      addFridge,
      addOven,
      clutterLevel
    );

    // Calculate deep clean hours using regression model
    const deepHours = estimateCleaningTime(
      beds,
      baths,
      sqft,
      true,  // isDeepClean = true
      addFridge,
      addOven,
      clutterLevel
    );

    const hourlyRate = 80; // This is the total service rate, not per cleaner

    // Model predicts actual clock hours (time on site with 2 cleaners)
    // No need to divide - the training data is already in clock hours
    setStandardHours(standardHours);
    setDeepCleanHours(deepHours);

    // Price is based on clock hours × hourly rate
    // If cleaners are there 4 hours at $80/hr = $320
    setStandardCleanPrice(standardHours * hourlyRate);
    setDeepCleanPrice(deepHours * hourlyRate);
  };

  const reset = () => {
    setBedrooms('');
    setBathrooms('');
    setSqFeet('');
    setDeepCleanPrice(null);
    setStandardCleanPrice(null);
    setStandardHours(null);
    setDeepCleanHours(null);
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
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-300 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Deep Clean Price
                </h2>
                <p className="text-4xl font-bold text-purple-700">
                  ${deepCleanPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Estimated time: {deepCleanHours?.toFixed(2)} hours
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Standard Clean Price
                </h2>
                <p className="text-4xl font-bold text-blue-700">
                  ${standardCleanPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Estimated time: {standardHours?.toFixed(2)} hours
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                <p className="text-xs text-gray-600 text-center">
                  $80/hour service rate (2 cleaners) | Times shown are clock hours (actual time on site) | Deep cleans include ceiling fans
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Reference Data from Ref1.csv (17 properties)
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
              <strong>Algorithm:</strong> Ridge regression (L2-regularized) with K-fold cross-validation for optimal regularization strength (α = 0.494). Trained on 17 actual cleaning jobs with proper feature standardization. Predicts labor-hours from square footage, bedrooms, bathrooms, deep-clean flag, clutter level, and fridge/oven tasks. Model performance: R² = 0.9598 (96% variance explained), MAE = 0.229 hours, RMSE = 0.433 hours. This approach uses production-rate thinking aligned with custodial workloading frameworks and industry time-study methods.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
