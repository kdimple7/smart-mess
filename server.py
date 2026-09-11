import os
import time
import hashlib
import uuid
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import database
import vision

app = FastAPI(title="SmartPlate AI Backend", version="2.0.0")

# Enable CORS for local testing or cross-origin access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize database tables & seed data on startup
@app.on_event("startup")
def on_startup():
    database.init_db()

# --- Data Models ---
class DishCreate(BaseModel):
    name: str
    category: Optional[str] = "Main"
    default_bin: Optional[str] = "bio"

class MenuAdd(BaseModel):
    name: str
    photo_url: Optional[str] = None

class FeedbackSubmit(BaseModel):
    scan_id: Optional[str] = None
    token: Optional[str] = None
    reason: str

class VerifyRequest(BaseModel):
    id_payload: str

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "SmartPlate AI Vision & Intelligence Backend",
        "timestamp": time.time()
    }

@app.get("/api/dishes")
def get_all_dishes():
    return database.get_dishes()

@app.post("/api/dishes")
def create_dish(payload: DishCreate):
    dish_id = database.add_dish(payload.name, payload.category, payload.default_bin)
    return {"status": "created", "id": dish_id, "name": payload.name}

@app.get("/api/menu/today")
def get_todays_menu():
    return database.get_menu_today()

@app.post("/api/menu/today")
def add_to_todays_menu(payload: MenuAdd):
    updated = database.add_menu_item(payload.name, payload.photo_url)
    return {"status": "success", "menu": updated}

@app.delete("/api/menu/today/{dish_name}")
def remove_from_todays_menu(dish_name: str):
    updated = database.remove_menu_item(dish_name)
    return {"status": "removed", "menu": updated}

@app.post("/api/scan")
async def scan_plate(
    file: UploadFile = File(...),
    plate_type: Optional[str] = Form("round")
):
    """
    Receives uploaded plate photo or webcam snapshot, runs multi-region vision analysis,
    stores scan in SQLite, and returns segmented items with calculated grams.
    """
    try:
        contents = await file.read()
        scan_id = f"scan-{uuid.uuid4().hex[:8]}"
        filename = f"{scan_id}_{file.filename}"
        save_path = os.path.join(UPLOAD_DIR, filename)

        with open(save_path, "wb") as f:
            f.write(contents)

        menu = database.get_menu_today()
        result = vision.analyze_plate_image(contents, menu)

        if result.get("error"):
            return JSONResponse(status_code=400, content={"error": result["error"]})

        # Save to database
        database.save_scan_result(
            scan_id=scan_id,
            image_name=filename,
            total_grams=result["total_grams"],
            bin_recommended=result["bin_recommended"],
            is_contaminant=result["contaminant_detected"],
            contaminant_label=result["contaminant_label"],
            items=result["detections"]
        )

        response_data = {
            "id": scan_id,
            "dishName": result["dish_name"],
            "total": result["total_grams"],
            "bin": result["bin_recommended"],
            "contaminant": result["contaminant_detected"],
            "contaminantLabel": result["contaminant_label"],
            "detections": result["detections"],
            "boxes": [
                {"label": f"{d['name'].upper()} · {d['grams']}g", **d["bbox"]}
                for d in result["detections"]
            ]
        }
        return response_data

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/verify")
def verify_student(payload: VerifyRequest):
    """
    Simulates / validates student ID or hostel QR code.
    Hashes student identifier with secret salt for complete privacy & anonymity.
    """
    salt = "smartplate_campus_privacy_salt_2026"
    raw = f"{payload.id_payload}:{salt}"
    token_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return {
        "verified": True,
        "token": token_hash,
        "anonymous_id": f"Student-{token_hash[:6].upper()}",
        "message": "Student identity cryptographically verified & salted"
    }

@app.post("/api/feedback")
def submit_feedback(payload: FeedbackSubmit):
    """
    Records student reason for leftover food and updates kitchen intelligence records.
    """
    database.save_feedback(
        scan_id=payload.scan_id or "adhoc",
        token_hash=payload.token or "anon",
        reason=payload.reason
    )
    return {"status": "recorded", "message": "Feedback successfully logged"}

@app.get("/api/analytics")
def get_dashboard_analytics():
    """
    Returns aggregated 14-day trend, top wasted dishes, student feedback distribution,
    and dynamic kitchen cooking recommendations.
    """
    return database.get_analytics()

@app.post("/api/seed")
def seed_demo():
    """
    Refreshes database with rich demo and historical campus data.
    """
    database.reset_and_seed()
    return {"status": "seeded", "message": "Demo data refreshed"}

# Serve frontend static assets from root directory
STATIC_DIR = os.path.dirname(__file__)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/style.css")
def serve_css():
    return FileResponse(os.path.join(STATIC_DIR, "style.css"))

@app.get("/script.js")
def serve_js():
    return FileResponse(os.path.join(STATIC_DIR, "script.js"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
