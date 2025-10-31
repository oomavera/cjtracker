#!/usr/bin/env python3
"""
Train a Ridge regression model on Ref1.csv to predict cleaning labor hours.
Exports model coefficients to JSON for use in the Next.js frontend.
"""

import numpy as np
import pandas as pd
import json
from sklearn.model_selection import KFold, cross_val_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import RidgeCV

# 1) Load and prepare data
df = pd.read_csv("ReferenceData/Ref1.csv")

# Clean column names
df.columns = df.columns.str.strip()

# Parse data
df['sqft'] = df['Square feet'].str.replace(',', '').astype(float)
df['bedrooms'] = df['Bedrooms'].astype(int)
df['bathrooms'] = df['Bathrooms'].astype(float)
df['labor_hours'] = df['Hours'].astype(float)

# Convert Type of clean to binary (1 = deep, 0 = standard)
df['deep_clean'] = df['Type of clean'].str.lower().str.contains('deep').astype(int)

# Convert yes/no to 1/0
df['fridge'] = (df['Fridge'].str.lower() == 'yes').astype(int)
df['oven'] = (df['Oven'].str.lower() == 'yes').astype(int)

# Standardize clutter level
df['clutter'] = df['Clutter Level'].str.lower().str.strip()

# 2) Features and target
y = df["labor_hours"]
X = df[['sqft', 'bedrooms', 'bathrooms', 'deep_clean', 'fridge', 'oven', 'clutter']]

numeric = ["sqft", "bedrooms", "bathrooms"]
binary = ["deep_clean", "fridge", "oven"]
categorical = ["clutter"]

# 3) Build preprocessing pipeline
pre = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), numeric),
        ("bin", "passthrough", binary),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical),
    ],
    remainder="drop"
)

# 4) Ridge regression with cross-validation
alphas = np.logspace(-3, 3, 50)
model = Pipeline([
    ("pre", pre),
    ("reg", RidgeCV(alphas=alphas, store_cv_values=False))
])

# 5) Cross-validation
k = min(5, len(df)) if len(df) > 2 else 2
cv = KFold(n_splits=k, shuffle=True, random_state=42)
mae_scores = -cross_val_score(model, X, y, cv=cv, scoring="neg_mean_absolute_error")
mae = mae_scores.mean()
r2_scores = cross_val_score(model, X, y, cv=cv, scoring="r2")
r2 = r2_scores.mean()

print(f"Cross-validated MAE: {mae:.2f} hours")
print(f"Cross-validated R²: {r2:.3f}")

# 6) Fit final model on all data
model.fit(X, y)

# Get feature names after transformation
num_scaler = model.named_steps['pre'].named_transformers_['num']
cat_encoder = model.named_steps['pre'].named_transformers_['cat']

num_means = num_scaler.mean_.tolist()
num_stds = num_scaler.scale_.tolist()
clutter_categories = cat_encoder.categories_[0].tolist()

# Get coefficients
ridge_model = model.named_steps['reg']
coefficients = ridge_model.coef_.tolist()
intercept = float(ridge_model.intercept_)
best_alpha = float(ridge_model.alpha_)

print(f"\nBest alpha: {best_alpha:.4f}")
print(f"Intercept: {intercept:.4f}")

# 7) Export model parameters to JSON
model_params = {
    "intercept": intercept,
    "alpha": best_alpha,
    "numeric_features": {
        "names": numeric,
        "means": num_means,
        "stds": num_stds
    },
    "binary_features": binary,
    "categorical_features": {
        "clutter": {
            "categories": clutter_categories,
            "reference": clutter_categories[0]  # First category is reference (dropped)
        }
    },
    "coefficients": coefficients,
    "feature_order": numeric + binary + clutter_categories[1:],  # Skip reference category
    "metrics": {
        "cv_mae": float(mae),
        "cv_r2": float(r2),
        "n_samples": len(df)
    }
}

# Save to JSON
with open('scripts/cleaning_model.json', 'w') as f:
    json.dump(model_params, f, indent=2)

print(f"\nModel exported to scripts/cleaning_model.json")

# 8) Test predictions on a few examples
print("\n=== Test Predictions ===")
for idx in [0, 6, 10]:
    row = X.iloc[[idx]]
    actual = y.iloc[idx]
    pred = model.predict(row)[0]
    print(f"{df.iloc[idx]['Name']}: Predicted {pred:.2f}h, Actual {actual:.2f}h (Error: {abs(pred-actual):.2f}h)")

# 9) Bootstrap prediction interval function (for documentation)
print("\n=== Bootstrap Prediction Interval Example ===")
def bootstrap_pi(X, y, new_row, B=2000, quantiles=(0.025, 0.975), random_state=42):
    rng = np.random.default_rng(random_state)
    preds = []
    X_arr = X.reset_index(drop=True)
    y_arr = y.reset_index(drop=True)
    n = len(X_arr)
    for _ in range(B):
        idx = rng.integers(0, n, n)
        Xb, yb = X_arr.iloc[idx], y_arr.iloc[idx]
        m = Pipeline([
            ("pre", pre),
            ("reg", RidgeCV(alphas=alphas))
        ])
        m.fit(Xb, yb)
        preds.append(m.predict(new_row)[0])
    lo, hi = np.quantile(preds, quantiles)
    return float(lo), float(hi)

# Test on a new job
new_job = pd.DataFrame([{
    "sqft": 2390, "bedrooms": 4, "bathrooms": 2,
    "deep_clean": 1, "clutter": "medium",
    "fridge": 0, "oven": 0
}])

point_pred = model.predict(new_job)[0]
lo, hi = bootstrap_pi(X, y, new_job, B=1000)

print(f"New job (4bed, 2bath, 2390sqft, deep, medium clutter):")
print(f"  Point estimate: {point_pred:.2f} hours")
print(f"  95% PI: [{lo:.2f}, {hi:.2f}] hours")
