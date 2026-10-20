import os
import sys

# Ensure project root is in sys.path for ml imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.session import engine, Base
from app.api.websockets import ws_manager
from ml.prediction.predictor import predictor

# Import routers
from app.api.auth import router as auth_router
from app.api.customers import router as customers_router
from app.api.service_centers import router as service_centers_router
from app.api.bookings import router as bookings_router
from app.api.queue import router as queue_router
from app.api.predictions import router as predictions_router
from app.api.recommendations import router as recommendations_router
from app.api.accident_repair import router as accident_repair_router
from app.api.analytics import router as analytics_router
from app.api.ml_management import router as ml_management_router
from app.api.notifications import router as notifications_router
from app.api.audit_logs import router as audit_logs_router
from app.api.demo_controls import router as demo_controls_router
from app.api.subscriptions import router as subscriptions_router
from app.api.payments import router as payments_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for SQMS — AI-Powered Smart Queue Management and Waiting Time Prediction System"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for accident images
upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Include Routers under API prefix
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(customers_router, prefix=settings.API_V1_STR)
app.include_router(service_centers_router, prefix=settings.API_V1_STR)
app.include_router(bookings_router, prefix=settings.API_V1_STR)
app.include_router(queue_router, prefix=settings.API_V1_STR)
app.include_router(predictions_router, prefix=settings.API_V1_STR)
app.include_router(recommendations_router, prefix=settings.API_V1_STR)
app.include_router(accident_repair_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(ml_management_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(audit_logs_router, prefix=settings.API_V1_STR)
app.include_router(demo_controls_router, prefix=settings.API_V1_STR)
app.include_router(subscriptions_router, prefix=settings.API_V1_STR)
app.include_router(payments_router, prefix=settings.API_V1_STR)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive & listen for client ping
            data = await websocket.receive_text()
            # Echo heartbeat or handle client actions if needed
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "system": "SQMS — AI-Powered Smart Queue Management System",
        "status": "Online",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "system": "SQMS",
        "version": settings.VERSION
    }

from app.database.init_db import init_db

@app.on_event("startup")
def on_startup():
    init_db()
    predictor.load_models()
    print("SQMS Backend initialized successfully.")
