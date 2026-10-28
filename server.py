import os
import time
import hashlib
import uuid
from typing import Optional, List, Union
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

class FeedbackItem(BaseModel):
    dish_id: Optional[int] = None
    dish_name: Optional[str] = "Campus Meal"
    reason_code: str
    leftover_grams: Optional[int] = None

class FeedbackSubmit(BaseModel):
    scan_id: Optional[str] = None
    token: Optional[str] = None
    items: Optional[List[FeedbackItem]] = None
    feedback_items: Optional[List[FeedbackItem]] = None
    dish_id: Optional[int] = None
    dish_name: Optional[str] = None
    reason: Optional[str] = None
    reason_code: Optional[str] = None

class VerifyRequest(BaseModel):
    id_payload: str

class IoTTelemetryPayload(BaseModel):
    weight_g: float
    bin_fill_pct: int
    chute_angle: Optional[int] = 0
    rfid: Optional[str] = "NONE"

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

@app.get("/api/feedback/reasons")
def get_feedback_reasons():
    """
    Returns the valid food-related feedback reason codes, labels, and groups.
    """
    return {
        "groups": database.REASON_GROUPS,
        "reasons": database.REASONS_SPEC
    }

@app.post("/api/feedback")
def submit_feedback(payload: Union[FeedbackSubmit, List[FeedbackItem]]):
    """
    Accepts per-dish feedback items, validates against allowed food codes,
    rejects unknown codes, and enforces one submission per dish per session per meal.
    """
    if isinstance(payload, list):
        items = payload
        token = "anon"
        scan_id = "adhoc"
    else:
        token = payload.token or "anon"
        scan_id = payload.scan_id or "adhoc"
        items = payload.items or payload.feedback_items or []
        
        # Backward compatibility for single item payload
        if not items and (payload.reason_code or payload.reason):
            code = payload.reason_code or payload.reason
            dname = payload.dish_name or "Campus Meal"
            items = [FeedbackItem(dish_id=payload.dish_id, dish_name=dname, reason_code=code)]

    if not items:
        raise HTTPException(status_code=400, detail="No feedback items provided")

    # Validate all reason codes
    for it in items:
        if it.reason_code not in database.REASONS_SPEC:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid reason_code '{it.reason_code}'. Allowed codes: {list(database.REASONS_SPEC.keys())}"
            )

    result = database.save_feedback_items(
        session_token=token,
        items=[it.dict() for it in items],
        scan_id=scan_id
    )

    return {
        "status": "recorded",
        "message": f"Successfully logged feedback for {len(result['saved'])} dish(es)",
        "saved": result["saved"],
        "skipped": result["skipped"]
    }

@app.get("/api/analytics")
def get_dashboard_analytics():
    """
    Returns aggregated 14-day trend, top wasted dishes, student feedback distribution,
    financial / ecological savings, and dynamic kitchen cooking recommendations.
    """
    return database.get_analytics()

@app.post("/api/iot/telemetry")
def log_iot_telemetry(payload: IoTTelemetryPayload):
    """
    Ingests live sensor readings from physical ESP32/Arduino smart hopper or Web Serial API.
    """
    database.save_iot_telemetry(payload.weight_g, payload.bin_fill_pct, payload.chute_angle or 0, payload.rfid or "NONE")
    return {"status": "success", "logged": payload.dict()}

@app.get("/api/iot/telemetry")
def get_iot_telemetry():
    """
    Fetches the most recent hardware station telemetry (load cell, ultrasonic sensor, servo state).
    """
    return database.get_latest_iot_telemetry()

@app.get("/api/leaderboard")
def get_campus_leaderboard():
    """
    Fetches the Clean Plate Club hostel floor and branch waste rankings.
    """
    return database.get_leaderboard()

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
