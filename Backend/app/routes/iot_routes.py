from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.database import get_db
from app.models.asset import Asset
from app.models.issue import InfrastructureIssue, IssueStatusEnum
from app.models.iot_telemetry import IoTTelemetry
from app.schemas.iot_schema import (
    IoTTelemetryRequest,
    IoTTelemetryResponse,
    IoTStatsResponse,
)
from app.services.iot_service import iot_service
from app.services.priority_service import priority_service

router = APIRouter(prefix="/api/iot", tags=["ESP32 IoT Telemetry"])

@router.post("/telemetry", response_model=IoTTelemetryResponse)
def ingest_telemetry(payload: IoTTelemetryRequest, db: Session = Depends(get_db)):
    """
    Generic HTTP JSON endpoint for ESP32 & IoT microcontrollers.
    Receives raw sensor readings, runs real-time threshold & anomaly detection,
    stores the telemetry log, and automatically files/escalates civic work orders
    if abnormal infrastructure conditions are detected.
    """
    # 1. Validate Asset
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Target asset with ID {payload.asset_id} not found."
        )

    reading_time = payload.timestamp or datetime.utcnow()

    # 2. Evaluate Anomaly
    is_anomaly, anomaly_reason, severity, issue_type, issue_desc = iot_service.evaluate_telemetry(
        payload.device_type, payload.data
    )

    linked_issue_id = None

    if is_anomaly:
        # Determine coordinates (override from sensor GPS if provided)
        lat = float(payload.data.get("latitude", asset.latitude))
        lng = float(payload.data.get("longitude", asset.longitude))

        # Check if an active open issue already exists on this asset
        existing_issue = (
            db.query(InfrastructureIssue)
            .filter(
                InfrastructureIssue.asset_id == asset.id,
                InfrastructureIssue.type == issue_type,
                InfrastructureIssue.status.in_([
                    IssueStatusEnum.REPORTED.value,
                    IssueStatusEnum.VERIFIED.value,
                    IssueStatusEnum.ASSIGNED.value,
                    IssueStatusEnum.IN_PROGRESS.value,
                ]),
            )
            .first()
        )

        if existing_issue:
            existing_issue.report_count = (existing_issue.report_count or 1) + 1
            # Re-evaluate priority with higher report count
            prio, prio_reason = priority_service.calculate_priority_and_reason(
                severity=severity,
                issue_created_at=existing_issue.created_at,
                report_count=existing_issue.report_count,
                asset_type=asset.type,
                latitude=lat,
                longitude=lng,
            )
            existing_issue.priority = prio
            existing_issue.priority_reason = prio_reason
            existing_issue.severity = severity
            linked_issue_id = existing_issue.id
        else:
            # Create new automated issue
            dept = priority_service.route_department(issue_type)
            prio, prio_reason = priority_service.calculate_priority_and_reason(
                severity=severity,
                issue_created_at=None,
                report_count=1,
                asset_type=asset.type,
                latitude=lat,
                longitude=lng,
            )

            new_issue = InfrastructureIssue(
                asset_id=asset.id,
                type=issue_type,
                source="IOT_SENSOR",
                description=issue_desc or f"Automated IoT Alert: {anomaly_reason}",
                latitude=lat,
                longitude=lng,
                severity=severity,
                priority=prio,
                priority_reason=prio_reason,
                report_count=1,
                department=dept,
                status=IssueStatusEnum.REPORTED.value,
            )
            db.add(new_issue)
            db.flush()
            linked_issue_id = new_issue.id

        # Update Asset status
        asset.status = "DAMAGED" if severity == "CRITICAL" else "UNDER_MAINTENANCE"

    else:
        # If normal reading received and asset was marked damaged/maintenance (e.g. dustbin emptied)
        if asset.status in ["DAMAGED", "UNDER_MAINTENANCE"] and payload.device_type.upper() == "DUSTBIN":
            fill_level = float(payload.data.get("fill_level", 0.0))
            if fill_level < 50.0:
                asset.status = "OPERATIONAL"

    # 3. Store Telemetry Record
    telemetry = IoTTelemetry(
        device_id=payload.device_id.strip(),
        asset_id=asset.id,
        device_type=payload.device_type.upper().strip(),
        timestamp=reading_time,
        data=payload.data,
        is_anomaly=is_anomaly,
        anomaly_reason=anomaly_reason,
        issue_id=linked_issue_id,
    )
    db.add(telemetry)
    db.commit()
    db.refresh(telemetry)

    return IoTTelemetryResponse(
        id=telemetry.id,
        device_id=telemetry.device_id,
        asset_id=telemetry.asset_id,
        device_type=telemetry.device_type,
        timestamp=telemetry.timestamp,
        data=telemetry.data,
        is_anomaly=telemetry.is_anomaly,
        anomaly_reason=telemetry.anomaly_reason,
        issue_id=telemetry.issue_id,
        asset_name=asset.name,
        created_at=telemetry.created_at,
    )


@router.get("/telemetry", response_model=List[IoTTelemetryResponse])
def get_telemetry_logs(
    device_type: Optional[str] = None,
    asset_id: Optional[int] = None,
    is_anomaly: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieve historical IoT telemetry stream logs"""
    query = db.query(IoTTelemetry)
    if device_type:
        query = query.filter(IoTTelemetry.device_type == device_type.upper().strip())
    if asset_id:
        query = query.filter(IoTTelemetry.asset_id == asset_id)
    if is_anomaly is not None:
        query = query.filter(IoTTelemetry.is_anomaly == is_anomaly)

    records = query.order_by(desc(IoTTelemetry.id)).limit(limit).all()

    result = []
    for r in records:
        result.append(
            IoTTelemetryResponse(
                id=r.id,
                device_id=r.device_id,
                asset_id=r.asset_id,
                device_type=r.device_type,
                timestamp=r.timestamp,
                data=r.data,
                is_anomaly=r.is_anomaly,
                anomaly_reason=r.anomaly_reason,
                issue_id=r.issue_id,
                asset_name=r.asset.name if r.asset else None,
                created_at=r.created_at,
            )
        )
    return result


@router.get("/stats", response_model=IoTStatsResponse)
def get_iot_stats(db: Session = Depends(get_db)):
    """Aggregate IoT network statistics for ESP32 telemetry"""
    total_readings = db.query(IoTTelemetry).count()
    total_anomalies = db.query(IoTTelemetry).filter(IoTTelemetry.is_anomaly == True).count()
    active_devices = db.query(func.count(func.distinct(IoTTelemetry.device_id))).scalar() or 0

    # Device type breakdown
    breakdown_rows = (
        db.query(IoTTelemetry.device_type, func.count(IoTTelemetry.id))
        .group_by(IoTTelemetry.device_type)
        .all()
    )
    device_breakdown = {dtype: cnt for dtype, cnt in breakdown_rows}

    return IoTStatsResponse(
        total_readings=total_readings,
        total_anomalies=total_anomalies,
        active_devices=active_devices,
        device_breakdown=device_breakdown,
    )
