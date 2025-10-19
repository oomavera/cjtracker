'use client';

import { useState } from 'react';

export default function MatrixPage() {
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [sqFeet, setSqFeet] = useState('');
  const [initialPrice, setInitialPrice] = useState<number | null>(null);
  const [recurringPrice, setRecurringPrice] = useState<number | null>(null);
  const [estimatedHours, setEstimatedHours] = useState<number | null>(null);

  // Training data from your examples
  const trainingData = [
    { beds: 5, baths: 4, sqft: 4214, recurringHours: 4, initialHours: 6 },
    { beds: 3, baths: 2, sqft: 1497, recurringHours: 2 },
    { beds: 3, baths: 2, sqft: 1957, recurringHours: 2.5 },
    { beds: 4, baths: 3, sqft: 2551, recurringHours: 3 },
    { beds: 3, baths: 2, sqft: 1167, recurringHours: 2.5, initialHours: 5 },
    { beds: 2, baths: 2, sqft: 1188, recurringHours: 1.75 },
    { beds: 5, baths: 3, sqft: 2833, recurringHours: 3 },
    { beds: 3, baths: 2, sqft: 1328, recurringHours: 3, initialHours: 5 },
    { beds: 4, baths: 3, sqft: 1879, recurringHours: 3 },
    { beds: 4, baths: 2, sqft: 1846, recurringHours: 3, initialHours: 6 },
  ];

  const estimateCleaningTime = (beds: number, baths: number, sqft: number): number => {
    // Weighted calculation based on all factors
    // Square footage is the primary driver, with beds and baths as modifiers

    // Base calculation: ~0.0012 hours per sqft (derived from data)
    let hours = sqft * 0.0012;

    // Add time for bedrooms (each bedroom adds complexity)
    hours += beds * 0.3;

    // Add time for bathrooms (bathrooms are time-intensive)
    hours += baths * 0.4;

    // Find closest match in training data for refinement
    let closestMatch = trainingData[0];
    let minDistance = Infinity;

    for (const data of trainingData) {
      const distance =
        Math.abs(data.beds - beds) * 0.5 +
        Math.abs(data.baths - baths) * 0.5 +
        Math.abs(data.sqft - sqft) / 1000;

      if (distance < minDistance) {
        minDistance = distance;
        closestMatch = data;
      }
    }

    // Adjust based on closest match
    const ratio = sqft / closestMatch.sqft;
    hours = closestMatch.recurringHours * ratio;

    // Fine-tune based on bedroom/bathroom differences
    const bedDiff = beds - closestMatch.beds;
    const bathDiff = baths - closestMatch.baths;
    hours += bedDiff * 0.25 + bathDiff * 0.3;

    // Round to nearest 0.25 hour
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

    const recurringHours = estimateCleaningTime(beds, baths, sqft);
    const initialHours = recurringHours + 1.75; // Average of 1.5-2 hours longer

    const hourlyRate = 70;

    setEstimatedHours(recurringHours);
    setRecurringPrice(recurringHours * hourlyRate);
    setInitialPrice(initialHours * hourlyRate);
  };

  const reset = () => {
    setBedrooms('');
    setBathrooms('');
    setSqFeet('');
    setInitialPrice(null);
    setRecurringPrice(null);
    setEstimatedHours(null);
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

          {initialPrice !== null && recurringPrice !== null && (
            <div className="mt-8 space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Initial Clean Price
                </h2>
                <p className="text-4xl font-bold text-green-700">
                  ${initialPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Estimated time: {estimatedHours ? (estimatedHours + 1.75).toFixed(2) : 0} hours
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Recurring Clean Price
                </h2>
                <p className="text-4xl font-bold text-blue-700">
                  ${recurringPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Estimated time: {estimatedHours?.toFixed(2)} hours
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                <p className="text-xs text-gray-600 text-center">
                  Hourly rate: $70/hour | Initial cleans take approximately 1.5-2 hours longer
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Reference Data
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• 5 bed, 4 bath, 4,214 sqft = 4hrs recurring, 6hrs initial</p>
            <p>• 3 bed, 2 bath, 1,497 sqft = 2hrs recurring</p>
            <p>• 3 bed, 2 bath, 1,957 sqft = 2.5hrs recurring</p>
            <p>• 4 bed, 3 bath, 2,551 sqft = 3hrs recurring</p>
            <p>• 3 bed, 2 bath, 1,167 sqft = 2.5hrs recurring, 5hrs initial</p>
            <p>• 2 bed, 2 bath, 1,188 sqft = 1.75hrs recurring</p>
            <p>• 5 bed, 3 bath, 2,833 sqft = 3hrs recurring</p>
            <p>• 3 bed, 2 bath, 1,328 sqft = 3hrs recurring, 5hrs initial</p>
            <p>• 4 bed, 3 bath, 1,879 sqft = 3hrs recurring</p>
            <p>• 4 bed, 2 bath, 1,846 sqft = 3hrs recurring, 6hrs initial</p>
          </div>
        </div>
      </div>
    </div>
  );
}
