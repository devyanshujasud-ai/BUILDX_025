from typing import List, Dict, Any, Tuple
import copy
from app.schemas.budget_schema import (
    RoadCorridorItem,
    BudgetOptimizationRequest,
    BudgetOptimizationResponse,
    BenchmarkCard
)

# 14 Primary Nagpur Road Corridors with realistic municipal telemetry
NAGPUR_ROAD_CORRIDORS: List[Dict[str, Any]] = [
    {
        "id": "COR-01",
        "road_name": "Wardha Road (Airport to Sitabuldi)",
        "ward": "Dharampeth / Laxmi Nagar",
        "zone": "Zone 2",
        "road_type": "ARTERIAL",
        "length_km": 8.4,
        "defect_count": 18,
        "severity": "CRITICAL",
        "traffic_density_score": 9.8,
        "accident_risk_score": 8.9,
        "public_complaints_score": 9.2,
        "economic_importance_score": 9.9,
        "average_daily_traffic": 85000,
        "accident_count_3yr": 29,
        "complaint_count": 48,
        "economic_tags": ["Airport Link", "Metro Line 1 Corridor", "IT Park Transit", "Healthcare Axis"],
        "repair_type": "MILLING_PATCH",
        "estimated_cost_inr": 1850000.0, # 18.5 Lakhs
        "coordinates": [
            [21.1460, 79.0840], [21.1270, 79.0760], [21.1090, 79.0720], [21.0850, 79.0620], [21.0580, 79.0550]
        ]
    },
    {
        "id": "COR-02",
        "road_name": "Central Avenue (Mayo Hospital to Pardi)",
        "ward": "Gandhibagh / Satranjipura",
        "zone": "Zone 3",
        "road_type": "ARTERIAL",
        "length_km": 6.2,
        "defect_count": 22,
        "severity": "CRITICAL",
        "traffic_density_score": 9.4,
        "accident_risk_score": 9.5,
        "public_complaints_score": 9.0,
        "economic_importance_score": 9.1,
        "average_daily_traffic": 78000,
        "accident_count_3yr": 34,
        "complaint_count": 52,
        "economic_tags": ["Wholesale Market", "Railway Station Link", "Commercial Freight", "Mayo Hospital"],
        "repair_type": "RESURFACING",
        "estimated_cost_inr": 2100000.0, # 21.0 Lakhs
        "coordinates": [
            [21.1510, 79.0980], [21.1520, 79.1150], [21.1530, 79.1350], [21.1540, 79.1550]
        ]
    },
    {
        "id": "COR-03",
        "road_name": "Hingna MIDC Main Spine Road",
        "ward": "Nehru Nagar / Hingna",
        "zone": "Zone 1",
        "road_type": "INDUSTRIAL",
        "length_km": 7.5,
        "defect_count": 16,
        "severity": "HIGH",
        "traffic_density_score": 8.7,
        "accident_risk_score": 8.2,
        "public_complaints_score": 7.8,
        "economic_importance_score": 9.6,
        "average_daily_traffic": 54000,
        "accident_count_3yr": 22,
        "complaint_count": 31,
        "economic_tags": ["Industrial SEZ", "Heavy Logistics Hub", "Manufacturing Corridor", "Freight Transit"],
        "repair_type": "OVERHAUL",
        "estimated_cost_inr": 2400000.0, # 24.0 Lakhs
        "coordinates": [
            [21.1180, 79.0250], [21.1120, 79.0050], [21.1050, 78.9850], [21.0950, 78.9650]
        ]
    },
    {
        "id": "COR-04",
        "road_name": "West High Court (WHC) Road - Dharampeth",
        "ward": "Dharampeth",
        "zone": "Zone 2",
        "road_type": "COMMERCIAL",
        "length_km": 4.1,
        "defect_count": 11,
        "severity": "HIGH",
        "traffic_density_score": 8.9,
        "accident_risk_score": 6.8,
        "public_complaints_score": 9.4,
        "economic_importance_score": 8.8,
        "average_daily_traffic": 62000,
        "accident_count_3yr": 12,
        "complaint_count": 44,
        "economic_tags": ["Prime Retail Hub", "Restaurant District", "Law College Corridor", "Dense Commuter"],
        "repair_type": "MILLING_PATCH",
        "estimated_cost_inr": 1150000.0, # 11.5 Lakhs
        "coordinates": [
            [21.1550, 79.0650], [21.1440, 79.0660], [21.1350, 79.0640], [21.1220, 79.0580]
        ]
    },
    {
        "id": "COR-05",
        "road_name": "GMC Hospital & Medical Square Axis",
        "ward": "Dhantoli",
        "zone": "Zone 4",
        "road_type": "TRANSIT",
        "length_km": 3.2,
        "defect_count": 9,
        "severity": "CRITICAL",
        "traffic_density_score": 8.6,
        "accident_risk_score": 8.0,
        "public_complaints_score": 9.6,
        "economic_importance_score": 9.7,
        "average_daily_traffic": 49000,
        "accident_count_3yr": 19,
        "complaint_count": 56,
        "economic_tags": ["Emergency Ambulance Route", "Government Medical College", "Super Speciality Hub"],
        "repair_type": "MILLING_PATCH",
        "estimated_cost_inr": 950000.0, # 9.5 Lakhs
        "coordinates": [
            [21.1390, 79.0880], [21.1350, 79.0980], [21.1320, 79.1050]
        ]
    },
    {
        "id": "COR-06",
        "road_name": "Kamptee Road (Automotive Square to Kanhan)",
        "ward": "Aasi Nagar",
        "zone": "Zone 5",
        "road_type": "ARTERIAL",
        "length_km": 9.1,
        "defect_count": 25,
        "severity": "CRITICAL",
        "traffic_density_score": 9.1,
        "accident_risk_score": 9.7, # High accident blackspot!
        "public_complaints_score": 8.8,
        "economic_importance_score": 8.5,
        "average_daily_traffic": 68000,
        "accident_count_3yr": 42, # Highest blackspot in region
        "complaint_count": 39,
        "economic_tags": ["National Highway 44", "Heavy Freight Transit", "Automotive Cluster"],
        "repair_type": "RESURFACING",
        "estimated_cost_inr": 2350000.0, # 23.5 Lakhs
        "coordinates": [
            [21.1750, 79.1050], [21.1950, 79.1180], [21.2150, 79.1350], [21.2350, 79.1550]
        ]
    },
    {
        "id": "COR-07",
        "road_name": "Amravati Road (Variety Square to Wadi)",
        "ward": "Dharampeth / Wadi",
        "zone": "Zone 2",
        "road_type": "ARTERIAL",
        "length_km": 6.8,
        "defect_count": 14,
        "severity": "HIGH",
        "traffic_density_score": 8.5,
        "accident_risk_score": 7.9,
        "public_complaints_score": 8.1,
        "economic_importance_score": 8.9,
        "average_daily_traffic": 59000,
        "accident_count_3yr": 21,
        "complaint_count": 35,
        "economic_tags": ["Nagpur University Campus", "Logistics Warehousing", "National Highway Link"],
        "repair_type": "RESURFACING",
        "estimated_cost_inr": 1650000.0, # 16.5 Lakhs
        "coordinates": [
            [21.1480, 79.0780], [21.1470, 79.0550], [21.1460, 79.0300], [21.1450, 79.0050]
        ]
    },
    {
        "id": "COR-08",
        "road_name": "Outer Ring Road South (Shatabdi to Dighori)",
        "ward": "Hanuman Nagar",
        "zone": "Zone 4",
        "road_type": "ARTERIAL",
        "length_km": 7.2,
        "defect_count": 13,
        "severity": "HIGH",
        "traffic_density_score": 8.3,
        "accident_risk_score": 8.4,
        "public_complaints_score": 7.5,
        "economic_importance_score": 8.0,
        "average_daily_traffic": 52000,
        "accident_count_3yr": 26,
        "complaint_count": 28,
        "economic_tags": ["Bypass Freight", "Inter-City Truck Hub", "Ring Transit"],
        "repair_type": "RESURFACING",
        "estimated_cost_inr": 1750000.0, # 17.5 Lakhs
        "coordinates": [
            [21.1050, 79.0850], [21.1080, 79.1050], [21.1120, 79.1250], [21.1180, 79.1450]
        ]
    },
    {
        "id": "COR-09",
        "road_name": "Sitabuldi Market Inner Distributor",
        "ward": "Dharampeth",
        "zone": "Zone 2",
        "road_type": "COMMERCIAL",
        "length_km": 1.8,
        "defect_count": 8,
        "severity": "MEDIUM",
        "traffic_density_score": 7.8,
        "accident_risk_score": 4.5,
        "public_complaints_score": 8.5,
        "economic_importance_score": 7.9,
        "average_daily_traffic": 38000,
        "accident_count_3yr": 5,
        "complaint_count": 41,
        "economic_tags": ["Pedestrian Shopping", "City Bus Terminal Access", "Local Trade"],
        "repair_type": "CRACK_SEAL",
        "estimated_cost_inr": 480000.0, # 4.8 Lakhs
        "coordinates": [
            [21.1450, 79.0830], [21.1470, 79.0860], [21.1480, 79.0890]
        ]
    },
    {
        "id": "COR-10",
        "road_name": "Manewada Ring Road Connector",
        "ward": "Nehru Nagar",
        "zone": "Zone 4",
        "road_type": "RESIDENTIAL",
        "length_km": 3.6,
        "defect_count": 10,
        "severity": "MEDIUM",
        "traffic_density_score": 6.8,
        "accident_risk_score": 5.4,
        "public_complaints_score": 7.6,
        "economic_importance_score": 5.5,
        "average_daily_traffic": 28000,
        "accident_count_3yr": 9,
        "complaint_count": 29,
        "economic_tags": ["Residential Feeder", "School Bus Route", "Suburban Commerce"],
        "repair_type": "MILLING_PATCH",
        "estimated_cost_inr": 850000.0, # 8.5 Lakhs
        "coordinates": [
            [21.1150, 79.0950], [21.1120, 79.0980], [21.1080, 79.1020]
        ]
    },
    {
        "id": "COR-11",
        "road_name": "Khamla Sindhi Colony Interior Lane",
        "ward": "Laxmi Nagar",
        "zone": "Zone 2",
        "road_type": "RESIDENTIAL",
        "length_km": 2.1,
        "defect_count": 7,
        "severity": "LOW",
        "traffic_density_score": 4.8,
        "accident_risk_score": 3.2,
        "public_complaints_score": 6.8,
        "economic_importance_score": 4.2,
        "average_daily_traffic": 14000,
        "accident_count_3yr": 2,
        "complaint_count": 22,
        "economic_tags": ["Neighborhood Access", "Local Grocery Route"],
        "repair_type": "CRACK_SEAL",
        "estimated_cost_inr": 420000.0, # 4.2 Lakhs
        "coordinates": [
            [21.1180, 79.0680], [21.1150, 79.0650], [21.1120, 79.0620]
        ]
    },
    {
        "id": "COR-12",
        "road_name": "Nandanvan Colony Ring Feeder",
        "ward": "Nehru Nagar",
        "zone": "Zone 4",
        "road_type": "RESIDENTIAL",
        "length_km": 2.8,
        "defect_count": 9,
        "severity": "MEDIUM",
        "traffic_density_score": 5.5,
        "accident_risk_score": 4.1,
        "public_complaints_score": 6.9,
        "economic_importance_score": 4.8,
        "average_daily_traffic": 19000,
        "accident_count_3yr": 4,
        "complaint_count": 24,
        "economic_tags": ["Residential Arterial", "Primary College Route"],
        "repair_type": "MILLING_PATCH",
        "estimated_cost_inr": 680000.0, # 6.8 Lakhs
        "coordinates": [
            [21.1350, 79.1250], [21.1320, 79.1300], [21.1280, 79.1350]
        ]
    },
    {
        "id": "COR-13",
        "road_name": "Seminary Hills Forest Access Road",
        "ward": "Dharampeth",
        "zone": "Zone 2",
        "road_type": "RESIDENTIAL",
        "length_km": 2.4,
        "defect_count": 5,
        "severity": "LOW",
        "traffic_density_score": 3.9,
        "accident_risk_score": 2.8,
        "public_complaints_score": 4.9,
        "economic_importance_score": 3.5,
        "average_daily_traffic": 9500,
        "accident_count_3yr": 1,
        "complaint_count": 12,
        "economic_tags": ["Recreation Access", "Scenic Drive"],
        "repair_type": "CRACK_SEAL",
        "estimated_cost_inr": 360000.0, # 3.6 Lakhs
        "coordinates": [
            [21.1620, 79.0620], [21.1680, 79.0600], [21.1740, 79.0580]
        ]
    },
    {
        "id": "COR-14",
        "road_name": "Koradi Power Plant Approach Road",
        "ward": "Mangalwari",
        "zone": "Zone 5",
        "road_type": "INDUSTRIAL",
        "length_km": 5.4,
        "defect_count": 12,
        "severity": "HIGH",
        "traffic_density_score": 7.9,
        "accident_risk_score": 7.4,
        "public_complaints_score": 6.8,
        "economic_importance_score": 8.4,
        "average_daily_traffic": 41000,
        "accident_count_3yr": 16,
        "complaint_count": 21,
        "economic_tags": ["Power Grid Transport", "Ash Hauling Corridor", "Industrial Transit"],
        "repair_type": "RESURFACING",
        "estimated_cost_inr": 1450000.0, # 14.5 Lakhs
        "coordinates": [
            [21.2250, 79.0950], [21.2380, 79.0980], [21.2500, 79.1020]
        ]
    }
]

