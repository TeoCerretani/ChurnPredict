from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import os
import shap
from schemas import UserFeatures, PredictionResponse

app = FastAPI(title="Churn Prediction API")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "model.pkl"
model_data = None
explainer = None

@app.on_event("startup")
def load_model():
    global model_data, explainer
    if os.path.exists(MODEL_PATH):
        model_data = joblib.load(MODEL_PATH)
        explainer = shap.TreeExplainer(model_data['model'])
    else:
        print(f"Warning: Model not found at {MODEL_PATH}. Make sure to run the ML pipeline first.")

@app.get("/")
def read_root():
    return {"message": "Welcome to Churn Prediction API"}

@app.post("/predict", response_model=PredictionResponse)
def predict_churn(features: UserFeatures):
    if model_data is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Train the model first.")
        
    model = model_data['model']
    feature_names = model_data['features']
    
    # Convert input to DataFrame matching training format
    input_dict = features.dict()
    # Create DataFrame with a single row
    input_df = pd.DataFrame([input_dict])
    
    if "minutes_listened" in input_df.columns:
        input_df["hours listened"] = input_df["minutes_listened"] / 60.0
        
    # Ensure columns match the exact order of training
    print("DEBUG feature_names:", feature_names)
    print("DEBUG input_df columns:", input_df.columns.tolist())
    try:
        input_df = input_df[feature_names]
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing feature expected by model: {str(e)}")
        
    # Make prediction
    prediction = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]
    
    # Calculate SHAP values
    explanations = []
    if explainer is not None:
        try:
            shap_values_raw = explainer.shap_values(input_df)
            if isinstance(shap_values_raw, list):
                sv = shap_values_raw[1][0]
            elif len(shap_values_raw.shape) == 3: # Some shap versions return 3D array
                sv = shap_values_raw[0, :, 1]
            else:
                sv = shap_values_raw[0]
                
            for i, feature_name in enumerate(feature_names):
                explanations.append({
                    "feature": feature_name,
                    "value": float(input_df.iloc[0][feature_name]),
                    "impact": float(sv[i])
                })
        except Exception as e:
            print(f"SHAP error: {e}")
    
    # Probabilities usually are [P(class=0), P(class=1)]
    churn_prob = float(probabilities[1])
    is_churn = bool(prediction == 1)
    
    verdict = "Alta probabilità di abbandono" if is_churn else "Bassa probabilità di abbandono"
    
    return PredictionResponse(
        churn_prediction=is_churn,
        confidence=churn_prob,
        verdict=verdict,
        explanations=explanations
    )
