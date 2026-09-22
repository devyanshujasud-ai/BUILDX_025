import math
from typing import List, Tuple
from datetime import date
from sqlalchemy.orm import Session
from app.models.construction import ConstructionProject
from app.schemas.construction_schema import ConflictDetail

class CoordinationService:
    @staticmethod
    def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance between two geographic coordinates in meters."""
        R = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    @classmethod
    def check_dates_overlap(cls, start1: date, end1: date, start2: date, end2: date) -> Tuple[bool, date, date]:
        """Returns whether two date intervals overlap and the overlapping range."""
        overlap_start = max(start1, start2)
        overlap_end = min(end1, end2)
        return (overlap_start <= overlap_end), overlap_start, overlap_end

    @classmethod
    def are_locations_conflicting(cls, loc1: str, lat1: float, lon1: float, loc2: str, lat2: float, lon2: float) -> Tuple[bool, float]:
        """
        Determines if two projects are on the same or nearby road/location.
        Checks geographic proximity (within 350 meters) or direct street name matching.
        """
        dist_meters = cls.haversine_distance_meters(lat1, lon1, lat2, lon2)
        if dist_meters <= 350.0:
            return True, dist_meters

        # Text matching on significant road names
        l1 = loc1.lower()
        l2 = loc2.lower()
        keywords = [
            "west high court", "whc road", "katol road", "wardha road",
            "central avenue", "kamptee road", "amravati road", "ring road",
            "sitabuldi", "dharampeth", "manish nagar", "sadar", "civil lines",
            "laxmi nagar", "hingna", "wardhaman nagar"
        ]
        for kw in keywords:
            if kw in l1 and kw in l2:
                return True, dist_meters

        return False, dist_meters

    @classmethod
    def detect_conflicts_for_project(cls, project: ConstructionProject, db: Session) -> List[ConflictDetail]:
        """
        Scans other active or planned construction projects in the database
        for spatial and temporal overlap, returning structured conflict details.
        """
        if project.status in ["COMPLETED", "SUSPENDED"]:
            return []

        # Find potential conflicting projects
        other_projects = (
            db.query(ConstructionProject)
            .filter(
                ConstructionProject.id != project.id,
                ConstructionProject.status.in_(["PLANNED", "ACTIVE"]),
            )
            .all()
        )

        conflicts = []
        for other in other_projects:
            # 1. Temporal overlap check
            overlaps, ov_start, ov_end = cls.check_dates_overlap(
                project.start_date, project.end_date, other.start_date, other.end_date
            )
            if not overlaps:
                continue

            # 2. Spatial proximity check
            is_nearby, dist = cls.are_locations_conflicting(
                project.location, project.latitude, project.longitude,
                other.location, other.latitude, other.longitude,
            )
            if not is_nearby:
                continue

            # Conflict confirmed!
            agency1_name = project.agency.name if project.agency else "Executing Agency"
            agency2_name = other.agency.name if other.agency else "Other Agency"

            work1 = project.work_type.replace("_", " ").title()
            work2 = other.work_type.replace("_", " ").title()

            msg = (
                f"POTENTIAL COORDINATION CONFLICT: {work1} work by {agency1_name} and "
                f"{work2} work by {agency2_name} overlap on/near {project.location} "
                f"from {ov_start} to {ov_end} (Proximity: {round(dist, 1)}m)."
            )

            conflicts.append(
                ConflictDetail(
                    conflicting_project_id=other.id,
                    conflicting_project_code=other.project_id,
                    conflicting_agency_name=agency2_name,
                    conflicting_work_type=other.work_type,
                    location=other.location,
                    distance_meters=round(dist, 1),
                    overlap_start=str(ov_start),
                    overlap_end=str(ov_end),
                    conflict_message=msg,
                )
            )

        return conflicts

coordination_service = CoordinationService()
