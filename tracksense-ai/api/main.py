"""
TRACKSENSE AI - FastAPI Backend
Real-time track condition analysis API
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import torch
from PIL import Image
import io
from datetime import datetime
import uuid
import os
import sys
from pathlib import Path

# Add parent directory to path to import model
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from train_classifier import SurfaceConditionModel
from torchvision import transforms

# Windows defaults stdout/stderr to cp1252, which crashes on the ✓/✗ banner
# chars when output is redirected. Force UTF-8 so the API never dies printing.
for _stream in (sys.stdout, sys.stderr):
    if _stream is not None and hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

# ============================================================================
# INITIALIZE FASTAPI
# ============================================================================

app = FastAPI(
    title="TrackSense AI API",
    version="1.0.0",
    description="Real-time track condition intelligence system"
)

# Enable CORS (allow requests from frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# LOAD MODEL
# ============================================================================

# Paths resolve relative to THIS file, so the API works no matter what
# working directory it is launched from.
BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent  # .../tracksense-ai
CHECKPOINT_DIR = BASE_DIR / "checkpoints"

MODEL_PATH = CHECKPOINT_DIR / "best_model.ckpt"
if not MODEL_PATH.exists():
    # Fall back to the most recent checkpoint if best_model.ckpt is missing.
    candidates = sorted(CHECKPOINT_DIR.glob("*.ckpt"), key=lambda p: p.stat().st_mtime, reverse=True)
    if candidates:
        MODEL_PATH = candidates[0]
MODEL_PATH = str(MODEL_PATH)

print("\n" + "="*70)
print("TRACKSENSE AI - STARTING API")
print("="*70 + "\n")

if not os.path.exists(MODEL_PATH):
    print(f"✗ ERROR: Model not found at {MODEL_PATH}")
    print("Please train the model first:")
    print("  python scripts/train_classifier.py")
    model = None
    model_loaded = False
else:
    print(f"Loading model from {MODEL_PATH}...")
    try:
        model = SurfaceConditionModel.load_from_checkpoint(MODEL_PATH)
        model.eval()
        print("✓ Model loaded successfully!")
        model_loaded = True
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        model = None
        model_loaded = False

# ============================================================================
# DATA MODELS
# ============================================================================

class AnalysisResult(BaseModel):
    """Response for image analysis"""
    session_id: str
    frame_id: int
    condition: str
    confidence: float
    probabilities: dict
    timestamp: str

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    version: str

class SessionInfo(BaseModel):
    """Session information"""
    session_id: str
    created_at: str
    analysis_count: int

# ============================================================================
# SESSION STORAGE (In-memory for demo)
# ============================================================================

sessions = {}

class Session:
    def __init__(self):
        self.id = str(uuid.uuid4())
        self.analyses = []
        self.created_at = datetime.now()

# ============================================================================
# IMAGE TRANSFORM
# ============================================================================

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health():
    """
    Health check endpoint
    
    Returns:
    - status: API status (ONLINE/OFFLINE)
    - model_loaded: Whether model is loaded
    - version: API version
    """
    return {
        "status": "ONLINE",
        "model_loaded": model_loaded,
        "version": "1.0.0"
    }

@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_frame(
    file: UploadFile = File(...),
    session_id: Optional[str] = None
):
    """
    Analyze a track image
    
    Parameters:
    - file: Image file (JPG, PNG, etc)
    - session_id: Optional session ID to group analyses
    
    Returns:
    - condition: DRY | DAMP | WET
    - confidence: Confidence percentage (0-100)
    - probabilities: Breakdown of all classes
    - session_id: Session identifier
    - frame_id: Frame number in session
    - timestamp: Analysis timestamp
    """
    
    # Check if model is loaded
    if model is None or not model_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please train first: python scripts/train_classifier.py"
        )
    
    try:
        # Create or retrieve session
        if not session_id:
            session = Session()
            session_id = session.id
            sessions[session_id] = session
        elif session_id not in sessions:
            session = Session()
            session.id = session_id
            sessions[session_id] = session
        else:
            session = sessions[session_id]
        
        # Read uploaded image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Transform image
        image_tensor = transform(image).unsqueeze(0)
        
        # Predict
        with torch.no_grad():
            logits = model(image_tensor)
            probs = torch.softmax(logits, dim=1)
            confidence, pred_idx = torch.max(probs, 1)
        
        # Map prediction to class names
        classes = ['DRY', 'DAMP', 'WET']
        condition = classes[pred_idx.item()]
        confidence_pct = confidence.item() * 100
        
        # Create result
        result = {
            'session_id': session_id,
            'frame_id': len(session.analyses) + 1,
            'condition': condition,
            'confidence': confidence_pct,
            'probabilities': {
                'DRY': float(probs[0, 0].item()) * 100,
                'DAMP': float(probs[0, 1].item()) * 100,
                'WET': float(probs[0, 2].item()) * 100,
            },
            'timestamp': datetime.now().isoformat()
        }
        
        # Store in session
        session.analyses.append(result)
        
        print(f"✓ Analyzed frame {result['frame_id']}: {condition} ({confidence_pct:.1f}%)")
        
        return AnalysisResult(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"✗ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """
    Get all analyses for a session
    
    Parameters:
    - session_id: Session identifier
    
    Returns:
    - Session information and all analyses
    """
    
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    return {
        'session_id': session_id,
        'created_at': session.created_at.isoformat(),
        'analysis_count': len(session.analyses),
        'analyses': session.analyses
    }

@app.get("/api/sessions")
async def list_sessions():
    """List all active sessions"""
    return {
        'session_count': len(sessions),
        'sessions': [
            {
                'session_id': session_id,
                'analysis_count': len(session.analyses),
                'created_at': session.created_at.isoformat()
            }
            for session_id, session in sessions.items()
        ]
    }

# ============================================================================
# SERVE BUILT FRONTEND (if present) SO ONE SERVER RUNS THE WHOLE APP
# ============================================================================

FRONTEND_DIST = next(
    (p for p in [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "weather-whiplash-radar", "dist")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "weather-whiplash-radar", "dist")),
    ] if os.path.isdir(p)),
    None,
)

if FRONTEND_DIST and os.path.isdir(os.path.join(FRONTEND_DIST, "client")):
    FRONTEND_DIST = os.path.join(FRONTEND_DIST, "client")

if FRONTEND_DIST:
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")),
        name="assets",
    )

    @app.get("/", include_in_schema=False)
    async def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_fallback(full_path: str):
        index_path = os.path.join(FRONTEND_DIST, "index.html")
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(index_path)

    print(f"Serving frontend from {FRONTEND_DIST}")

# ============================================================================
# STARTUP MESSAGE
# ============================================================================

@app.on_event("startup")
async def startup():
    print("\n" + "="*70)
    print("✓ API READY")
    print("="*70)
    print(f"\nAPI running at: http://127.0.0.1:8000")
    print(f"Documentation: http://127.0.0.1:8000/docs")
    print(f"Model loaded: {model_loaded}")
    print("\nEndpoints:")
    print("  GET  /health              - Health check")
    print("  POST /api/analyze         - Analyze image")
    print("  GET  /api/session/{id}    - Get session results")
    print("  GET  /api/sessions        - List all sessions")
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
        reload=False  # Auto-reload on code changes
    )

    