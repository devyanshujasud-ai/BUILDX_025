import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.models.authority import CivicAuthority
from app.models.pothole import Pothole, PotholeStatusHistory, StatusEnum, SeverityEnum
from app.models.ticket import CivicTicket
from app.models.asset import Asset
from app.models.issue import (
    InfrastructureIssue,
    IssueTypeEnum,
    IssueStatusEnum,
    IssueSeverityEnum,
    IssuePriorityEnum,
)
from app.models.worker import Worker, MaintenanceTask
from app.models.construction import Agency, Contractor, ConstructionProject
from app.services.priority_service import priority_service

def migrate_schema():
    """Ensures newly added columns exist in existing SQLite tables."""
    try:
        with engine.connect() as conn:
            cols = [row[1] for row in conn.execute(text("PRAGMA table_info(infrastructure_issues)"))]
            if "priority_reason" not in cols:
                conn.execute(text("ALTER TABLE infrastructure_issues ADD COLUMN priority_reason TEXT"))
                print("[Migration] Added priority_reason to infrastructure_issues")
            if "report_count" not in cols:
                conn.execute(text("ALTER TABLE infrastructure_issues ADD COLUMN report_count INTEGER DEFAULT 1"))
                print("[Migration] Added report_count to infrastructure_issues")
            conn.commit()
    except Exception as e:
        print(f"[Migration Note] {e}")

def purge_non_nagpur_data(db: Session):
    """Purges any legacy non-Nagpur records so Nagpur is the only city in the platform."""
    # Find non-Nagpur authorities
    delhi_auth_codes = ["MCD-S", "MCD-N", "MCD-E", "NDMC", "PWD-DL"]
    delhi_auths = db.query(CivicAuthority).filter(CivicAuthority.code.in_(delhi_auth_codes)).all()
    delhi_auth_ids = [a.id for a in delhi_auths]
    
    # Get a valid Nagpur authority to reassign any foreign keys before removing
    nmc_pwd = db.query(CivicAuthority).filter(CivicAuthority.code == "NMC-PWD").first()
    
    if delhi_auth_ids and nmc_pwd:
        db.query(Pothole).filter(Pothole.authority_id.in_(delhi_auth_ids)).update(
            {"authority_id": nmc_pwd.id}, synchronize_session=False
        )
        db.query(CivicTicket).filter(CivicTicket.authority_id.in_(delhi_auth_ids)).update(
            {"authority_id": nmc_pwd.id}, synchronize_session=False
        )
        db.query(CivicAuthority).filter(CivicAuthority.code.in_(delhi_auth_codes)).delete(synchronize_session=False)
        db.commit()

    # Delete non-Nagpur potholes (e.g. ticket code TKT-DEL-101 or city containing Delhi)
    delhi_potholes = db.query(Pothole).filter(
        (Pothole.city.ilike("%delhi%")) | (Pothole.ticket_code.ilike("%del%"))
    ).all()
    for dp in delhi_potholes:
        db.query(CivicTicket).filter(CivicTicket.pothole_id == dp.id).delete(synchronize_session=False)
        db.query(PotholeStatusHistory).filter(PotholeStatusHistory.pothole_id == dp.id).delete(synchronize_session=False)
        db.query(InfrastructureIssue).filter(InfrastructureIssue.pothole_id == dp.id).delete(synchronize_session=False)
        db.delete(dp)
    db.commit()

