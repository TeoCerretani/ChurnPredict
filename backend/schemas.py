from pydantic import BaseModel, Field

class UserFeatures(BaseModel):
    nextsong: int = Field(..., ge=0, description="Number of songs listened")
    thumbs_up: int = Field(..., ge=0, description="Number of times user gave a thumbs up")
    thumbs_down: int = Field(..., ge=0, description="Number of times user gave a thumbs down")
    add_to_playlist: int = Field(..., ge=0, description="Number of times user added a song to a playlist")
    roll_advert: int = Field(..., ge=0, description="Number of times user got an advert")
    minutes_listened: float = Field(..., ge=0.0, description="Total minutes listened")
    skip_rate: float = Field(..., ge=0.0, le=1.0, description="Rate of skipped songs")

class FeatureExplanation(BaseModel):
    feature: str
    value: float
    impact: float

class PredictionResponse(BaseModel):
    churn_prediction: bool
    confidence: float
    verdict: str
    explanations: list[FeatureExplanation] = []
