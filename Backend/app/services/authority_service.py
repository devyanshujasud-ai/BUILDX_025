from typing import Optional, Dict, Any
from shapely.geometry import Point, Polygon
from geopy.geocoders import Nominatim
from sqlalchemy.orm import Session
from app.models.authority import CivicAuthority

# Geofencing Polygons for Nagpur Municipal Corporation (NMC) Administrative Zones & Corridors
GEOFENCE_ZONES = {
    "DHARAMPETH_ZONE": {
        "polygon": [
            [21.1300, 79.0400], [21.1650, 79.0400], [21.1650, 79.0800], [21.1300, 79.0800], [21.1300, 79.0400]
        ],
        "name": "NMC - Dharampeth Zone (Zone 2)",
        "code": "NMC-DP",
        "email": "dharampeth.zone@nmcnagpur.gov.in",
        "phone": "+91-712-2567041",
        "sla_hours": 24,
        "type": "MUNICIPAL"
    },
    "LAXMI_NAGAR_ZONE": {
        "polygon": [
            [21.0900, 79.0400], [21.1300, 79.0400], [21.1300, 79.0850], [21.0900, 79.0850], [21.0900, 79.0400]
        ],
        "name": "NMC - Laxmi Nagar Zone (Zone 1)",
        "code": "NMC-LN",
        "email": "laxminagar.zone@nmcnagpur.gov.in",
        "phone": "+91-712-2567042",
        "sla_hours": 24,
        "type": "MUNICIPAL"
    },
    "DHANTOLI_SITABULDI_ZONE": {
        "polygon": [
            [21.1300, 79.0750], [21.1600, 79.0750], [21.1600, 79.0980], [21.1300, 79.0980], [21.1300, 79.0750]
        ],
        "name": "NMC - Dhantoli & Sitabuldi Zone (Zone 4)",
        "code": "NMC-DH",
        "email": "dhantoli.zone@nmcnagpur.gov.in",
        "phone": "+91-712-2567044",
        "sla_hours": 24,
        "type": "MUNICIPAL"
    },
    "MANGALWARI_SADAR_ZONE": {
        "polygon": [
            [21.1500, 79.0550], [21.1950, 79.0550], [21.1950, 79.0900], [21.1500, 79.0900], [21.1500, 79.0550]
        ],
        "name": "NMC - Mangalwari Zone (Civil Lines, Sadar, Katol Rd)",
        "code": "NMC-MG",
        "email": "mangalwari.zone@nmcnagpur.gov.in",
        "phone": "+91-712-2567045",
        "sla_hours": 24,
        "type": "MUNICIPAL"
    },
    "ASI_NAGAR_KAMPTEE_ZONE": {
        "polygon": [
            [21.1700, 79.0800], [21.2300, 79.0800], [21.2300, 79.1450], [21.1700, 79.1450], [21.1700, 79.0800]
        ],
        "name": "NMC - Asi Nagar Zone (Kamptee Road, Jaripatka)",
        "code": "NMC-AN",
        "email": "asinagar.zone@nmcnagpur.gov.in",
        "phone": "+91-712-2567046",
        "sla_hours": 36,
        "type": "MUNICIPAL"
    },
    "GANDHIBAGH_MAHAL_ZONE": {
        "polygon": [
            [21.1380, 79.0900], [21.1750, 79.0900], [21.1750, 79.1400], [21.1380, 79.1400], [21.1380, 79.0900]
        ],
        "name": "NMC - Gandhibagh Zone (Itwari, Mahal, Wardhaman Nagar)",
        "code": "NMC-GB",
        "email": "gandhibagh.zone@nmcnagpur.gov.in",
        "phone": "+91-712-2567047",
        "sla_hours": 24,
        "type": "MUNICIPAL"
    },
    "NHAI_NAGPUR_CORRIDOR": {
        "polygon": [
            [20.9500, 78.8500], [21.3500, 78.8500], [21.3500, 79.3000], [20.9500, 79.3000], [20.9500, 78.8500]
        ],
        "name": "National Highways Authority of India (NHAI Nagpur)",
        "code": "NHAI-NGP",
        "email": "piunagpur@nhai.org",
        "phone": "1033",
        "sla_hours": 24,
        "type": "NATIONAL_HIGHWAY"
    }
}

