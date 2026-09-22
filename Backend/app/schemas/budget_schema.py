from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class RoadCorridorItem(BaseModel):
    id: str
    road_name: str
    ward: str
    zone: str
    road_type: str # ARTERIAL, INDUSTRIAL, COMMERCIAL, RESIDENTIAL, TRANSIT
    length_km: float
    defect_count: int
    severity: str # CRITICAL, HIGH, MEDIUM, LOW
    
    # 4 Core Prioritization Criteria (1.0 to 10.0 scale)
    traffic_density_score: float = Field(..., ge=1.0, le=10.0, description="Traffic volume / PCU score")
    accident_risk_score: float = Field(..., ge=1.0, le=10.0, description="Accident blackspot rating")
    public_complaints_score: float = Field(..., ge=1.0, le=10.0, description="Citizen grievances & duplicate reports")
    economic_importance_score: float = Field(..., ge=1.0, le=10.0, description="Economic/Commercial/Healthcare connectivity")
    
    # Raw Metrics for transparency
    average_daily_traffic: int
    accident_count_3yr: int
    complaint_count: int
    economic_tags: List[str]
    
    # Financials & Execution
    repair_type: str # OVERHAUL, RESURFACING, MILLING_PATCH, CRACK_SEAL
    estimated_cost_inr: float
    coordinates: List[List[float]] # [lat, lng] path points for map
    
    # Calculated / Optimization Outputs
    composite_priority_score: Optional[float] = None
    cost_benefit_ratio: Optional[float] = None
    funding_status: Optional[str] = "PENDING" # FUNDED, DEFERRED, MONITORED
    allocation_rank: Optional[int] = None
    justification: Optional[str] = None

class BudgetOptimizationRequest(BaseModel):
    total_baseline_budget_inr: float = Field(15000000.0, description="Total baseline budget before cut (e.g. 1.50 Crore)")
    reduction_percentage: float = Field(40.0, ge=0.0, le=90.0, description="Budget cut percentage (Default: 40%)")
    weight_traffic: float = Field(0.30, ge=0.0, le=1.0, description="Traffic density weight (30%)")
    weight_accident: float = Field(0.25, ge=0.0, le=1.0, description="Accident blackspot weight (25%)")
    weight_complaints: float = Field(0.25, ge=0.0, le=1.0, description="Public complaints weight (25%)")
    weight_economic: float = Field(0.20, ge=0.0, le=1.0, description="Economic importance weight (20%)")

class BenchmarkCard(BaseModel):
    title: str
    strategy: str
    roads_funded: int
    roads_deferred: int
    budget_utilized_inr: float
    citizens_impacted_daily: int
    accident_blackspots_covered: int
    total_blackspots: int
    infrastructure_quality_index: float # 0 to 100%
    economic_corridors_saved: int
    key_vulnerabilities: List[str]

class BudgetOptimizationResponse(BaseModel):
    baseline_budget_inr: float
    reduced_budget_inr: float
    budget_cut_amount_inr: float
    reduction_percentage: float
    
    allocated_budget_inr: float
    remaining_contingency_inr: float
    budget_utilization_pct: float
    
    total_roads_analyzed: int
    funded_roads_count: int
    deferred_roads_count: int
    
    quality_preservation_index: float # Quality retained vs 100% budget
    citizens_served_daily: int
    accident_blackspots_mitigated_pct: float
    
    funded_corridors: List[RoadCorridorItem]
    deferred_corridors: List[RoadCorridorItem]
    
    benchmark_comparison: Dict[str, BenchmarkCard]
