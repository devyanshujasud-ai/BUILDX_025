import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.services.budget_service import budget_service
from app.schemas.budget_schema import BudgetOptimizationRequest

class TestSmartBudgetOptimization(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_corridors_list(self):
        """Verify road corridors endpoint returns expected list of corridors."""
        response = self.client.get("/api/budget/corridors")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 14)
        first = data[0]
        self.assertIn("road_name", first)
        self.assertIn("traffic_density_score", first)
        self.assertIn("accident_risk_score", first)
        self.assertIn("public_complaints_score", first)
        self.assertIn("economic_importance_score", first)
        self.assertIn("estimated_cost_inr", first)

    def test_40_percent_budget_cut_challenge(self):
        """
        Verify that 40% budget reduction is strictly satisfied and
        prioritizes high-ROI corridors.
        """
        req = BudgetOptimizationRequest(
            total_baseline_budget_inr=15000000.0, # 1.50 Crore
            reduction_percentage=40.0, # 40% reduction -> 90 Lakhs limit
            weight_traffic=0.30,
            weight_accident=0.25,
            weight_complaints=0.25,
            weight_economic=0.20
        )
        response = self.client.post("/api/budget/optimize", json=req.model_dump())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Reduced budget should be 90 Lakhs
        self.assertEqual(data["baseline_budget_inr"], 15000000.0)
        self.assertEqual(data["reduced_budget_inr"], 9000000.0)
        self.assertEqual(data["reduction_percentage"], 40.0)
        
        # Allocated budget must NEVER exceed 90 Lakhs
        self.assertLessEqual(data["allocated_budget_inr"], 9000000.0)
        self.assertGreater(data["allocated_budget_inr"], 8000000.0) # High utilization
        
        # High quality retention despite 40% budget reduction
        self.assertGreaterEqual(data["quality_preservation_index"], 60.0)
        self.assertGreaterEqual(data["accident_blackspots_mitigated_pct"], 60.0)
        
        # Benchmarking comparison should be present
        self.assertIn("naive_fcfs", data["benchmark_comparison"])
        self.assertIn("smart_ai_optimization", data["benchmark_comparison"])
        smart_card = data["benchmark_comparison"]["smart_ai_optimization"]
        fcfs_card = data["benchmark_comparison"]["naive_fcfs"]
        
        # Smart AI should match or outperform Naive FCFS on citizens served and quality
        self.assertGreaterEqual(smart_card["citizens_impacted_daily"], fcfs_card["citizens_impacted_daily"])
        self.assertGreaterEqual(smart_card["infrastructure_quality_index"], fcfs_card["infrastructure_quality_index"])

    def test_summary_endpoint(self):
        """Verify the quick summary endpoint returns valid challenge data."""
        response = self.client.get("/api/budget/summary?reduction_pct=40.0")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["reduction_percentage"], 40.0)
        self.assertGreater(len(data["funded_corridors"]), 0)
        self.assertGreater(len(data["deferred_corridors"]), 0)

if __name__ == "__main__":
    unittest.main()
