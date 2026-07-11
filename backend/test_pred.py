import joblib
import pandas as pd
from schemas import UserFeatures

MODEL_PATH = "model.pkl"
model_data = joblib.load(MODEL_PATH)
feature_names = model_data['features']
print("Model features:", feature_names)

f = UserFeatures(nextsong=1,thumbs_up=1,thumbs_down=1,add_to_playlist=1,roll_advert=1,minutes_listened=120.0,skip_rate=0.5)
input_dict = f.dict()
input_df = pd.DataFrame([input_dict])
print("DF columns before:", input_df.columns.tolist())

if "minutes_listened" in input_df.columns:
    input_df["hours listened"] = input_df["minutes_listened"] / 60.0

print("DF columns after:", input_df.columns.tolist())

try:
    input_df = input_df[feature_names]
    print("Success! Input DF columns:", input_df.columns.tolist())
except Exception as e:
    print("Error:", str(e))
