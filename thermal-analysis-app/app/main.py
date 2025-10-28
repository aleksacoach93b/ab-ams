from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn
import os
from pathlib import Path
import shutil
from typing import List, Dict, Any
import json
from datetime import datetime

from thermal_analyzer import ThermalAnalyzer
from models import AnalysisResult, BodyRegion, InjuryRisk
from database import get_db, init_db

app = FastAPI(title="Thermal Analysis API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories
UPLOAD_DIR = Path("uploads")
RESULTS_DIR = Path("results")
UPLOAD_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize thermal analyzer
thermal_analyzer = ThermalAnalyzer()

@app.on_event("startup")
async def startup_event():
    """Initialize database and models on startup"""
    init_db()

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main web interface"""
    with open("static/index.html", "r") as f:
        return HTMLResponse(content=f.read())

@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_thermal_image(
    file: UploadFile = File(...),
    analysis_type: str = "full"
):
    """
    Analyze thermal image and return detailed results
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Save uploaded file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Perform thermal analysis
        result = await thermal_analyzer.analyze_image(
            str(file_path), 
            analysis_type=analysis_type
        )
        
        # Save results
        result_filename = f"{timestamp}_analysis.json"
        result_path = RESULTS_DIR / result_filename
        
        with open(result_path, "w") as f:
            json.dump(result.model_dump(), f, indent=2, default=str)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/regions")
async def get_body_regions():
    """Get list of all detectable body regions"""
    return {
        "regions": thermal_analyzer.get_detectable_regions(),
        "total_count": len(thermal_analyzer.get_detectable_regions())
    }

@app.get("/api/injury-risk-levels")
async def get_injury_risk_levels():
    """Get injury risk level definitions"""
    return {
        "levels": {
            "low": {"min_temp_diff": 0, "max_temp_diff": 1.5, "description": "Normal temperature variation"},
            "moderate": {"min_temp_diff": 1.5, "max_temp_diff": 3.0, "description": "Slight inflammation or overuse"},
            "high": {"min_temp_diff": 3.0, "max_temp_diff": 5.0, "description": "Significant inflammation or strain"},
            "critical": {"min_temp_diff": 5.0, "max_temp_diff": 100, "description": "Severe inflammation or injury risk"}
        }
    }

@app.get("/api/analysis-history")
async def get_analysis_history():
    """Get list of previous analyses"""
    try:
        history = []
        for result_file in RESULTS_DIR.glob("*_analysis.json"):
            with open(result_file, "r") as f:
                data = json.load(f)
                history.append({
                    "id": result_file.stem,
                    "timestamp": data.get("timestamp"),
                    "filename": data.get("original_filename"),
                    "total_regions": len(data.get("regions", [])),
                    "injury_risks": len([r for r in data.get("regions", []) if r.get("injury_risk", {}).get("level") != "low"])
                })
        
        return {"history": sorted(history, key=lambda x: x["timestamp"], reverse=True)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")

@app.get("/api/analysis/{analysis_id}")
async def get_analysis_details(analysis_id: str):
    """Get detailed analysis results by ID"""
    try:
        result_path = RESULTS_DIR / f"{analysis_id}.json"
        if not result_path.exists():
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        with open(result_path, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analysis: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
