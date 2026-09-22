from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.schemas.budget_schema import (
    RoadCorridorItem,
    BudgetOptimizationRequest,
    BudgetOptimizationResponse
)
from app.services.budget_service import budget_service

router = APIRouter(prefix="/api/budget", tags=["Smart Budget Optimization"])

@router.get("/corridors", response_model=List[Dict[str, Any]])
def get_all_road_corridors():
    """Retrieve full database of Nagpur primary road corridors and current defect metrics."""
    return budget_service.get_corridors()

@router.post("/optimize", response_model=BudgetOptimizationResponse)
def optimize_road_budget(req: BudgetOptimizationRequest):
    """
    Run multi-criteria Knapsack optimization under budget reduction (e.g. 40% reduction).
    Intelligently balances Traffic Density, Accident Blackspots, Complaints, and Economic Importance.
    """
    return budget_service.optimize_budget(req)

@router.get("/summary", response_model=BudgetOptimizationResponse)
def get_default_challenge_summary(
    reduction_pct: float = Query(40.0, ge=0.0, le=90.0, description="Reduction percentage (default: 40%)")
):
    """
    Pre-configured endpoint for the Smart Maintenance Challenge scenario (40% budget reduction).
    """
    default_req = BudgetOptimizationRequest(
        total_baseline_budget_inr=15000000.0, # 1.50 Crore
        reduction_percentage=reduction_pct,
        weight_traffic=0.30,
        weight_accident=0.25,
        weight_complaints=0.25,
        weight_economic=0.20
    )
    return budget_service.optimize_budget(default_req)