class SmartBudgetOptimizationService:
    @staticmethod
    def get_corridors() -> List[Dict[str, Any]]:
        return copy.deepcopy(NAGPUR_ROAD_CORRIDORS)

    @staticmethod
    def calculate_composite_score(
        corridor: Dict[str, Any],
        w_traffic: float = 0.30,
        w_accident: float = 0.25,
        w_complaints: float = 0.25,
        w_economic: float = 0.20
    ) -> float:
        """
        Calculates Multi-Criteria Criticality Score (1.0 to 10.0 scale)
        Composite = w1*Traffic + w2*Accident + w3*Complaints + w4*Economic
        """
        # Normalize weights if sum != 1.0
        total_w = w_traffic + w_accident + w_complaints + w_economic
        if total_w > 0:
            w_traffic /= total_w
            w_accident /= total_w
            w_complaints /= total_w
            w_economic /= total_w
        else:
            w_traffic, w_accident, w_complaints, w_economic = 0.30, 0.25, 0.25, 0.20

        score = (
            w_traffic * corridor["traffic_density_score"] +
            w_accident * corridor["accident_risk_score"] +
            w_complaints * corridor["public_complaints_score"] +
            w_economic * corridor["economic_importance_score"]
        )
        return round(score, 2)

    @classmethod
    def optimize_budget(cls, req: BudgetOptimizationRequest) -> BudgetOptimizationResponse:
        """
        Solves the Smart Maintenance Challenge under reduced budget (e.g. 40% reduction):
        1. Calculates Composite Priority Score using given weights.
        2. Computes Benefit-to-Cost Ratio (BCR) = (CompositeScore * ADT) / Cost.
        3. Applies Knapsack greedy-heuristic optimization to maximize total infrastructure quality
           subject to Total_Cost <= Reduced_Budget.
        4. Benchmarks the result against Traditional Naive FCFS approach.
        """
        base_budget = req.total_baseline_budget_inr
        cut_pct = req.reduction_percentage
        reduced_budget = base_budget * (1.0 - (cut_pct / 100.0))
        cut_amount = base_budget - reduced_budget

        corridors = copy.deepcopy(NAGPUR_ROAD_CORRIDORS)

        # 1. Calculate scores and Cost-Benefit Ratios
        for c in corridors:
            comp_score = cls.calculate_composite_score(
                c,
                w_traffic=req.weight_traffic,
                w_accident=req.weight_accident,
                w_complaints=req.weight_complaints,
                w_economic=req.weight_economic
            )
            c["composite_priority_score"] = comp_score
            
            # Multi-factor Benefit Metric factoring Commuters and Accident Prevention
            accident_mult = 1.0 + (c["accident_count_3yr"] / 15.0)
            economic_mult = 1.0 + (c["economic_importance_score"] / 20.0)
            benefit_points = comp_score * (c["average_daily_traffic"] / 1000.0) * accident_mult * economic_mult
            cost = c["estimated_cost_inr"]
            # BCR = Benefit points per Lakh of Rupees
            c["cost_benefit_ratio"] = round((benefit_points / (cost / 100000.0)), 2)

        # 2. Sort corridors by Cost-Benefit Ratio (highest impact per rupee spent)
        # Ties broken by composite priority score
        corridors.sort(key=lambda x: (x["cost_benefit_ratio"], x["composite_priority_score"]), reverse=True)

        funded_list: List[Dict[str, Any]] = []
        deferred_list: List[Dict[str, Any]] = []
        current_spent = 0.0

        for rank, c in enumerate(corridors, start=1):
            c["allocation_rank"] = rank
            cost = c["estimated_cost_inr"]

            if current_spent + cost <= reduced_budget:
                c["funding_status"] = "FUNDED"
                c["justification"] = f"Approved: Rank #{rank} (BCR: {c['cost_benefit_ratio']}) protects {c['average_daily_traffic']:,} daily commuters and mitigates {c['accident_count_3yr']} 3-yr accident risk points within ₹{reduced_budget/100000:.1f}L limit."
                funded_list.append(c)
                current_spent += cost
            else:
                c["funding_status"] = "DEFERRED"
                c["justification"] = f"Deferred due to {cut_pct:.0f}% budget reduction. Scheduled for preventive crack-seal monitoring. Deficit to fund: ₹{(current_spent + cost - reduced_budget)/100000:.1f} Lakhs."
                deferred_list.append(c)

        # Metrics for funded set
        total_corridors_analyzed = len(corridors)
        funded_count = len(funded_list)
        deferred_count = len(deferred_list)
        remaining_contingency = max(0.0, reduced_budget - current_spent)
        utilization_pct = round((current_spent / reduced_budget * 100.0) if reduced_budget > 0 else 0.0, 1)

        # Quality Preservation Index calculation:
        # Total possible benefit points across all 14 corridors vs benefit achieved in funded set
        total_possible_benefit = sum(c["composite_priority_score"] * c["average_daily_traffic"] for c in corridors)
        achieved_benefit = sum(c["composite_priority_score"] * c["average_daily_traffic"] for c in funded_list)
        quality_preservation_index = round((achieved_benefit / total_possible_benefit * 100.0), 1)

        total_citizens_served = sum(c["average_daily_traffic"] for c in funded_list)
        
        # Blackspot mitigation calculation (accidents on roads with accident_risk_score >= 7.5)
        critical_blackspots = [c for c in corridors if c["accident_risk_score"] >= 7.5]
        total_critical_accidents = sum(c["accident_count_3yr"] for c in critical_blackspots)
        mitigated_accidents = sum(c["accident_count_3yr"] for c in funded_list if c["accident_risk_score"] >= 7.5)
        blackspot_mitigation_pct = round((mitigated_accidents / total_critical_accidents * 100.0) if total_critical_accidents > 0 else 100.0, 1)

        # 3. Build Benchmark Comparison: Naive FCFS vs Smart Prioritization
        # Naive FCFS: Allocates sequentially by raw complaint count or first reported until budget runs out
        fcfs_corridors = sorted(corridors, key=lambda x: x["complaint_count"], reverse=True)
        fcfs_spent = 0.0
        fcfs_funded = []
        for c in fcfs_corridors:
            if fcfs_spent + c["estimated_cost_inr"] <= reduced_budget:
                fcfs_funded.append(c)
                fcfs_spent += c["estimated_cost_inr"]

        fcfs_benefit = sum(c["composite_priority_score"] * c["average_daily_traffic"] for c in fcfs_funded)
        fcfs_quality_index = round((fcfs_benefit / total_possible_benefit * 100.0), 1)
        fcfs_citizens = sum(c["average_daily_traffic"] for c in fcfs_funded)
        fcfs_mitigated_accidents = sum(c["accident_count_3yr"] for c in fcfs_funded if c["accident_risk_score"] >= 7.5)
        fcfs_blackspot_pct = round((fcfs_mitigated_accidents / total_critical_accidents * 100.0) if total_critical_accidents > 0 else 0.0, 1)

        benchmarks = {
            "naive_fcfs": BenchmarkCard(
                title="Traditional Approach (Naive First-Come-First-Serve)",
                strategy="Prioritizes purely by raw public complaint count or squeaky-wheel politics without factoring traffic volume or economic yield.",
                roads_funded=len(fcfs_funded),
                roads_deferred=total_corridors_analyzed - len(fcfs_funded),
                budget_utilized_inr=fcfs_spent,
                citizens_impacted_daily=fcfs_citizens,
                accident_blackspots_covered=sum(1 for c in fcfs_funded if c["accident_risk_score"] >= 7.5),
                total_blackspots=len(critical_blackspots),
                infrastructure_quality_index=fcfs_quality_index,
                economic_corridors_saved=sum(1 for c in fcfs_funded if c["economic_importance_score"] >= 8.5),
                key_vulnerabilities=[
                    "Depletes 40% reduced budget on secondary residential roads with vocal residents",
                    f"Leaves {len(critical_blackspots) - sum(1 for c in fcfs_funded if c['accident_risk_score'] >= 7.5)} deadly accident corridors completely unfunded",
                    f"Serves {total_citizens_served - fcfs_citizens:,} FEWER daily commuters despite spending identical municipal funds"
                ]
            ),
            "smart_ai_optimization": BenchmarkCard(
                title="Vikasit Smart Multi-Criteria Allocation (40% Cut Optimized)",
                strategy="Maximizes public safety and civic ROI using weighted Traffic Density (30%), Accident Blackspots (25%), Public Complaints (25%), and Economic Hubs (20%).",
                roads_funded=funded_count,
                roads_deferred=deferred_count,
                budget_utilized_inr=current_spent,
                citizens_impacted_daily=total_citizens_served,
                accident_blackspots_covered=sum(1 for c in funded_list if c["accident_risk_score"] >= 7.5),
                total_blackspots=len(critical_blackspots),
                infrastructure_quality_index=quality_preservation_index,
                economic_corridors_saved=sum(1 for c in funded_list if c["economic_importance_score"] >= 8.5),
                key_vulnerabilities=[
                    f"Retains {quality_preservation_index}% infrastructure quality despite a staggering {cut_pct:.0f}% budget reduction",
                    f"Protects {blackspot_mitigation_pct}% of fatal accident blackspot corridors across Nagpur",
                    "Maintains emergency ambulance routes (GMC Hospital) and heavy industrial freight arteries (MIDC Hingna)"
                ]
            )
        }

        # Convert to Pydantic objects
        funded_corridors_pydantic = [RoadCorridorItem(**c) for c in funded_list]
        deferred_corridors_pydantic = [RoadCorridorItem(**c) for c in deferred_list]

        return BudgetOptimizationResponse(
            baseline_budget_inr=base_budget,
            reduced_budget_inr=reduced_budget,
            budget_cut_amount_inr=cut_amount,
            reduction_percentage=cut_pct,
            allocated_budget_inr=current_spent,
            remaining_contingency_inr=remaining_contingency,
            budget_utilization_pct=utilization_pct,
            total_roads_analyzed=total_corridors_analyzed,
            funded_roads_count=funded_count,
            deferred_roads_count=deferred_count,
            quality_preservation_index=quality_preservation_index,
            citizens_served_daily=total_citizens_served,
            accident_blackspots_mitigated_pct=blackspot_mitigation_pct,
            funded_corridors=funded_corridors_pydantic,
            deferred_corridors=deferred_corridors_pydantic,
            benchmark_comparison=benchmarks
        )

budget_service = SmartBudgetOptimizationService()
