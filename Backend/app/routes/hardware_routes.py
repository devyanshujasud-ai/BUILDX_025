"""
ESP32 Hardware Integration — Unified Sync Endpoint

Receives a single JSON payload from the ESP32 every 2-5 seconds containing
ALL sensor states (streetlight, dustbin, pothole, RFID) and routes each
sub-system to the existing IoT telemetry and RFID maintenance services.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asset import Asset
from app.models.issue import InfrastructureIssue, IssueStatusEnum
from app.models.iot_telemetry import IoTTelemetry
from app.models.worker import Worker, MaintenanceTask
from app.services.iot_service import iot_service
from app.services.priority_service import priority_service

router = APIRouter(prefix="/api/hardware", tags=["ESP32 Hardware Integration"])

# ──────────────────────────────────────────────────────────────────
# In-Memory Device State (lightweight, no extra DB table needed)
# ──────────────────────────────────────────────────────────────────

_device_state: Dict[str, Any] = {}
_event_log: List[Dict[str, Any]] = []
MAX_EVENTS = 100

# ──────────────────────────────────────────────────────────────────
# RFID UID Mapping: Hardware UID → Software RFID UID
# ──────────────────────────────────────────────────────────────────

RFID_HW_TO_SW = {
    "B3:3D:02:04": "RFID-NGP-7701",  # Ramesh Patil
    "CD:3E:C8:01": "RFID-NGP-8802",  # Sunil Deshmukh
}

# ──────────────────────────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────────────────────────

class StreetlightPayload(BaseModel):
    is_night: bool = False
    light_on: bool = False
    fault_detected: bool = False
    ldr_feedback: int = 0

class DustbinPayload(BaseModel):
    distance_inches: float = -1
    is_full: bool = False

class PotholePayload(BaseModel):
    total_count: int = 0
    major_count: int = 0
    normal_count: int = 0
    last_detection: Optional[str] = None  # "MAJOR" | "NORMAL" | None
    acceleration: float = 0.0
    deviation: float = 0.0

class RFIDPayload(BaseModel):
    card_detected: bool = False
    uid: Optional[str] = None
    worker_name: Optional[str] = None
    action: Optional[str] = None  # "IN" | "OUT"
    work_duration: Optional[str] = None

class HardwareSyncRequest(BaseModel):
    device_id: str = Field("ESP32-NAGPUR-001", description="Unique hardware device identifier")
    streetlight: Optional[StreetlightPayload] = None
    dustbin: Optional[DustbinPayload] = None
    pothole: Optional[PotholePayload] = None
    rfid: Optional[RFIDPayload] = None
    uptime_seconds: int = 0

class HardwareSyncResponse(BaseModel):
    status: str
    message: str
    events_created: int = 0
    anomalies_detected: int = 0
    timestamp: str

# ──────────────────────────────────────────────────────────────────
# Helper: Add event to in-memory log
# ──────────────────────────────────────────────────────────────────

def _add_event(event_type: str, severity: str, message: str, data: Dict = None):
    event = {
        "id": len(_event_log) + 1,
        "type": event_type,
        "severity": severity,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _event_log.insert(0, event)
    if len(_event_log) > MAX_EVENTS:
        _event_log.pop()

# ──────────────────────────────────────────────────────────────────
# POST /api/hardware/sync — Main ESP32 Sync Endpoint
# ──────────────────────────────────────────────────────────────────

@router.post("/sync", response_model=HardwareSyncResponse)
def hardware_sync(payload: HardwareSyncRequest, db: Session = Depends(get_db)):
    """
    Unified ESP32 hardware sync endpoint.
    Receives all sensor states in one JSON POST and routes each sub-system
    to existing IoT telemetry and RFID services.
    """
    now = datetime.now(timezone.utc)
    events_created = 0
    anomalies_detected = 0

    # Update device state
    _device_state[payload.device_id] = {
        "device_id": payload.device_id,
        "last_heartbeat": now.isoformat(),
        "uptime_seconds": payload.uptime_seconds,
        "online": True,
        "streetlight": payload.streetlight.model_dump() if payload.streetlight else {},
        "dustbin": payload.dustbin.model_dump() if payload.dustbin else {},
        "pothole": payload.pothole.model_dump() if payload.pothole else {},
        "rfid": {},
    }

    # ── 1. STREETLIGHT ──────────────────────────────────────────
    if payload.streetlight:
        sl = payload.streetlight
        # Find a streetlight asset
        sl_asset = db.query(Asset).filter(Asset.type == "STREETLIGHT").first()
        if sl_asset:
            # Build IoT-compatible data dict
            lux = 10.0 if sl.is_night else 300.0
            current = 0.0 if sl.fault_detected else (0.8 if sl.light_on else 0.0)
            motion = 1 if sl.is_night else 0

            iot_data = {
                "lux": lux,
                "current": current,
                "motion": motion,
                "ldr_feedback": sl.ldr_feedback,
                "is_night": sl.is_night,
                "light_on": sl.light_on,
                "fault_detected": sl.fault_detected,
            }

            is_anomaly, anomaly_reason, severity, issue_type, issue_desc = \
                iot_service.evaluate_telemetry("STREETLIGHT", iot_data)

            # If hardware reports fault but IoT service didn't catch it,
            # override to flag it
            if sl.fault_detected and not is_anomaly:
                is_anomaly = True
                anomaly_reason = f"Hardware LDR feedback fault detected (feedback={sl.ldr_feedback})"
                severity = "HIGH"
                issue_type = "STREETLIGHT"
                issue_desc = f"ESP32 streetlight fault: LED not working (LDR feedback={sl.ldr_feedback})"

            if is_anomaly:
                anomalies_detected += 1
                _add_event("STREETLIGHT_FAULT", severity or "HIGH",
                           anomaly_reason or "Streetlight fault detected",
                           {"ldr_feedback": sl.ldr_feedback, "fault": sl.fault_detected})

            # Store telemetry
            telemetry = IoTTelemetry(
                device_id=payload.device_id,
                asset_id=sl_asset.id,
                device_type="STREETLIGHT",
                timestamp=now,
                data=iot_data,
                is_anomaly=is_anomaly,
                anomaly_reason=anomaly_reason,
            )
            db.add(telemetry)
            events_created += 1

    # ── 2. DUSTBIN ──────────────────────────────────────────────
    if payload.dustbin:
        dbin = payload.dustbin
        db_asset = db.query(Asset).filter(Asset.type == "DUSTBIN").first()
        if db_asset:
            # Convert distance to fill level percentage
            # Bin is 6 inches high; if distance is 0-6 inches
            bin_height = 6.0
            distance = max(0, min(dbin.distance_inches, bin_height))
            fill_level = max(0, min(100, round(((bin_height - distance) / bin_height) * 100, 1)))

            iot_data = {
                "fill_level": fill_level,
                "distance_inches": dbin.distance_inches,
                "is_full": dbin.is_full,
            }

            is_anomaly, anomaly_reason, severity, issue_type, issue_desc = \
                iot_service.evaluate_telemetry("DUSTBIN", iot_data)

            # Hardware already computed full → override if needed
            if dbin.is_full and not is_anomaly:
                is_anomaly = True
                anomaly_reason = f"Dustbin FULL: distance {dbin.distance_inches:.1f}\" (threshold 5.0\")"
                severity = "HIGH"
                issue_type = "DUSTBIN"
                issue_desc = f"ESP32 dustbin overflow: distance={dbin.distance_inches:.1f} inches"

            if is_anomaly:
                anomalies_detected += 1
                _add_event("DUSTBIN_FULL", severity or "HIGH",
                           anomaly_reason or "Dustbin overflow detected",
                           {"fill_level": fill_level, "distance": dbin.distance_inches})

            telemetry = IoTTelemetry(
                device_id=payload.device_id,
                asset_id=db_asset.id,
                device_type="DUSTBIN",
                timestamp=now,
                data=iot_data,
                is_anomaly=is_anomaly,
                anomaly_reason=anomaly_reason,
            )
            db.add(telemetry)
            events_created += 1

    # ── 3. POTHOLE ──────────────────────────────────────────────
    if payload.pothole:
        ph = payload.pothole
        rd_asset = db.query(Asset).filter(Asset.type == "ROAD_SEGMENT").first()
        if rd_asset:
            iot_data = {
                "acceleration": ph.acceleration,
                "ir_distance": ph.deviation,
                "total_count": ph.total_count,
                "major_count": ph.major_count,
                "normal_count": ph.normal_count,
                "last_detection": ph.last_detection,
            }

            # Only flag anomaly if a new detection just happened
            is_anomaly = False
            anomaly_reason = None
            severity = None

            if ph.last_detection == "MAJOR":
                is_anomaly = True
                anomaly_reason = f"MAJOR pothole detected by MPU6050: acceleration deviation {ph.deviation:.1f}g"
                severity = "CRITICAL"
                _add_event("POTHOLE_MAJOR", "CRITICAL",
                           f"Major pothole detected (MPU6050 shock {ph.deviation:.1f}g)",
                           {"total": ph.total_count, "major": ph.major_count})
                anomalies_detected += 1
            elif ph.last_detection == "NORMAL":
                is_anomaly = True
                anomaly_reason = f"Normal pothole detected by IR sensor"
                severity = "HIGH"
                _add_event("POTHOLE_NORMAL", "HIGH",
                           f"Pothole detected (IR sensor)",
                           {"total": ph.total_count, "normal": ph.normal_count})
                anomalies_detected += 1

            telemetry = IoTTelemetry(
                device_id=payload.device_id,
                asset_id=rd_asset.id,
                device_type="POTHOLE_NODE",
                timestamp=now,
                data=iot_data,
                is_anomaly=is_anomaly,
                anomaly_reason=anomaly_reason,
            )
            db.add(telemetry)
            events_created += 1

    # ── 4. RFID ─────────────────────────────────────────────────
    if payload.rfid and payload.rfid.card_detected and payload.rfid.uid:
        rfid = payload.rfid
        hw_uid = rfid.uid.strip().upper()
        sw_uid = RFID_HW_TO_SW.get(hw_uid)

        rfid_event_data = {
            "hw_uid": hw_uid,
            "sw_uid": sw_uid,
            "worker_name": rfid.worker_name,
            "action": rfid.action,
            "work_duration": rfid.work_duration,
        }
        _device_state[payload.device_id]["rfid"] = rfid_event_data

        if sw_uid:
            worker = db.query(Worker).filter(Worker.rfid_uid == sw_uid, Worker.active == True).first()
            if worker:
                action_label = "Clock-IN" if rfid.action == "IN" else "Clock-OUT"
                _add_event(
                    "RFID_SCAN", "INFO",
                    f"{worker.name} ({worker.role}) — {action_label}",
                    rfid_event_data,
                )
                events_created += 1
        else:
            _add_event(
                "RFID_INVALID", "WARNING",
                f"Unknown RFID card scanned: {hw_uid}",
                rfid_event_data,
            )
            events_created += 1

    # ── COMMIT ──────────────────────────────────────────────────
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit failed: {str(e)}")

    return HardwareSyncResponse(
        status="OK",
        message=f"Synced {events_created} sensor readings, {anomalies_detected} anomalies detected",
        events_created=events_created,
        anomalies_detected=anomalies_detected,
        timestamp=now.isoformat(),
    )


# ──────────────────────────────────────────────────────────────────
# GET /api/hardware/status — Device Health Dashboard
# ──────────────────────────────────────────────────────────────────

@router.get("/status")
def get_hardware_status():
    """
    Returns the current state of all connected ESP32 devices.
    Used by the frontend Hardware Monitor dashboard for real-time display.
    """
    devices = []
    now = datetime.now(timezone.utc)

    for device_id, state in _device_state.items():
        last_hb = state.get("last_heartbeat", "")
        try:
            last_hb_dt = datetime.fromisoformat(last_hb)
            seconds_ago = (now - last_hb_dt).total_seconds()
            online = seconds_ago < 15  # Consider offline after 15 seconds
        except Exception:
            online = False
            seconds_ago = -1

        devices.append({
            **state,
            "online": online,
            "last_seen_seconds_ago": round(seconds_ago, 1),
        })

    return {
        "total_devices": len(devices),
        "online_devices": sum(1 for d in devices if d.get("online")),
        "devices": devices,
        "server_time": now.isoformat(),
    }


# ──────────────────────────────────────────────────────────────────
# GET /api/hardware/events — Recent Hardware Events
# ──────────────────────────────────────────────────────────────────

@router.get("/events")
def get_hardware_events(limit: int = Query(50, ge=1, le=100)):
    """
    Returns the most recent hardware events from all connected ESP32 devices.
    """
    return {
        "total_events": len(_event_log),
        "events": _event_log[:limit],
    }


# ──────────────────────────────────────────────────────────────────
# GET /api/hardware/rfid-map — RFID UID Mapping Reference
# ──────────────────────────────────────────────────────────────────

@router.get("/rfid-map")
def get_rfid_mapping():
    """Returns the hardware-to-software RFID UID mapping for reference."""
    return {
        "mappings": [
            {"hardware_uid": hw, "software_uid": sw, "description": f"Maps RC522 card {hw} → Worker {sw}"}
            for hw, sw in RFID_HW_TO_SW.items()
        ]
    }