def init_and_seed_db():
    """Initializes tables, migrates columns, and seeds pure Nagpur data."""
    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    migrate_schema()

    db: Session = SessionLocal()
    try:
        # Purge legacy non-Nagpur data
        purge_non_nagpur_data(db)

        # 2. Seed Nagpur Civic Authorities
        nagpur_authorities = [
            CivicAuthority(
                name="Nagpur Municipal Corporation (NMC)",
                code="NMC-HQ",
                full_name="Nagpur Municipal Corporation - Headquarters, Civil Lines",
                department="Urban Administration & Municipal Services",
                contact_email="commissioner@nmcnagpur.gov.in",
                contact_phone="+91-712-2567035",
                sla_hours=24,
                jurisdiction_type="MUNICIPAL",
                active=True,
            ),
            CivicAuthority(
                name="NMC - PWD Roads & Bridges",
                code="NMC-PWD",
                full_name="NMC Public Works Department (Roads, Bridges & Potholes)",
                department="Road Repair & Resurfacing Division",
                contact_email="pwd.roads@nmcnagpur.gov.in",
                contact_phone="+91-712-2567036",
                sla_hours=24,
                jurisdiction_type="MUNICIPAL",
                active=True,
            ),
            CivicAuthority(
                name="NMC - Electrical & Street Lighting",
                code="NMC-ELEC",
                full_name="NMC Electrical Engineering Division",
                department="Smart Streetlighting & Public Power",
                contact_email="electrical@nmcnagpur.gov.in",
                contact_phone="+91-712-2567037",
                sla_hours=24,
                jurisdiction_type="MUNICIPAL",
                active=True,
            ),
            CivicAuthority(
                name="NMC - Solid Waste Management",
                code="NMC-SWM",
                full_name="NMC Health & Sanitation Department",
                department="Solid Waste Management & Smart Dustbins",
                contact_email="sanitation@nmcnagpur.gov.in",
                contact_phone="+91-712-2567038",
                sla_hours=12,
                jurisdiction_type="MUNICIPAL",
                active=True,
            ),
            CivicAuthority(
                name="NMC - Town Planning & Public Works",
                code="NMC-WORKS",
                full_name="NMC Town Planning & Construction Oversight",
                department="Civil Works & Construction Coordination",
                contact_email="works@nmcnagpur.gov.in",
                contact_phone="+91-712-2567039",
                sla_hours=36,
                jurisdiction_type="MUNICIPAL",
                active=True,
            ),
            CivicAuthority(
                name="Nagpur Smart City (NSSCDCL)",
                code="NSSCDCL",
                full_name="Nagpur Smart and Sustainable City Development Corporation",
                department="Smart Infrastructure & Integrated Command Center",
                contact_email="support@smartcitynagpur.gov.in",
                contact_phone="+91-712-2550100",
                sla_hours=24,
                jurisdiction_type="MUNICIPAL",
                active=True,
            ),
            CivicAuthority(
                name="Nagpur Improvement Trust (NIT)",
                code="NIT",
                full_name="Nagpur Improvement Trust - Civil Development",
                department="Urban Infrastructure Planning & Ring Corridors",
                contact_email="contact@nitnagpur.org",
                contact_phone="+91-712-2527123",
                sla_hours=48,
                jurisdiction_type="MUNICIPAL",
                active=True,
            ),
            CivicAuthority(
                name="Maha Metro Rail Corporation (Nagpur)",
                code="MAHA-METRO",
                full_name="Maharashtra Metro Rail Corporation Limited (Nagpur Project)",
                department="Metro Corridors, Viaducts & Underpasses",
                contact_email="contact@metrorailnagpur.com",
                contact_phone="+91-712-2554200",
                sla_hours=36,
                jurisdiction_type="SPECIAL_PROJECT",
                active=True,
            ),
            CivicAuthority(
                name="National Highways Authority of India (NHAI Nagpur)",
                code="NHAI-NGP",
                full_name="NHAI Project Implementation Unit - Nagpur Outer Ring Road",
                department="Outer Ring Road, Amravati Bypass & NH-44",
                contact_email="piunagpur@nhai.org",
                contact_phone="1033",
                sla_hours=24,
                jurisdiction_type="NATIONAL_HIGHWAY",
                active=True,
            ),
            CivicAuthority(
                name="Maharashtra State PWD (Nagpur Division)",
                code="MAHA-PWD",
                full_name="Public Works Department Government of Maharashtra - Nagpur",
                department="State Highways, Major District Roads & Flyovers",
                contact_email="ee.pwdnagpur@mahagov.in",
                contact_phone="+91-712-2560812",
                sla_hours=48,
                jurisdiction_type="STATE_HIGHWAY",
                active=True,
            ),
        ]

        # Seed or sync authorities
        for auth in nagpur_authorities:
            existing = db.query(CivicAuthority).filter(CivicAuthority.code == auth.code).first()
            if not existing:
                db.add(auth)
        db.commit()

        # 3. Seed Pure Nagpur Potholes
        if db.query(Pothole).count() == 0:
            nmc_pwd = db.query(CivicAuthority).filter(CivicAuthority.code == "NMC-PWD").first()
            nhai_ngp = db.query(CivicAuthority).filter(CivicAuthority.code == "NHAI-NGP").first() or nmc_pwd
            maha_pwd = db.query(CivicAuthority).filter(CivicAuthority.code == "MAHA-PWD").first() or nmc_pwd

            sample_potholes = [
                Pothole(
                    ticket_code="TKT-NGP-101",
                    latitude=21.1458,
                    longitude=79.0882,
                    address="Wardha Road, near Rahate Colony Square, Sitabuldi, Nagpur",
                    city="Nagpur",
                    zone="Dharampeth Zone",
                    road_name="Wardha Road (NH-44 Corridor)",
                    road_type="NATIONAL_HIGHWAY",
                    confidence=0.94,
                    severity=SeverityEnum.CRITICAL.value,
                    severity_score=8.9,
                    box_area_ratio=0.072,
                    bounding_boxes='[[110, 220, 500, 530, 0.94, "CRITICAL"]]',
                    detection_count=4,
                    image_url="/uploads/sample_pothole_1.jpg",
                    annotated_image_url="/uploads/sample_pothole_1_annotated.jpg",
                    authority_id=nhai_ngp.id,
                    status=StatusEnum.REPORTED.value,
                    reported_by="AI Dashcam Fleet",
                    notes="Severe road crater causing vehicular deceleration on Wardha Road fast lane.",
                ),
                Pothole(
                    ticket_code="TKT-NGP-102",
                    latitude=21.1524,
                    longitude=79.0680,
                    address="VIP Road, near Coffee House Square, Dharampeth, Nagpur",
                    city="Nagpur",
                    zone="Dharampeth Zone",
                    road_name="VIP Road Dharampeth",
                    road_type="URBAN_ROAD",
                    confidence=0.89,
                    severity=SeverityEnum.HIGH.value,
                    severity_score=7.4,
                    box_area_ratio=0.052,
                    bounding_boxes='[[140, 180, 430, 420, 0.89, "HIGH"]]',
                    detection_count=2,
                    image_url="/uploads/sample_pothole_2.jpg",
                    annotated_image_url="/uploads/sample_pothole_2_annotated.jpg",
                    authority_id=nmc_pwd.id,
                    status=StatusEnum.IN_PROGRESS.value,
                    reported_by="Vikasit Citizen App",
                    notes="Repeated pothole near commercial market entrance.",
                ),
                Pothole(
                    ticket_code="TKT-NGP-103",
                    latitude=21.1630,
                    longitude=79.0820,
                    address="Residency Road, Sadar Bazar, Nagpur",
                    city="Nagpur",
                    zone="Mangalwari Zone",
                    road_name="Residency Road",
                    road_type="URBAN_ROAD",
                    confidence=0.91,
                    severity=SeverityEnum.HIGH.value,
                    severity_score=7.1,
                    box_area_ratio=0.045,
                    bounding_boxes='[[130, 200, 410, 400, 0.91, "HIGH"]]',
                    detection_count=3,
                    image_url="/uploads/sample_pothole_3.jpg",
                    annotated_image_url="/uploads/sample_pothole_3_annotated.jpg",
                    authority_id=nmc_pwd.id,
                    status=StatusEnum.ACKNOWLEDGED.value,
                    reported_by="NMC Ward Inspector",
                    notes="Surface rutting and cavity outside Mount Carmel school.",
                ),
                Pothole(
                    ticket_code="TKT-NGP-104",
                    latitude=21.1215,
                    longitude=79.0685,
                    address="WHC Road, near Laxmi Nagar Square, Nagpur",
                    city="Nagpur",
                    zone="Laxmi Nagar Zone",
                    road_name="West High Court (WHC) Road",
                    road_type="STATE_HIGHWAY",
                    confidence=0.86,
                    severity=SeverityEnum.MEDIUM.value,
                    severity_score=5.8,
                    box_area_ratio=0.038,
                    bounding_boxes='[[180, 220, 390, 370, 0.86, "MEDIUM"]]',
                    detection_count=1,
                    image_url="/uploads/sample_pothole_4.jpg",
                    annotated_image_url="/uploads/sample_pothole_4_annotated.jpg",
                    authority_id=maha_pwd.id,
                    status=StatusEnum.REPORTED.value,
                    reported_by="Citizen Citizen Portal",
                    notes="Multiple edge potholes near Metro Pillar #124.",
                ),
                Pothole(
                    ticket_code="TKT-NGP-105",
                    latitude=21.0965,
                    longitude=79.0760,
                    address="Manish Nagar Main Road, near Besa T-Point, Nagpur",
                    city="Nagpur",
                    zone="Laxmi Nagar Zone",
                    road_name="Manish Nagar T-Point Arterial",
                    road_type="URBAN_ROAD",
                    confidence=0.88,
                    severity=SeverityEnum.HIGH.value,
                    severity_score=7.3,
                    box_area_ratio=0.049,
                    bounding_boxes='[[150, 190, 420, 410, 0.88, "HIGH"]]',
                    detection_count=2,
                    image_url="/uploads/sample_pothole_5.jpg",
                    annotated_image_url="/uploads/sample_pothole_5_annotated.jpg",
                    authority_id=nmc_pwd.id,
                    status=StatusEnum.RESOLVED.value,
                    reported_by="AI Dashcam Patrol",
                    notes="Asphalt depression repaired with cold mix asphalt patching.",
                    resolved_at=datetime.datetime.now(datetime.timezone.utc),
                    resolution_notes="Patch resurfacing completed by NMC asphalt crew #4.",
                ),
                Pothole(
                    ticket_code="TKT-NGP-106",
                    latitude=21.1780,
                    longitude=79.0550,
                    address="Katol Road, near Police Training School, Nagpur",
                    city="Nagpur",
                    zone="Mangalwari Zone",
                    road_name="Katol Road (MDR-12)",
                    road_type="STATE_HIGHWAY",
                    confidence=0.92,
                    severity=SeverityEnum.CRITICAL.value,
                    severity_score=8.5,
                    box_area_ratio=0.062,
                    bounding_boxes='[[120, 210, 470, 490, 0.92, "CRITICAL"]]',
                    detection_count=5,
                    image_url="/uploads/sample_pothole_6.jpg",
                    annotated_image_url="/uploads/sample_pothole_6_annotated.jpg",
                    authority_id=maha_pwd.id,
                    status=StatusEnum.IN_PROGRESS.value,
                    reported_by="Nagpur Traffic Police Feed",
                    notes="Major pothole causing two-wheeler skidding risk on downhill slope.",
                ),
                Pothole(
                    ticket_code="TKT-NGP-107",
                    latitude=21.1850,
                    longitude=79.1150,
                    address="Kamptee Road, near Automotive Square Flyover, Nagpur",
                    city="Nagpur",
                    zone="Asi Nagar Zone",
                    road_name="Kamptee Road (NH-44 North)",
                    road_type="NATIONAL_HIGHWAY",
                    confidence=0.90,
                    severity=SeverityEnum.HIGH.value,
                    severity_score=7.8,
                    box_area_ratio=0.055,
                    bounding_boxes='[[130, 190, 440, 430, 0.90, "HIGH"]]',
                    detection_count=3,
                    image_url="/uploads/sample_pothole_7.jpg",
                    annotated_image_url="/uploads/sample_pothole_7_annotated.jpg",
                    authority_id=nhai_ngp.id,
                    status=StatusEnum.REPORTED.value,
                    reported_by="Citizen Dashcam",
                    notes="Deep rut at junction of flyover landing and service road.",
                ),
                Pothole(
                    ticket_code="TKT-NGP-108",
                    latitude=21.1440,
                    longitude=79.1320,
                    address="Central Avenue, Wardhaman Nagar, Nagpur",
                    city="Nagpur",
                    zone="Gandhibagh Zone",
                    road_name="Central Avenue Commercial Corridor",
                    road_type="URBAN_ROAD",
                    confidence=0.85,
                    severity=SeverityEnum.MEDIUM.value,
                    severity_score=5.5,
                    box_area_ratio=0.035,
                    bounding_boxes='[[160, 240, 380, 390, 0.85, "MEDIUM"]]',
                    detection_count=1,
                    image_url="/uploads/sample_pothole_8.jpg",
                    annotated_image_url="/uploads/sample_pothole_8_annotated.jpg",
                    authority_id=nmc_pwd.id,
                    status=StatusEnum.ACKNOWLEDGED.value,
                    reported_by="Citizen App",
                    notes="Pothole near Radisson Square commercial intersection.",
                ),
            ]

            for p in sample_potholes:
                db.add(p)
            db.commit()

            # Create tickets and status history
            for p in sample_potholes:
                history = PotholeStatusHistory(
                    pothole_id=p.id,
                    from_status=None,
                    to_status=p.status,
                    changed_by="Vikasit Nagpur AI Engine",
                    notes="Incident registered and geo-routed"
                )
                db.add(history)
                if p.authority_id:
                    auth_obj = db.query(CivicAuthority).filter(CivicAuthority.id == p.authority_id).first()
                    ticket = CivicTicket(
                        ticket_code=p.ticket_code,
                        pothole_id=p.id,
                        authority_id=p.authority_id,
                        email_sent=True,
                        email_recipient=auth_obj.contact_email if auth_obj else "grievance@nmcnagpur.gov.in",
                    )
                    db.add(ticket)
            db.commit()
            print("[Database Seeder] Seeded pure Nagpur potholes.")

        # 4. Seed Pure Nagpur Physical Assets
        if db.query(Asset).count() == 0:
            sample_assets = [
                Asset(
                    type="STREETLIGHT",
                    name="Smart LED High Mast #WR-042",
                    latitude=21.1458,
                    longitude=79.0882,
                    department="Electrical",
                    status="OPERATIONAL",
                ),
                Asset(
                    type="STREETLIGHT",
                    name="Solar Streetlight Pole #DP-108 (VIP Road)",
                    latitude=21.1524,
                    longitude=79.0680,
                    department="Electrical",
                    status="UNDER_MAINTENANCE",
                ),
                Asset(
                    type="STREETLIGHT",
                    name="Smart Octagonal Pole #SD-55 (Sadar)",
                    latitude=21.1630,
                    longitude=79.0820,
                    department="Electrical",
                    status="OPERATIONAL",
                ),
                Asset(
                    type="STREETLIGHT",
                    name="Boulevard LED Mast #CL-12 (Civil Lines)",
                    latitude=21.1540,
                    longitude=79.0730,
                    department="Electrical",
                    status="OPERATIONAL",
                ),
                Asset(
                    type="DUSTBIN",
                    name="Smart Compactor Bin #SB-01 (Sitabuldi Market)",
                    latitude=21.1460,
                    longitude=79.0840,
                    department="Sanitation",
                    status="OPERATIONAL",
                ),
                Asset(
                    type="DUSTBIN",
                    name="Public Twin Segregation Bin #FT-15 (Futala Promenade)",
                    latitude=21.1550,
                    longitude=79.0520,
                    department="Sanitation",
                    status="OPERATIONAL",
                ),
                Asset(
                    type="DUSTBIN",
                    name="Smart Underground Waste Port #WN-04 (Wardhaman Nagar)",
                    latitude=21.1440,
                    longitude=79.1320,
                    department="Sanitation",
                    status="OPERATIONAL",
                ),
                Asset(
                    type="ROAD_SEGMENT",
                    name="Wardha Road Metro Corridor Stretch",
                    latitude=21.1270,
                    longitude=79.0760,
                    department="Roads/PWD",
                    status="OPERATIONAL",
                ),
                Asset(
                    type="ROAD_SEGMENT",
                    name="Outer Ring Road Sector 4 Corridor (Wadi - Hingna)",
                    latitude=21.1290,
                    longitude=79.0020,
                    department="Roads/PWD",
                    status="DAMAGED",
                ),
                Asset(
                    type="ROAD_SEGMENT",
                    name="Katol Road Arterial Link (Chaoni - Mankapur)",
                    latitude=21.1780,
                    longitude=79.0550,
                    department="Roads/PWD",
                    status="OPERATIONAL",
                ),
                Asset(
                    type="CONSTRUCTION",
                    name="Maha Metro Line 2 Extension Reach 4 Site",
                    latitude=21.1390,
                    longitude=79.0780,
                    department="Works",
                    status="UNDER_MAINTENANCE",
                ),
                Asset(
                    type="CONSTRUCTION",
                    name="Automotive Square Flyover Grade Separator Site",
                    latitude=21.1850,
                    longitude=79.1150,
                    department="Works",
                    status="UNDER_MAINTENANCE",
                ),
            ]
            for a in sample_assets:
                db.add(a)
            db.commit()
            print("[Database Seeder] Seeded physical infrastructure assets for Nagpur.")

        # 5. Seed Nagpur Infrastructure Issues
        if db.query(InfrastructureIssue).count() == 0:
            asset_sl_1 = db.query(Asset).filter(Asset.type == "STREETLIGHT").first()
            asset_db_1 = db.query(Asset).filter(Asset.type == "DUSTBIN").first()
            asset_rd_1 = db.query(Asset).filter(Asset.type == "ROAD_SEGMENT").first()
            pothole_1 = db.query(Pothole).first()

            raw_issues = [
                {
                    "asset_id": pothole_1.id if pothole_1 else None,
                    "type": IssueTypeEnum.POTHOLE.value,
                    "source": "AI_DETECTION",
                    "description": "Severe road crater 80cm width on Wardha Road fast lane outside Rahate Colony.",
                    "latitude": 21.1458,
                    "longitude": 79.0882,
                    "severity": IssueSeverityEnum.CRITICAL.value,
                    "status": IssueStatusEnum.VERIFIED.value,
                    "report_count": 4,
                    "pothole_id": pothole_1.id if pothole_1 else None,
                },
                {
                    "asset_id": asset_sl_1.id if asset_sl_1 else None,
                    "type": IssueTypeEnum.STREETLIGHT.value,
                    "source": "CITIZEN",
                    "description": "Streetlight lamp flickering causing dark hazard zone during evening rush on VIP Road.",
                    "latitude": 21.1524,
                    "longitude": 79.0680,
                    "severity": IssueSeverityEnum.MEDIUM.value,
                    "status": IssueStatusEnum.ASSIGNED.value,
                    "report_count": 2,
                },
                {
                    "asset_id": asset_db_1.id if asset_db_1 else None,
                    "type": IssueTypeEnum.DUSTBIN.value,
                    "source": "IOT_SENSOR",
                    "description": "Smart bin fill level exceeded 95% capacity in Sitabuldi Main Market corridor.",
                    "latitude": 21.1460,
                    "longitude": 79.0840,
                    "severity": IssueSeverityEnum.HIGH.value,
                    "status": IssueStatusEnum.IN_PROGRESS.value,
                    "report_count": 5,
                },
                {
                    "asset_id": asset_rd_1.id if asset_rd_1 else None,
                    "type": IssueTypeEnum.ROAD_DAMAGE.value,
                    "source": "INSPECTION",
                    "description": "Asphalt surface rutting and shoulder erosion along 200m stretch on Katol Road.",
                    "latitude": 21.1780,
                    "longitude": 79.0550,
                    "severity": IssueSeverityEnum.HIGH.value,
                    "status": IssueStatusEnum.PENDING_VERIFICATION.value,
                    "report_count": 2,
                },
                {
                    "asset_id": None,
                    "type": IssueTypeEnum.CONSTRUCTION.value,
                    "source": "CITIZEN",
                    "description": "Unbarricaded excavation for storm water drain trenching blocking lane in Manish Nagar.",
                    "latitude": 21.0965,
                    "longitude": 79.0760,
                    "severity": IssueSeverityEnum.CRITICAL.value,
                    "status": IssueStatusEnum.REPORTED.value,
                    "report_count": 3,
                },
                {
                    "asset_id": None,
                    "type": IssueTypeEnum.ROAD_DAMAGE.value,
                    "source": "CITIZEN",
                    "description": "Water logging and cracked road divider at Jaripatka Main Road junction.",
                    "latitude": 21.1870,
                    "longitude": 79.0910,
                    "severity": IssueSeverityEnum.MEDIUM.value,
                    "status": IssueStatusEnum.REPORTED.value,
                    "report_count": 2,
                },
                {
                    "asset_id": None,
                    "type": IssueTypeEnum.POTHOLE.value,
                    "source": "CITIZEN",
                    "description": "Minor road depression on Central Avenue Wardhaman Nagar repaired and sealed.",
                    "latitude": 21.1440,
                    "longitude": 79.1320,
                    "severity": IssueSeverityEnum.LOW.value,
                    "status": IssueStatusEnum.RESOLVED.value,
                    "report_count": 1,
                    "resolved_at": datetime.datetime.now(datetime.timezone.utc),
                },
            ]

            for item in raw_issues:
                dept = priority_service.route_department(item["type"])
                asset_obj = db.query(Asset).filter(Asset.id == item["asset_id"]).first() if item.get("asset_id") else None
                atype = asset_obj.type if asset_obj else None
                prio, reason = priority_service.calculate_priority_and_reason(
                    severity=item["severity"],
                    issue_created_at=None,
                    report_count=item.get("report_count", 1),
                    asset_type=atype,
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                )
                issue = InfrastructureIssue(
                    asset_id=item["asset_id"],
                    type=item["type"],
                    source=item["source"],
                    description=item["description"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    severity=item["severity"],
                    priority=prio,
                    priority_reason=reason,
                    report_count=item.get("report_count", 1),
                    department=dept,
                    status=item["status"],
                    pothole_id=item.get("pothole_id"),
                    resolved_at=item.get("resolved_at"),
                )
                db.add(issue)
            db.commit()
            print("[Database Seeder] Seeded pure Nagpur infrastructure issues.")

        # --- SEED WORKERS WITH RFID UIDS ---
        if db.query(Worker).count() == 0:
            workers = [
                Worker(
                    name="Ramesh Patil",
                    rfid_uid="RFID-NGP-7701",
                    department="Roads/PWD",
                    role="Senior Asphalt Technician",
                    active=True,
                ),
                Worker(
                    name="Sunil Deshmukh",
                    rfid_uid="RFID-NGP-8802",
                    department="Electrical",
                    role="Streetlight Lineman",
                    active=True,
                ),
                Worker(
                    name="Pooja Sharma",
                    rfid_uid="RFID-NGP-9903",
                    department="Sanitation",
                    role="Waste Ops Lead",
                    active=True,
                ),
                Worker(
                    name="Rajesh Meshram",
                    rfid_uid="RFID-NGP-6604",
                    department="Works",
                    role="Civil Construction Foreman",
                    active=True,
                ),
                Worker(
                    name="Amit Walke",
                    rfid_uid="RFID-NGP-5505",
                    department="General Civic",
                    role="Civic Inspection Officer",
                    active=True,
                ),
            ]
            db.add_all(workers)
            db.commit()
            print(f"[Database Seeder] Seeded {len(workers)} Nagpur maintenance workers with RFID badges.")

        # --- SEED SAMPLE MAINTENANCE TASKS ---
        if db.query(MaintenanceTask).count() == 0:
            w1 = db.query(Worker).filter(Worker.rfid_uid == "RFID-NGP-7701").first()
            w2 = db.query(Worker).filter(Worker.rfid_uid == "RFID-NGP-8802").first()
            a1 = db.query(Asset).first()
            a2 = db.query(Asset).offset(1).first()

            if w1 and a1:
                now = datetime.datetime.now(datetime.timezone.utc)
                start_time = now - datetime.timedelta(minutes=45)
                comp_time = now - datetime.timedelta(minutes=15)
                task1 = MaintenanceTask(
                    worker_id=w1.id,
                    asset_id=a1.id,
                    issue_id=None,
                    assigned_at=start_time,
                    started_at=start_time,
                    completed_at=comp_time,
                    duration=1800.0,  # 30 mins
                    status="COMPLETED",
                )
                db.add(task1)

            if w2 and a2:
                now = datetime.datetime.now(datetime.timezone.utc)
                start_time = now - datetime.timedelta(minutes=12)
                task2 = MaintenanceTask(
                    worker_id=w2.id,
                    asset_id=a2.id,
                    issue_id=None,
                    assigned_at=start_time,
                    started_at=start_time,
                    completed_at=None,
                    duration=None,
                    status="IN_PROGRESS",
                )
                db.add(task2)

            db.commit()
            print("[Database Seeder] Seeded initial maintenance history tasks.")

        # --- SEED AGENCIES ---
        if db.query(Agency).count() == 0:
            agencies = [
                Agency(
                    name="NMC Water Works Department",
                    code="NMC-WATER",
                    department="Water Supply & Pipeline Maintenance",
                    contact_email="waterworks@nmcnagpur.gov.in",
                    contact_phone="+91-712-2567041",
                    active=True,
                ),
                Agency(
                    name="MSEDCL Nagpur Electrical Division",
                    code="MSEDCL-NGP",
                    department="Power Distribution & Underground Cabling",
                    contact_email="power@msedclnagpur.in",
                    contact_phone="+91-712-2548900",
                    active=True,
                ),
                Agency(
                    name="Maharashtra State PWD (Nagpur Division)",
                    code="MAHA-PWD-CIVIL",
                    department="Road Resurfacing & Flyovers",
                    contact_email="pwd@nagpur.gov.in",
                    contact_phone="+91-712-2560120",
                    active=True,
                ),
                Agency(
                    name="Jio Digital Fiber Infrastructure",
                    code="JIO-FIBER",
                    department="Underground Optical Fiber & Telecom",
                    contact_email="telecom.infra@jio.com",
                    contact_phone="+91-712-6601000",
                    active=True,
                ),
                Agency(
                    name="Maha Metro Rail Civil Division",
                    code="MAHA-METRO-CIVIL",
                    department="Metro Viaducts & Underpass Works",
                    contact_email="civil@metrorailnagpur.com",
                    contact_phone="+91-712-2554200",
                    active=True,
                ),
            ]
            db.add_all(agencies)
            db.commit()
            print(f"[Database Seeder] Seeded {len(agencies)} public infrastructure agencies.")

        # --- SEED CONTRACTORS ---
        if db.query(Contractor).count() == 0:
            contractors = [
                Contractor(
                    name="Vidarbha Infrastructure & Pipeline Corp",
                    license_no="LIC-NGP-INFRA-8821",
                    contact_person="Vikas Thakre",
                    phone="+91-9823011223",
                    active=True,
                ),
                Contractor(
                    name="Shree Power Grid & Electricals",
                    license_no="LIC-NGP-ELEC-4412",
                    contact_person="Anil Deshmukh",
                    phone="+91-9823044556",
                    active=True,
                ),
                Contractor(
                    name="Nagpur Asphalt & Road Resurfacing Ltd",
                    license_no="LIC-NGP-ROAD-9011",
                    contact_person="Rajendra Somani",
                    phone="+91-9823077889",
                    active=True,
                ),
            ]
            db.add_all(contractors)
            db.commit()
            print(f"[Database Seeder] Seeded {len(contractors)} civil contractors.")

        # --- SEED CONSTRUCTION PROJECTS ---
        if db.query(ConstructionProject).count() == 0:
            water_agency = db.query(Agency).filter(Agency.code == "NMC-WATER").first()
            elec_agency = db.query(Agency).filter(Agency.code == "MSEDCL-NGP").first()
            pwd_agency = db.query(Agency).filter(Agency.code == "MAHA-PWD-CIVIL").first()
            
            c1 = db.query(Contractor).first()
            c2 = db.query(Contractor).offset(1).first()
            c3 = db.query(Contractor).offset(2).first()

            projects = [
                # Project 1: Water pipeline on West High Court Road
                ConstructionProject(
                    project_id="PRJ-NGP-2026-001",
                    location="West High Court Road, Dharampeth",
                    agency_id=water_agency.id if water_agency else 1,
                    contractor_id=c1.id if c1 else None,
                    work_type="WATER_PIPELINE",
                    start_date=datetime.date(2026, 9, 15),
                    end_date=datetime.date(2026, 10, 20),
                    status="ACTIVE",
                    description="Main feeder waterline pipeline replacement from Coffee House square to Shankar Nagar.",
                    latitude=21.1432,
                    longitude=79.0621,
                ),
                # Project 2: Overlapping electrical cable trenching on the EXACT same road!
                ConstructionProject(
                    project_id="PRJ-NGP-2026-002",
                    location="West High Court Road, Dharampeth",
                    agency_id=elec_agency.id if elec_agency else 2,
                    contractor_id=c2.id if c2 else None,
                    work_type="ELECTRIC_CABLE",
                    start_date=datetime.date(2026, 9, 25),
                    end_date=datetime.date(2026, 10, 15),
                    status="ACTIVE",
                    description="Underground high-tension feeder cable laying along WHC road corridor.",
                    latitude=21.1435,
                    longitude=79.0624,
                ),
                # Project 3: Resurfacing on Central Avenue
                ConstructionProject(
                    project_id="PRJ-NGP-2026-003",
                    location="Central Avenue, Wardhaman Nagar",
                    agency_id=pwd_agency.id if pwd_agency else 3,
                    contractor_id=c3.id if c3 else None,
                    work_type="ROAD_RESURFACING",
                    start_date=datetime.date(2026, 10, 1),
                    end_date=datetime.date(2026, 11, 15),
                    status="PLANNED",
                    description="Bituminous overlay and lane expansion on Central Avenue corridor.",
                    latitude=21.1440,
                    longitude=79.1320,
                ),
                # Project 4: Completed drainage on Kamptee Road
                ConstructionProject(
                    project_id="PRJ-NGP-2026-004",
                    location="Kamptee Road, Asi Nagar",
                    agency_id=water_agency.id if water_agency else 1,
                    contractor_id=c1.id if c1 else None,
                    work_type="DRAINAGE",
                    start_date=datetime.date(2026, 8, 1),
                    end_date=datetime.date(2026, 9, 10),
                    status="COMPLETED",
                    description="Stormwater concrete box culvert construction near Uppalwadi bridge.",
                    latitude=21.1850,
                    longitude=79.1120,
                ),
            ]
            db.add_all(projects)
            db.commit()
            print(f"[Database Seeder] Seeded {len(projects)} construction projects (including overlapping WHC Road pair).")

    except Exception as e:
        db.rollback()
        print(f"[Database Seeder Error] {e}")
    finally:
        db.close()
