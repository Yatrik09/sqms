import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SQMS — AI-Powered Smart Queue Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sqms-super-secure-dev-secret-key-automotive-ai-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days for demo ease
    
    # Database: absolute path to project root sqms.db so CWD doesn't affect location
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'sqms.db')).replace('\\', '/')}"
    )
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # ML Artifacts path
    ML_ARTIFACTS_DIR: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "artifacts")
    )
    DATASET_PATH: str = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "synthetic_service_records.csv")
    )
    
    # Configurable Recommendation Weights
    WEIGHT_SERVICE_COMPATIBILITY: float = 0.25
    WEIGHT_COMPLETION_FEASIBILITY: float = 0.25
    WEIGHT_WAITING_EFFICIENCY: float = 0.20
    WEIGHT_CAPACITY_AVAILABILITY: float = 0.15
    WEIGHT_DISTANCE: float = 0.15
    
    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_Tq6SAlGGsM97wS")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "Kpc1V74SFbEstKPAL5bk2X6a")

    # SMTP Email Settings (Optional - if empty, safe local development OTP simulation is used)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@sqms.local")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
