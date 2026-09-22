import math
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict, Any

# Critical Community Points of Interest (POIs) across Nagpur
NAGPUR_CRITICAL_POIS: List[Dict[str, Any]] = [
    # Hospitals
    {"name": "Government Medical College & Hospital (GMC)", "type": "HOSPITAL", "lat": 21.1350, "lng": 79.0980},
    {"name": "AIIMS Nagpur", "type": "HOSPITAL", "lat": 21.0500, "lng": 79.0200},
    {"name": "Kingsway Hospital", "type": "HOSPITAL", "lat": 21.1520, "lng": 79.0880},
    {"name": "Orange City Hospital & Research Institute", "type": "HOSPITAL", "lat": 21.1160, "lng": 79.0620},
    {"name": "Alexis Multispeciality Hospital", "type": "HOSPITAL", "lat": 21.1890, "lng": 79.0820},
    
    # Schools & Universities
    {"name": "Dharampeth High School", "type": "SCHOOL", "lat": 21.1440, "lng": 79.0660},
    {"name": "St. Francis De Sales (SFS) School", "type": "SCHOOL", "lat": 21.1600, "lng": 79.0700},
    {"name": "Somalwar High School Ramdaspeth", "type": "SCHOOL", "lat": 21.1320, "lng": 79.0760},
    {"name": "Bishop Cotton School", "type": "SCHOOL", "lat": 21.1510, "lng": 79.0780},
    {"name": "VNIT South Ambazari Campus", "type": "SCHOOL", "lat": 21.1250, "lng": 79.0510},

    # Bus Stops & Transit Terminals
    {"name": "Sitabuldi Central Bus Interchange", "type": "BUS_STOP", "lat": 21.1460, "lng": 79.0840},
    {"name": "Mor Bhavan City Bus Station", "type": "BUS_STOP", "lat": 21.1440, "lng": 79.0820},
    {"name": "Ganeshpeth MSRTC Central Bus Station", "type": "BUS_STOP", "lat": 21.1400, "lng": 79.0990},
    {"name": "Chhatrapati Square Transit Bus Stop", "type": "BUS_STOP", "lat": 21.1090, "lng": 79.0720},
    {"name": "Rahate Colony Bus Stop (Wardha Rd)", "type": "BUS_STOP", "lat": 21.1270, "lng": 79.0760},
]

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance in meters between two lat/lng coordinates."""
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def find_nearest_critical_poi(lat: float, lng: float, threshold_meters: float = 600.0) -> Optional[Dict[str, Any]]:
    """Checks if coordinates are within threshold_meters of a school, hospital, or bus stop."""
    closest_poi = None
    min_dist = float("inf")

    for poi in NAGPUR_CRITICAL_POIS:
        dist = haversine_distance_meters(lat, lng, poi["lat"], poi["lng"])
        if dist < min_dist:
            min_dist = dist
            closest_poi = {**poi, "distance_meters": round(dist, 1)}

    if closest_poi and min_dist <= threshold_meters:
        return closest_poi
    return None

class PriorityRoutingService:
    @staticmethod
    def route_department(issue_type: str) -> str:
        """
        Department routing rule:
        POTHOLE / ROAD_DAMAGE -> Roads/PWD
        STREETLIGHT -> Electrical
        DUSTBIN -> Sanitation
        CONSTRUCTION -> Works
        OTHER -> General Civic
        """
        t = (issue_type or "").upper()
        if t in ("POTHOLE", "ROAD_DAMAGE"):
            return "Roads/PWD"
        elif t == "STREETLIGHT":
            return "Electrical"
        elif t == "DUSTBIN":
            return "Sanitation"
        elif t == "CONSTRUCTION":
            return "Works"
        else:
            return "General Civic"

    @staticmethod
    def calculate_priority_and_reason(
        severity: str,
        issue_created_at: Optional[datetime],
        report_count: int = 1,
        asset_type: Optional[str] = None,
        latitude: float = 0.0,
        longitude: float = 0.0,
    ) -> Tuple[str, str]:
        """
        Transparent rule-based priority scoring:
        Inputs:
        - severity (CRITICAL, HIGH, MEDIUM, LOW)
        - issue age (hours since created_at)
        - report count (number of citizen complaints / duplicate reports)
        - asset type
        - nearby school / hospital / bus stop
        """
        score = 0
        reasons = []

        # 1. Severity Input
        sev = (severity or "MEDIUM").upper()
        if sev == "CRITICAL":
            score += 40
            reasons.append("Severity: CRITICAL (+40)")
        elif sev == "HIGH":
            score += 28
            reasons.append("Severity: HIGH (+28)")
        elif sev == "MEDIUM":
            score += 16
            reasons.append("Severity: MEDIUM (+16)")
        else:
            score += 6
            reasons.append("Severity: LOW (+6)")

        # 2. Issue Age Input
        if issue_created_at:
            if issue_created_at.tzinfo is None:
                issue_created_at = issue_created_at.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            age_hours = max(0.0, (now - issue_created_at).total_seconds() / 3600.0)
        else:
            age_hours = 0.0

        if age_hours >= 72:
            score += 20
            reasons.append(f"Age: {age_hours:.1f}h unresolved (>72h, +20)")
        elif age_hours >= 48:
            score += 14
            reasons.append(f"Age: {age_hours:.1f}h unresolved (>48h, +14)")
        elif age_hours >= 24:
            score += 8
            reasons.append(f"Age: {age_hours:.1f}h unresolved (>24h, +8)")
        else:
            reasons.append("Age: Recent (<24h, +0)")

        # 3. Report Count Input (duplicate complaints / public urgency)
        count = max(1, report_count or 1)
        if count >= 5:
            score += 20
            reasons.append(f"Public Reports: {count} complaints (+20)")
        elif count >= 3:
            score += 12
            reasons.append(f"Public Reports: {count} complaints (+12)")
        elif count >= 2:
            score += 6
            reasons.append(f"Public Reports: {count} complaints (+6)")
        else:
            reasons.append("Public Reports: 1 report (+0)")

        # 4. Asset Type Input
        if asset_type:
            atype = asset_type.upper()
            if any(k in atype for k in ("HOSPITAL", "SCHOOL", "BUS", "TRANSIT", "FLYOVER", "SIGNAL")):
                score += 15
                reasons.append(f"Asset: Critical {atype} (+15)")
            else:
                score += 5
                reasons.append(f"Asset: {atype} (+5)")

        # 5. Nearby School / Hospital / Bus Stop Input
        nearby_poi = find_nearest_critical_poi(latitude, longitude, threshold_meters=500.0)
        if nearby_poi:
            poi_type = nearby_poi["type"]
            poi_name = nearby_poi["name"]
            dist = nearby_poi["distance_meters"]
            score += 25
            reasons.append(f"Nearby {poi_type}: {dist}m from {poi_name} (+25)")

        # Priority Level Assignment based on transparent thresholds
        if score >= 65:
            priority = "CRITICAL"
        elif score >= 42:
            priority = "HIGH"
        elif score >= 22:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        reason_summary = " | ".join(reasons) + f" => Total Score: {score} [{priority}]"
        return priority, reason_summary

priority_service = PriorityRoutingService()
