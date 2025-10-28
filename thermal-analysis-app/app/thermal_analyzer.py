import cv2
import numpy as np
from PIL import Image
import json
from typing import List, Dict, Any, Tuple, Optional
import time
from datetime import datetime
import os
from pathlib import Path

from models import (
    AnalysisResult, BodyRegion, InjuryRisk, ThermalMetrics, 
    BodyRegionType, InjuryRiskLevel
)

class ThermalAnalyzer:
    """
    Advanced thermal image analyzer for football injury risk assessment
    """
    
    def __init__(self):
        self.region_definitions = self._load_region_definitions()
        self.temperature_thresholds = self._load_temperature_thresholds()
        self.injury_risk_thresholds = self._load_injury_risk_thresholds()
        
    def _load_region_definitions(self) -> Dict[str, Dict]:
        """Load predefined body region definitions for football analysis - POSTERIOR VIEW ONLY"""
        return {
            # Posterior (back) regions only - based on your thermal image
            "gluteus_maximus": {
                "name": "Gluteus Maximus",
                "type": BodyRegionType.GLUTEUS_MAXIMUS,
                "description": "Main glute muscle (posterior)",
                "typical_temp_range": (32.0, 36.0),
                "injury_indicators": ["asymmetry", "hot_spots"],
                "view": "posterior"
            },
            "gluteus_medius": {
                "name": "Gluteus Medius", 
                "type": BodyRegionType.GLUTEUS_MEDIUS,
                "description": "Side glute muscle (posterior)",
                "typical_temp_range": (31.5, 35.5),
                "injury_indicators": ["asymmetry", "cold_spots"],
                "view": "posterior"
            },
            "hamstrings": {
                "name": "Hamstrings",
                "type": BodyRegionType.HAMSTRINGS,
                "description": "Back thigh muscles (posterior)",
                "typical_temp_range": (32.0, 36.0),
                "injury_indicators": ["hot_spots", "asymmetry"],
                "view": "posterior"
            },
            "calves": {
                "name": "Calves",
                "type": BodyRegionType.CALVES,
                "description": "Calf muscles (posterior)",
                "typical_temp_range": (31.0, 35.0),
                "injury_indicators": ["hot_spots", "asymmetry"],
                "view": "posterior"
            },
            "back_knee": {
                "name": "Back of Knee",
                "type": BodyRegionType.KNEE_SIDE,
                "description": "Back of knee joint (posterior)",
                "typical_temp_range": (30.0, 34.0),
                "injury_indicators": ["hot_spots", "asymmetry"],
                "view": "posterior"
            },
            "achilles": {
                "name": "Achilles Tendon",
                "type": BodyRegionType.ACHILLES,
                "description": "Achilles tendon area (posterior)",
                "typical_temp_range": (30.0, 34.0),
                "injury_indicators": ["hot_spots", "asymmetry"],
                "view": "posterior"
            },
            "back_ankle": {
                "name": "Back of Ankle",
                "type": BodyRegionType.ANKLE,
                "description": "Back ankle area (posterior)",
                "typical_temp_range": (29.5, 33.5),
                "injury_indicators": ["hot_spots", "asymmetry"],
                "view": "posterior"
            },
            "back_foot": {
                "name": "Back of Foot",
                "type": BodyRegionType.FOOT,
                "description": "Back of foot (posterior)",
                "typical_temp_range": (29.0, 33.0),
                "injury_indicators": ["cold_spots", "asymmetry"],
                "view": "posterior"
            }
        }
    
    def _load_temperature_thresholds(self) -> Dict[str, float]:
        """Load temperature thresholds for different analysis types"""
        return {
            "hot_spot_threshold": 2.0,  # Degrees above average
            "cold_spot_threshold": -2.0,  # Degrees below average
            "asymmetry_threshold": 1.5,  # Degrees difference between sides
            "inflammation_threshold": 3.0,  # Degrees above normal
            "baseline_temp": 33.0,  # Baseline body temperature
            "min_body_temp": 30.0,  # Minimum realistic body temperature
            "max_body_temp": 40.0,  # Maximum realistic body temperature
            "ambient_temp": 20.0,  # Ambient temperature
            "pixel_to_temp_ratio": 0.1  # Conversion factor from pixel intensity to temperature
        }
    
    def _load_injury_risk_thresholds(self) -> Dict[str, Dict]:
        """Load injury risk assessment thresholds"""
        return {
            "low": {"min_diff": 0.0, "max_diff": 1.5, "description": "Normal temperature variation"},
            "moderate": {"min_diff": 1.5, "max_diff": 3.0, "description": "Slight inflammation or overuse"},
            "high": {"min_diff": 3.0, "max_diff": 5.0, "description": "Significant inflammation or strain"},
            "critical": {"min_diff": 5.0, "max_diff": 100.0, "description": "Severe inflammation or injury risk"}
        }
    
    async def analyze_image(self, image_path: str, analysis_type: str = "full") -> AnalysisResult:
        """
        Perform comprehensive thermal analysis on an image
        """
        start_time = time.time()
        
        try:
            # Load and preprocess image
            image = self._load_image(image_path)
            processed_image = self._preprocess_image(image)
            
            # Detect body regions
            regions = self._detect_body_regions(processed_image)
            
            # Calculate thermal metrics
            thermal_metrics = self._calculate_thermal_metrics(processed_image, regions)
            
            # Assess injury risks
            regions_with_risk = self._assess_injury_risks(regions, thermal_metrics)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(regions_with_risk, thermal_metrics)
            
            processing_time = time.time() - start_time
            
            # Create analysis result
            result = AnalysisResult(
                analysis_id=f"analysis_{int(time.time())}",
                original_filename=os.path.basename(image_path),
                image_dimensions={"width": image.shape[1], "height": image.shape[0]},
                analysis_type=analysis_type,
                regions=regions_with_risk,
                thermal_metrics=thermal_metrics,
                total_regions_detected=len(regions_with_risk),
                high_risk_regions=len([r for r in regions_with_risk if r.injury_risk.level in ["high", "critical"]]),
                critical_risk_regions=len([r for r in regions_with_risk if r.injury_risk.level == "critical"]),
                overall_recommendations=recommendations["overall"],
                priority_actions=recommendations["priority"],
                processing_time_seconds=processing_time,
                model_confidence=0.85,  # Placeholder - would be calculated from actual model
                image_quality_score=self._assess_image_quality(image)
            )
            
            return result
            
        except Exception as e:
            raise Exception(f"Analysis failed: {str(e)}")
    
    def _load_image(self, image_path: str) -> np.ndarray:
        """Load image from file path"""
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image from {image_path}")
        return image
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for thermal analysis"""
        # Convert to grayscale for thermal analysis
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply histogram equalization to enhance contrast
        equalized = cv2.equalizeHist(blurred)
        
        return equalized
    
    def _pixel_to_temperature(self, pixel_value: int) -> float:
        """
        Convert pixel intensity to realistic temperature based on thermal color mapping
        FIXED: Now returns realistic human body temperatures (30-40°C)
        """
        # Normalize pixel value to 0-1 range
        normalized = pixel_value / 255.0
        
        # Map to realistic temperature range (30-40°C for human body)
        # Cold colors (blue/purple) = lower temperatures
        # Hot colors (red/white) = higher temperatures
        min_temp = 30.0  # Minimum realistic body temperature
        max_temp = 40.0  # Maximum realistic body temperature
        
        # Simple linear mapping for realistic temperatures
        # Higher pixel values (brighter) = higher temperatures
        temperature = min_temp + (max_temp - min_temp) * normalized
        
        # Ensure temperature is within realistic range
        temperature = max(min_temp, min(max_temp, temperature))
        
        return temperature
    
    def _analyze_thermal_colors(self, image: np.ndarray) -> Dict[str, float]:
        """
        Analyze thermal color distribution to extract temperature information
        """
        # Convert to HSV for better color analysis
        if len(image.shape) == 3:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        else:
            # Convert grayscale to 3-channel for HSV conversion
            image_3ch = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
            hsv = cv2.cvtColor(image_3ch, cv2.COLOR_BGR2HSV)
        
        # Extract color channels
        h, s, v = cv2.split(hsv)
        
        # Analyze color distribution
        # In thermal images:
        # - Blue/Purple = Cold (low temperature)
        # - Green/Yellow = Medium temperature  
        # - Red/White = Hot (high temperature)
        
        # Calculate color-based temperature mapping
        color_temp_map = {}
        
        # Blue regions (cold)
        blue_mask = (h < 120) & (s > 50) & (v > 30)
        if np.any(blue_mask):
            blue_pixels = v[blue_mask]
            color_temp_map['blue_avg'] = self._pixel_to_temperature(np.mean(blue_pixels))
        
        # Green regions (medium)
        green_mask = (h >= 120) & (h < 180) & (s > 50) & (v > 30)
        if np.any(green_mask):
            green_pixels = v[green_mask]
            color_temp_map['green_avg'] = self._pixel_to_temperature(np.mean(green_pixels))
        
        # Red regions (hot)
        red_mask = ((h >= 180) | (h < 20)) & (s > 50) & (v > 30)
        if np.any(red_mask):
            red_pixels = v[red_mask]
            color_temp_map['red_avg'] = self._pixel_to_temperature(np.mean(red_pixels))
        
        # Overall temperature distribution
        all_pixels = v[v > 30]  # Exclude very dark pixels (background)
        if len(all_pixels) > 0:
            color_temp_map['overall_avg'] = self._pixel_to_temperature(np.mean(all_pixels))
            color_temp_map['overall_max'] = self._pixel_to_temperature(np.max(all_pixels))
            color_temp_map['overall_min'] = self._pixel_to_temperature(np.min(all_pixels))
        
        return color_temp_map
    
    def _detect_body_regions(self, image: np.ndarray) -> List[BodyRegion]:
        """Detect and segment body regions using computer vision techniques"""
        regions = []
        
        # For now, we'll use a simplified approach based on the thermal image you provided
        # In a real implementation, this would use advanced AI models like YOLOv8, SAM, or U-Net
        
        height, width = image.shape
        
        # Define approximate regions based on POSTERIOR VIEW anatomy in thermal images
        # Based on your thermal image: glutes at top, hamstrings, calves, back of knees, achilles, back of feet
        region_coords = {
            "gluteus_maximus": [(width//4, height//12), (3*width//4, height//12), 
                               (3*width//4, height//4), (width//4, height//4)],
            "gluteus_medius": [(width//6, height//12), (width//3, height//12),
                              (width//3, height//5), (width//6, height//5)],
            "hamstrings": [(width//4, height//4), (3*width//4, height//4),
                          (3*width//4, height//2), (width//4, height//2)],
            "calves": [(width//4, height//2), (3*width//4, height//2),
                      (3*width//4, 3*height//4), (width//4, 3*height//4)],
            "back_knee": [(width//3, height//2), (2*width//3, height//2),
                         (2*width//3, 3*height//5), (width//3, 3*height//5)],
            "achilles": [(width//3, 3*height//4), (2*width//3, 3*height//4),
                        (2*width//3, 4*height//5), (width//3, 4*height//5)],
            "back_ankle": [(width//3, 4*height//5), (2*width//3, 4*height//5),
                          (2*width//3, 5*height//6), (width//3, 5*height//6)],
            "back_foot": [(width//3, 5*height//6), (2*width//3, 5*height//6),
                         (2*width//3, height), (width//3, height)]
        }
        
        for region_name, coords in region_coords.items():
            if region_name in self.region_definitions:
                region_data = self.region_definitions[region_name]
                
                # Extract region from image
                mask = np.zeros(image.shape, dtype=np.uint8)
                pts = np.array(coords, np.int32)
                cv2.fillPoly(mask, [pts], 255)
                
                region_pixels = image[mask > 0]
                
                if len(region_pixels) > 0:
                    # Convert pixel values to realistic temperatures (30-40°C range)
                    avg_temp = self._pixel_to_temperature(np.mean(region_pixels))
                    max_temp = self._pixel_to_temperature(np.max(region_pixels))
                    min_temp = self._pixel_to_temperature(np.min(region_pixels))
                    
                    # Calculate standard deviation in temperature space
                    temp_values = [self._pixel_to_temperature(p) for p in region_pixels]
                    std_temp = np.std(temp_values)
                    
                    # Debug: Print temperature values to verify they're realistic
                    print(f"Region {region_name}: avg={avg_temp:.1f}°C, max={max_temp:.1f}°C, min={min_temp:.1f}°C")
                    
                    # Create body region
                    region = BodyRegion(
                        name=region_data["name"],
                        region_type=region_data["type"],
                        coordinates=coords,
                        area_pixels=len(region_pixels),
                        average_temperature=float(avg_temp),
                        max_temperature=float(max_temp),
                        min_temperature=float(min_temp),
                        temperature_std=float(std_temp),
                        injury_risk=InjuryRisk(
                            level=InjuryRiskLevel.LOW,
                            temperature_difference=0.0,
                            confidence=0.5,
                            description="Initial assessment",
                            recommendations=[]
                        )
                    )
                    regions.append(region)
        
        return regions
    
    def _calculate_thermal_metrics(self, image: np.ndarray, regions: List[BodyRegion]) -> ThermalMetrics:
        """Calculate overall thermal metrics"""
        all_temps = []
        for region in regions:
            all_temps.append(region.average_temperature)
        
        if not all_temps:
            # Fallback: analyze entire image
            color_analysis = self._analyze_thermal_colors(image)
            all_temps = [color_analysis.get('overall_avg', 33.0)]
        
        # Calculate asymmetry (simplified - would need left/right detection)
        asymmetry_index = 0.0
        if len(regions) >= 2:
            left_regions = [r for r in regions if "left" in r.name.lower()]
            right_regions = [r for r in regions if "right" in r.name.lower()]
            
            if left_regions and right_regions:
                left_avg = np.mean([r.average_temperature for r in left_regions])
                right_avg = np.mean([r.average_temperature for r in right_regions])
                asymmetry_index = abs(left_avg - right_avg)
        
        # Count hot and cold spots based on realistic temperature thresholds
        avg_temp = np.mean(all_temps)
        hot_spots = len([r for r in regions if r.average_temperature > avg_temp + self.temperature_thresholds["hot_spot_threshold"]])
        cold_spots = len([r for r in regions if r.average_temperature < avg_temp + self.temperature_thresholds["cold_spot_threshold"]])
        
        return ThermalMetrics(
            overall_average_temp=float(np.mean(all_temps)),
            overall_max_temp=float(np.max(all_temps)),
            overall_min_temp=float(np.min(all_temps)),
            temperature_range=float(np.max(all_temps) - np.min(all_temps)),
            asymmetry_index=float(asymmetry_index),
            hot_spots_count=hot_spots,
            cold_spots_count=cold_spots
        )
    
    def _assess_injury_risks(self, regions: List[BodyRegion], thermal_metrics: ThermalMetrics) -> List[BodyRegion]:
        """Assess injury risk for each region"""
        regions_with_risk = []
        
        for region in regions:
            # Calculate temperature difference from baseline (realistic body temperature)
            temp_diff = region.average_temperature - self.temperature_thresholds["baseline_temp"]
            
            # Ensure temperature is within realistic range
            if region.average_temperature < self.temperature_thresholds["min_body_temp"]:
                region.average_temperature = self.temperature_thresholds["min_body_temp"]
            elif region.average_temperature > self.temperature_thresholds["max_body_temp"]:
                region.average_temperature = self.temperature_thresholds["max_body_temp"]
            
            # Determine risk level based on realistic temperature differences
            risk_level = InjuryRiskLevel.LOW
            if temp_diff >= self.injury_risk_thresholds["critical"]["min_diff"]:
                risk_level = InjuryRiskLevel.CRITICAL
            elif temp_diff >= self.injury_risk_thresholds["high"]["min_diff"]:
                risk_level = InjuryRiskLevel.HIGH
            elif temp_diff >= self.injury_risk_thresholds["moderate"]["min_diff"]:
                risk_level = InjuryRiskLevel.MODERATE
            
            # Generate recommendations based on risk level
            recommendations = self._get_region_recommendations(region, risk_level, temp_diff)
            
            # Create injury risk assessment
            injury_risk = InjuryRisk(
                level=risk_level,
                temperature_difference=float(temp_diff),
                confidence=0.8,  # Placeholder
                description=self.injury_risk_thresholds[risk_level.value]["description"],
                recommendations=recommendations
            )
            
            # Update region with injury risk
            region.injury_risk = injury_risk
            regions_with_risk.append(region)
        
        return regions_with_risk
    
    def _get_region_recommendations(self, region: BodyRegion, risk_level: InjuryRiskLevel, temp_diff: float) -> List[str]:
        """Generate specific recommendations for a region based on risk level"""
        recommendations = []
        
        if risk_level == InjuryRiskLevel.CRITICAL:
            recommendations.extend([
                "Immediate medical attention required",
                "Avoid high-intensity activities",
                "Apply ice therapy",
                "Consider imaging studies"
            ])
        elif risk_level == InjuryRiskLevel.HIGH:
            recommendations.extend([
                "Reduce training intensity",
                "Focus on recovery protocols",
                "Monitor closely for changes",
                "Consider physiotherapy"
            ])
        elif risk_level == InjuryRiskLevel.MODERATE:
            recommendations.extend([
                "Moderate training load",
                "Increase recovery time",
                "Monitor for progression",
                "Consider preventive measures"
            ])
        else:
            recommendations.extend([
                "Continue normal training",
                "Maintain current protocols",
                "Regular monitoring recommended"
            ])
        
        # Add region-specific recommendations for posterior view
        if "knee" in region.name.lower():
            recommendations.append("Focus on posterior knee stability exercises")
        elif "hamstring" in region.name.lower():
            recommendations.append("Include hamstring flexibility and strengthening work")
        elif "calf" in region.name.lower():
            recommendations.append("Monitor calf muscle tightness and Achilles tendon health")
        elif "glute" in region.name.lower():
            recommendations.append("Focus on glute activation and hip stability")
        elif "achilles" in region.name.lower():
            recommendations.append("Monitor Achilles tendon for signs of strain")
        elif "ankle" in region.name.lower():
            recommendations.append("Check ankle mobility and stability")
        
        return recommendations
    
    def _generate_recommendations(self, regions: List[BodyRegion], thermal_metrics: ThermalMetrics) -> Dict[str, List[str]]:
        """Generate overall recommendations based on analysis"""
        overall = []
        priority = []
        
        # High risk regions
        high_risk_regions = [r for r in regions if r.injury_risk.level in ["high", "critical"]]
        if high_risk_regions:
            priority.append(f"Immediate attention required for {len(high_risk_regions)} high-risk regions")
            overall.append("Consider reducing training intensity")
            overall.append("Implement enhanced recovery protocols")
        
        # Asymmetry concerns
        if thermal_metrics.asymmetry_index > self.temperature_thresholds["asymmetry_threshold"]:
            priority.append("Significant asymmetry detected - investigate further")
            overall.append("Focus on bilateral training exercises")
        
        # Hot spots
        if thermal_metrics.hot_spots_count > 3:
            overall.append("Multiple hot spots detected - monitor for inflammation")
        
        # General recommendations
        if not priority:
            priority.append("Continue current training with regular monitoring")
        
        overall.extend([
            "Regular thermal imaging recommended",
            "Maintain detailed training logs",
            "Monitor for any changes in symptoms"
        ])
        
        return {
            "overall": overall,
            "priority": priority
        }
    
    def _assess_image_quality(self, image: np.ndarray) -> float:
        """Assess the quality of the input image"""
        # Simple quality assessment based on image properties
        height, width = image.shape[:2]
        
        # Check resolution
        resolution_score = min(1.0, (width * height) / (640 * 480))
        
        # Check contrast
        contrast = np.std(image)
        contrast_score = min(1.0, contrast / 50.0)
        
        # Check brightness distribution
        brightness = np.mean(image)
        brightness_score = 1.0 - abs(brightness - 128) / 128.0
        
        # Check for thermal color diversity (important for thermal analysis)
        if len(image.shape) == 3:
            # Color image - check for thermal color range
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            color_diversity = np.std(h) / 180.0  # Normalize hue standard deviation
        else:
            # Grayscale - check for intensity range
            color_diversity = np.std(image) / 255.0
        
        # Overall quality score
        quality_score = (resolution_score + contrast_score + brightness_score + color_diversity) / 4.0
        
        return float(quality_score)
    
    def get_detectable_regions(self) -> List[Dict[str, Any]]:
        """Get list of all detectable body regions"""
        return [
            {
                "name": region_data["name"],
                "type": region_data["type"],
                "description": region_data["description"],
                "typical_temp_range": region_data["typical_temp_range"],
                "injury_indicators": region_data["injury_indicators"]
            }
            for region_data in self.region_definitions.values()
        ]
