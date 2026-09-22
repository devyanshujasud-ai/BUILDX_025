import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.worker import Worker, MaintenanceTask
from app.models.asset import Asset
from app.models.issue import InfrastructureIssue, IssueStatusEnum

def seed_demo():
    db = SessionLocal()
    now = datetime.utcnow()
    
    worker1 = db.query(Worker).filter(Worker.rfid_uid == "RFID-NGP-7701").first()
    worker2 = db.query(Worker).filter(Worker.rfid_uid == "RFID-NGP-7702").first()
    
    asset1 = db.query(Asset).filter(Asset.id == 1).first() # Streetlight
    asset2 = db.query(Asset).filter(Asset.id == 2).first() # Dustbin
    asset3 = db.query(Asset).filter(Asset.id == 8).first() # Pothole / Road
    if not asset3:
        asset3 = db.query(Asset).first()

    # Create / update a PENDING_VERIFICATION task
    pending_task = db.query(MaintenanceTask).filter(MaintenanceTask.status == "PENDING_VERIFICATION").first()
    if not pending_task and worker1 and asset3:
        task = MaintenanceTask(
            worker_id=worker1.id,
            asset_id=asset3.id,
            assigned_at=now - timedelta(minutes=45),
            started_at=now - timedelta(minutes=40),
            completed_at=now - timedelta(minutes=5),
            duration=2100.0, # 35 min
            status="PENDING_VERIFICATION",
            before_image="/uploads/sample_pothole_1.jpg",
            after_image="/uploads/sample_pothole_1_annotated.jpg",
            notes="Excavated loose road debris, poured fast-curing asphalt cold mix, compacted with 2-ton vibratory roller to flush IRC grade.",
            start_latitude=21.1442,
            start_longitude=79.0682,
            end_latitude=21.1443,
            end_longitude=79.0683,
        )
        db.add(task)
        db.commit()
        print("Created PENDING_VERIFICATION task for demo.")

    # Create an IN_PROGRESS task
    in_progress = db.query(MaintenanceTask).filter(MaintenanceTask.status == "IN_PROGRESS").first()
    if not in_progress and worker2 and asset1:
        task2 = MaintenanceTask(
            worker_id=worker2.id,
            asset_id=asset1.id,
            assigned_at=now - timedelta(minutes=15),
            started_at=now - timedelta(minutes=10),
            status="IN_PROGRESS",
            before_image="/uploads/sample_pothole_2.jpg",
            notes="Replacing faulty 120W LED driver and testing line current.",
            start_latitude=21.1458,
            start_longitude=79.0882,
        )
        db.add(task2)
        db.commit()
        print("Created IN_PROGRESS task for demo.")

    db.close()

if __name__ == "__main__":
    seed_demo()
