import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from PIL import Image

from app.database.session import get_db
from app.services.recommendation_service import compute_center_recommendations

router = APIRouter(prefix="/accident-repair", tags=["Accident Repair"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def classify_preliminary_damage(image_path: str, damage_area: str, description: str) -> str:
    """
    Preliminary damage classification module.
    Analyzes image properties and customer description.
    Clearly labeled as preliminary decision support.
    """
    desc_lower = description.lower() if description else ""
    if any(k in desc_lower for k in ["chassis", "airbag", "frame", "rollover", "totaled", "heavy collision"]):
        return "Major Damage"
    if any(k in desc_lower for k in ["dent", "scratch", "bumper", "mirror", "fender", "minor"]):
        return "Minor Damage"

    # Analyze image file size & properties
    try:
        with Image.open(image_path) as img:
            w, h = img.size
            # Example heuristic check on image variation
            file_size_kb = os.path.getsize(image_path) / 1024.0
            if file_size_kb > 800 or "structural" in damage_area.lower():
                return "Major Damage"
            elif file_size_kb > 250 or "panel" in damage_area.lower():
                return "Moderate Damage"
            else:
                return "Minor Damage"
    except Exception:
        return "Moderate Damage"

@router.post("/preliminary-assessment")
async def analyze_accident_damage(
    damage_area: str = Form(...),
    description: str = Form(""),
    vehicle_type: str = Form("Sedan"),
    required_completion_time: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    saved_filename = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are supported.")

        unique_id = str(uuid.uuid4())[:8]
        saved_filename = f"damage_{unique_id}{ext}"
        target_path = os.path.join(UPLOAD_DIR, saved_filename)

        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024: # 10 MB limit
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")

        with open(target_path, "wb") as f:
            f.write(contents)

        preliminary_category = classify_preliminary_damage(target_path, damage_area, description)
    else:
        preliminary_category = "Moderate Damage" if "Major" not in damage_area else "Major Damage"

    # Map damage category to service type
    service_type = "Major Accident Repair" if preliminary_category == "Major Damage" else "Minor Accident Repair"

    # Find service centers capable of accidental repair
    recommendations = compute_center_recommendations(
        db=db,
        service_type=service_type,
        vehicle_type=vehicle_type,
        required_completion_time_str=required_completion_time
    )

    disclaimer = (
        "AI assessment is preliminary. Final inspection and repair quotation "
        "must be performed by authorized service personnel. This assessment does NOT guarantee "
        "insurance approval or final repair turnaround."
    )

    return {
        "success": True,
        "preliminary_category": preliminary_category,
        "damage_area": damage_area,
        "service_type_assigned": service_type,
        "disclaimer": disclaimer,
        "image_uploaded": saved_filename is not None,
        "recommendations": recommendations
    }
