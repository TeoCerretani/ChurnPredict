import pandas as pd
import joblib
from train import load_and_preprocess_data
import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_path = os.path.join(base_dir, 'mini_sparkify_event_data.json')
model_path = os.path.join(base_dir, 'backend', 'model.pkl')

df = load_and_preprocess_data(data_path)
model_data = joblib.load(model_path)
model = model_data['model']
features = model_data['features']

X = df[features]
probs = model.predict_proba(X)[:, 1]
df['churn_prob'] = probs

print("--- ALTO RISCHIO CHURN (> 80%) ---")
print(df[df['churn_prob'] >= 0.8].sort_values('churn_prob', ascending=False)[['userId', 'churn_prob'] + features].head(3).to_string())

print("\n--- MEDIO RISCHIO CHURN (50% - 70%) ---")
print(df[(df['churn_prob'] >= 0.5) & (df['churn_prob'] <= 0.7)].sort_values('churn_prob', ascending=False)[['userId', 'churn_prob'] + features].head(3).to_string())

print("\n--- BASSO RISCHIO CHURN (< 20%) ---")
print(df[df['churn_prob'] <= 0.2].sort_values('churn_prob', ascending=True)[['userId', 'churn_prob'] + features].head(3).to_string())