class AuthorityService:
    def __init__(self):
        try:
            self.geolocator = Nominatim(user_agent="vikasit_nagpur_civic_platform_v2")
        except Exception:
            self.geolocator = None

    def reverse_geocode(self, lat: float, lng: float) -> Dict[str, Any]:
        """Reverse geocode coordinates into Nagpur address, road, city, zone"""
        result = {
            "address": f"Location ({lat:.4f}, {lng:.4f}), Nagpur, Maharashtra",
            "city": "Nagpur",
            "road_name": "Wardha Road",
            "zone": "Dharampeth Zone",
            "road_type": "URBAN_ROAD"
        }
        
        if self.geolocator:
            try:
                location = self.geolocator.reverse((lat, lng), language='en', timeout=4)
                if location and location.raw:
                    address_dict = location.raw.get("address", {})
                    road = address_dict.get("road") or address_dict.get("highway") or address_dict.get("suburb") or "Wardha Road"
                    suburb = address_dict.get("suburb") or address_dict.get("neighbourhood") or address_dict.get("city_district") or "Dharampeth Zone"
                    city = "Nagpur"
                    
                    road_type = "URBAN_ROAD"
                    road_lower = (road + " " + location.address).lower()
                    if "highway" in road_lower or "expressway" in road_lower or "nh-" in road_lower or "nh " in road_lower or "bypass" in road_lower:
                        road_type = "NATIONAL_HIGHWAY"
                    elif "ring road" in road_lower or "marg" in road_lower or "flyover" in road_lower or "avenue" in road_lower:
                        road_type = "STATE_HIGHWAY"
                    elif "lane" in road_lower or "gali" in road_lower or "ward" in road_lower or "nagar" in road_lower:
                        road_type = "RESIDENTIAL"
                        
                    result.update({
                        "address": location.address,
                        "city": city,
                        "road_name": road,
                        "zone": suburb,
                        "road_type": road_type
                    })
            except Exception as e:
                print(f"[Geocode Info] Reverse geocode note: {e}")
                
        return result

    def resolve_authority_for_location(
        self, db: Session, lat: float, lng: float, road_type: Optional[str] = None
    ) -> Optional[CivicAuthority]:
        """Resolves the responsible civic body based on coordinates and road category in Nagpur"""
        # 1. Check if road type matches NHAI Nagpur Corridor
        if road_type == "NATIONAL_HIGHWAY":
            nhai = db.query(CivicAuthority).filter(
                (CivicAuthority.code == "NHAI-NGP") | (CivicAuthority.code == "NHAI")
            ).first()
            if nhai:
                return nhai
                
        # 2. Check if road is State Highway / Major Arterial (Maharashtra PWD)
        if road_type == "STATE_HIGHWAY":
            pwd = db.query(CivicAuthority).filter(
                (CivicAuthority.code == "MAHA-PWD") | (CivicAuthority.code == "NMC-PWD")
            ).first()
            if pwd:
                return pwd

        # 3. Check Nagpur Geofencing Polygons
        point = Point(lat, lng)
        for key, zone in GEOFENCE_ZONES.items():
            if key == "NHAI_NAGPUR_CORRIDOR" and road_type != "NATIONAL_HIGHWAY":
                continue
            poly = Polygon(zone["polygon"])
            if poly.contains(point):
                auth = db.query(CivicAuthority).filter(CivicAuthority.code == zone["code"]).first()
                if auth:
                    return auth

        # 4. Fallback to NMC PWD Roads or NMC HQ or first active authority
        default_auth = db.query(CivicAuthority).filter(CivicAuthority.code == "NMC-PWD").first()
        if not default_auth:
            default_auth = db.query(CivicAuthority).filter(CivicAuthority.code == "NMC-HQ").first()
        if not default_auth:
            default_auth = db.query(CivicAuthority).filter(CivicAuthority.active == True).first()
            
        return default_auth

authority_service = AuthorityService()
