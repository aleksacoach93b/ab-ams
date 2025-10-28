from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class InjuryRiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class BodyRegionType(str, Enum):
    # Lower body regions for football analysis
    GLUTEUS_MAXIMUS = "gluteus_maximus"
    GLUTEUS_MEDIUS = "gluteus_medius"
    QUADRICEPS = "quadriceps"
    HAMSTRINGS = "hamstrings"
    CALVES = "calves"
    KNEE_CAP = "knee_cap"
    KNEE_SIDE = "knee_side"
    ANKLE = "ankle"
    ACHILLES = "achilles"
    SHIN = "shin"
    FOOT = "foot"
    THIGH_FRONT = "thigh_front"
    THIGH_BACK = "thigh_back"
    THIGH_INNER = "thigh_inner"
    THIGH_OUTER = "thigh_outer"
    CALF_INNER = "calf_inner"
    CALF_OUTER = "calf_outer"
    HIP_JOINT = "hip_joint"
    KNEE_JOINT = "knee_joint"
    ANKLE_JOINT = "ankle_joint"

class InjuryRisk(BaseModel):
    level: InjuryRiskLevel
    temperature_difference: float = Field(..., description="Temperature difference from baseline in Celsius")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score for the risk assessment")
    description: str = Field(..., description="Human-readable description of the risk")
    recommendations: List[str] = Field(default_factory=list, description="Recommended actions")

class BodyRegion(BaseModel):
    name: str = Field(..., description="Name of the body region")
    region_type: BodyRegionType = Field(..., description="Type of body region")
    coordinates: List[List[int]] = Field(..., description="Polygon coordinates defining the region")
    area_pixels: int = Field(..., description="Area of the region in pixels")
    average_temperature: float = Field(..., description="Average temperature in the region")
    max_temperature: float = Field(..., description="Maximum temperature in the region")
    min_temperature: float = Field(..., description="Minimum temperature in the region")
    temperature_std: float = Field(..., description="Standard deviation of temperature")
    injury_risk: InjuryRisk = Field(..., description="Injury risk assessment for this region")
    asymmetry_score: Optional[float] = Field(None, description="Asymmetry score compared to opposite side")
    muscle_activation: Optional[float] = Field(None, description="Estimated muscle activation level")

class ThermalMetrics(BaseModel):
    overall_average_temp: float = Field(..., description="Overall average temperature")
    overall_max_temp: float = Field(..., description="Overall maximum temperature")
    overall_min_temp: float = Field(..., description="Overall minimum temperature")
    temperature_range: float = Field(..., description="Temperature range (max - min)")
    asymmetry_index: float = Field(..., description="Overall asymmetry index")
    hot_spots_count: int = Field(..., description="Number of hot spots detected")
    cold_spots_count: int = Field(..., description="Number of cold spots detected")

class AnalysisResult(BaseModel):
    analysis_id: str = Field(..., description="Unique identifier for this analysis")
    timestamp: datetime = Field(default_factory=datetime.now, description="When the analysis was performed")
    original_filename: str = Field(..., description="Original filename of the uploaded image")
    image_dimensions: Dict[str, int] = Field(..., description="Width and height of the image")
    analysis_type: str = Field(..., description="Type of analysis performed")
    
    # Analysis results
    regions: List[BodyRegion] = Field(..., description="List of detected body regions")
    thermal_metrics: ThermalMetrics = Field(..., description="Overall thermal metrics")
    
    # Summary statistics
    total_regions_detected: int = Field(..., description="Total number of regions detected")
    high_risk_regions: int = Field(..., description="Number of regions with high injury risk")
    critical_risk_regions: int = Field(..., description="Number of regions with critical injury risk")
    
    # Recommendations
    overall_recommendations: List[str] = Field(default_factory=list, description="Overall recommendations")
    priority_actions: List[str] = Field(default_factory=list, description="Priority actions to take")
    
    # Technical details
    processing_time_seconds: float = Field(..., description="Time taken to process the image")
    model_confidence: float = Field(..., ge=0, le=1, description="Overall confidence of the analysis")
    image_quality_score: float = Field(..., ge=0, le=1, description="Quality score of the input image")

class AnalysisRequest(BaseModel):
    analysis_type: str = Field(default="full", description="Type of analysis to perform")
    include_recommendations: bool = Field(default=True, description="Whether to include recommendations")
    sensitivity_level: str = Field(default="medium", description="Sensitivity level for injury detection")

class ComparisonRequest(BaseModel):
    analysis_ids: List[str] = Field(..., min_items=2, description="List of analysis IDs to compare")
    comparison_type: str = Field(default="temporal", description="Type of comparison to perform")

class ComparisonResult(BaseModel):
    comparison_id: str = Field(..., description="Unique identifier for this comparison")
    timestamp: datetime = Field(default_factory=datetime.now, description="When the comparison was performed")
    compared_analyses: List[str] = Field(..., description="List of analysis IDs that were compared")
    comparison_type: str = Field(..., description="Type of comparison performed")
    
    # Comparison results
    temperature_changes: Dict[str, float] = Field(..., description="Temperature changes by region")
    risk_changes: Dict[str, str] = Field(..., description="Risk level changes by region")
    improvement_areas: List[str] = Field(..., description="Areas showing improvement")
    concern_areas: List[str] = Field(..., description="Areas of concern")
    
    # Summary
    overall_trend: str = Field(..., description="Overall trend (improving, stable, declining)")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations based on comparison")
