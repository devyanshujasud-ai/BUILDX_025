from typing import Optional, Dict, Any
from shapely.geometry import Point, Polygon
from geopy.geocoders import Nominatim
from sqlalchemy.orm import Session
from app.models.authority import CivicAuthority

# Built-in Geofencing Polygons for Delhi-NCR & major zones
GEOFENCE_ZONES = {
    "NDMC": {
        "polygon": [
            [28.6400, 77.2000], [28.6400, 77.2400], [28.5800, 77.2400], [28.5800, 77.1800], [28.6400, 77.2000]
        ],
        "name": "New Delhi Municipal Council (NDMC)",
        "code": "NDMC",
        "email": "civic.grievance@ndmc.gov.in",
        "phone": "+91-11-23360662",
        "sla_hours": 24,
        "type": "MUNICIPAL"
    },
    "MCD_SOUTH": {
        "polygon": [
            [28.5800, 77.0500], [28.5800, 77.3000], [28.4500, 77.3000], [28.4500, 77.0500], [28.5800, 77.0500]
        ],
        "name": "MCD - South Delhi Municipal Corporation",
        "code": "MCD-S",
        "email": "roads.south@mcd.nic.in",
        "phone": "+91-11-26522700",
        "sla_hours": 48,
        "type": "MUNICIPAL"
    },
    "MCD_NORTH": {
        "polygon": [
            [28.7800, 77.0500], [28.7800, 77.2800], [28.6400, 77.2800], [28.6400, 77.0500], [28.7800, 77.0500]
        ],
        "name": "MCD - North Delhi Municipal Corporation",
        "code": "MCD-N",
        "email": "roads.north@mcd.nic.in",
        "phone": "+91-11-23225200",
        "sla_hours": 48,
        "type": "MUNICIPAL"
    },
    "MCD_EAST": {
        "polygon": [
            [28.7000, 77.2800], [28.7000, 77.3500], [28.5800, 77.3500], [28.5800, 77.2800], [28.7000, 77.2800]
        ],
        "name": "MCD - East Delhi Municipal Corporation",
        "code": "MCD-E",
        "email": "roads.east@mcd.nic.in",
        "phone": "+91-11-22144444",
        "sla_hours": 48,
        "type": "MUNICIPAL"
    },
    "NHAI_CORRIDOR": {
        "polygon": [
            [28.4000, 76.9000], [28.8500, 77.5000], [28.8000, 77.6000], [28.3500, 77.0000], [28.4000, 76.9000]
        ],
        "name": "National Highways Authority of India (NHAI)",
        "code": "NHAI",
        "email": "pothole-response@nhai.org",
        "phone": "1033",
        "sla_hours": 24,
        "type": "NATIONAL_HIGHWAY"
    }
}

class AuthorityService:
    def __init__(self):
        try:
            self.geolocator = Nominatim(user_agent="pothole_detection_system_v1")
        except Exception:
            self.geolocator = None

    def reverse_geocode(self, lat: float, lng: float) -> Dict[str, Any]:
        """Reverse geocode coordinates into address, road, city, zone"""
        result = {
            "address": f"Location ({lat:.4f}, {lng:.4f})",
            "city": "Delhi NCR",
            "road_name": "Main Arterial Road",
            "zone": "Central Zone",
            "road_type": "URBAN_ROAD"
        }
        
        if self.geolocator:
            try:
                location = self.geolocator.reverse((lat, lng), language='en', timeout=4)
                if location and location.raw:
                    address_dict = location.raw.get("address", {})
                    road = address_dict.get("road") or address_dict.get("highway") or address_dict.get("suburb") or "Road"
                    suburb = address_dict.get("suburb") or address_dict.get("neighbourhood") or address_dict.get("city_district") or "Zone"
                    city = address_dict.get("city") or address_dict.get("state_district") or address_dict.get("state") or "Delhi"
                    
                    road_type = "URBAN_ROAD"
                    road_lower = (road + " " + location.address).lower()
                    if "highway" in road_lower or "expressway" in road_lower or "nh-" in road_lower or "nh " in road_lower:
                        road_type = "NATIONAL_HIGHWAY"
                    elif "ring road" in road_lower or "marg" in road_lower or "flyover" in road_lower:
                        road_type = "STATE_HIGHWAY"
                    elif "lane" in road_lower or "gali" in road_lower or "sector" in road_lower:
                        road_type = "RESIDENTIAL"
                        
                    result.update({
                        "address": location.address,
                        "city": city,
                        "road_name": road,
                        "zone": suburb,
                        "road_type": road_type
                    })
            except Exception as e:
                print(f"[Geocode Info] Reverse geocode skipped/timeout: {e}")
                
        return result

    def resolve_authority_for_location(
        self, db: Session, lat: float, lng: float, road_type: Optional[str] = None
    ) -> Optional[CivicAuthority]:
        """Resolves the responsible civic body based on coordinates and road category"""
        # 1. Check if road type matches NHAI / National Highway
        if road_type == "NATIONAL_HIGHWAY":
            nhai = db.query(CivicAuthority).filter(CivicAuthority.code == "NHAI").first()
            if nhai:
                return nhai
                
        # 2. Check if road is State Highway / Major Arterial (PWD)
        if road_type == "STATE_HIGHWAY":
            pwd = db.query(CivicAuthority).filter(CivicAuthority.code == "PWD-DL").first()
            if pwd:
                return pwd

        # 3. Check Geofencing Polygons
        point = Point(lat, lng)
        for key, zone in GEOFENCE_ZONES.items():
            if key == "NHAI_CORRIDOR" and road_type != "NATIONAL_HIGHWAY":
                continue
            poly = Polygon(zone["polygon"])
            if poly.contains(point):
                auth = db.query(CivicAuthority).filter(CivicAuthority.code == zone["code"]).first()
                if auth:
                    return auth

        # 4. Fallback to general municipal corporation (MCD South or first active authority)
        default_auth = db.query(CivicAuthority).filter(CivicAuthority.code == "MCD-S").first()
        if not default_auth:
            default_auth = db.query(CivicAuthority).filter(CivicAuthority.active == True).first()
            
        return default_auth

authority_service = AuthorityService()
