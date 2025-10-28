from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
import os
from typing import Generator

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./thermal_analysis.db")

# Create engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class
Base = declarative_base()

class AnalysisRecord(Base):
    """Database model for storing analysis results"""
    __tablename__ = "analysis_records"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String, unique=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    original_filename = Column(String)
    image_dimensions = Column(JSON)
    analysis_type = Column(String)
    
    # Analysis results
    regions_data = Column(JSON)
    thermal_metrics = Column(JSON)
    
    # Summary statistics
    total_regions_detected = Column(Integer)
    high_risk_regions = Column(Integer)
    critical_risk_regions = Column(Integer)
    
    # Recommendations
    overall_recommendations = Column(JSON)
    priority_actions = Column(JSON)
    
    # Technical details
    processing_time_seconds = Column(Float)
    model_confidence = Column(Float)
    image_quality_score = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PlayerProfile(Base):
    """Database model for storing player profiles"""
    __tablename__ = "player_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, unique=True, index=True)
    name = Column(String)
    position = Column(String)
    team = Column(String)
    
    # Physical characteristics
    height = Column(Float)
    weight = Column(Float)
    age = Column(Integer)
    
    # Medical history
    injury_history = Column(JSON)
    baseline_temperatures = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ComparisonRecord(Base):
    """Database model for storing comparison results"""
    __tablename__ = "comparison_records"
    
    id = Column(Integer, primary_key=True, index=True)
    comparison_id = Column(String, unique=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Comparison details
    compared_analyses = Column(JSON)
    comparison_type = Column(String)
    
    # Results
    temperature_changes = Column(JSON)
    risk_changes = Column(JSON)
    improvement_areas = Column(JSON)
    concern_areas = Column(JSON)
    
    # Summary
    overall_trend = Column(String)
    recommendations = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

def get_db() -> Generator[Session, None, None]:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)

def save_analysis_result(analysis_result: dict) -> str:
    """Save analysis result to database"""
    db = SessionLocal()
    try:
        # Create analysis record
        record = AnalysisRecord(
            analysis_id=analysis_result["analysis_id"],
            original_filename=analysis_result["original_filename"],
            image_dimensions=analysis_result["image_dimensions"],
            analysis_type=analysis_result["analysis_type"],
            regions_data=analysis_result["regions"],
            thermal_metrics=analysis_result["thermal_metrics"],
            total_regions_detected=analysis_result["total_regions_detected"],
            high_risk_regions=analysis_result["high_risk_regions"],
            critical_risk_regions=analysis_result["critical_risk_regions"],
            overall_recommendations=analysis_result["overall_recommendations"],
            priority_actions=analysis_result["priority_actions"],
            processing_time_seconds=analysis_result["processing_time_seconds"],
            model_confidence=analysis_result["model_confidence"],
            image_quality_score=analysis_result["image_quality_score"]
        )
        
        db.add(record)
        db.commit()
        db.refresh(record)
        
        return record.analysis_id
        
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def get_analysis_by_id(analysis_id: str) -> dict:
    """Get analysis result by ID"""
    db = SessionLocal()
    try:
        record = db.query(AnalysisRecord).filter(AnalysisRecord.analysis_id == analysis_id).first()
        if not record:
            return None
        
        return {
            "analysis_id": record.analysis_id,
            "timestamp": record.timestamp,
            "original_filename": record.original_filename,
            "image_dimensions": record.image_dimensions,
            "analysis_type": record.analysis_type,
            "regions": record.regions_data,
            "thermal_metrics": record.thermal_metrics,
            "total_regions_detected": record.total_regions_detected,
            "high_risk_regions": record.high_risk_regions,
            "critical_risk_regions": record.critical_risk_regions,
            "overall_recommendations": record.overall_recommendations,
            "priority_actions": record.priority_actions,
            "processing_time_seconds": record.processing_time_seconds,
            "model_confidence": record.model_confidence,
            "image_quality_score": record.image_quality_score
        }
        
    except Exception as e:
        raise e
    finally:
        db.close()

def get_analysis_history(limit: int = 50) -> list:
    """Get analysis history"""
    db = SessionLocal()
    try:
        records = db.query(AnalysisRecord).order_by(AnalysisRecord.timestamp.desc()).limit(limit).all()
        
        history = []
        for record in records:
            history.append({
                "analysis_id": record.analysis_id,
                "timestamp": record.timestamp,
                "original_filename": record.original_filename,
                "total_regions_detected": record.total_regions_detected,
                "high_risk_regions": record.high_risk_regions,
                "critical_risk_regions": record.critical_risk_regions,
                "model_confidence": record.model_confidence,
                "image_quality_score": record.image_quality_score
            })
        
        return history
        
    except Exception as e:
        raise e
    finally:
        db.close()

def create_player_profile(player_data: dict) -> str:
    """Create a new player profile"""
    db = SessionLocal()
    try:
        profile = PlayerProfile(
            player_id=player_data["player_id"],
            name=player_data["name"],
            position=player_data.get("position"),
            team=player_data.get("team"),
            height=player_data.get("height"),
            weight=player_data.get("weight"),
            age=player_data.get("age"),
            injury_history=player_data.get("injury_history", []),
            baseline_temperatures=player_data.get("baseline_temperatures", {})
        )
        
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        return profile.player_id
        
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def get_player_profile(player_id: str) -> dict:
    """Get player profile by ID"""
    db = SessionLocal()
    try:
        profile = db.query(PlayerProfile).filter(PlayerProfile.player_id == player_id).first()
        if not profile:
            return None
        
        return {
            "player_id": profile.player_id,
            "name": profile.name,
            "position": profile.position,
            "team": profile.team,
            "height": profile.height,
            "weight": profile.weight,
            "age": profile.age,
            "injury_history": profile.injury_history,
            "baseline_temperatures": profile.baseline_temperatures,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        }
        
    except Exception as e:
        raise e
    finally:
        db.close()
