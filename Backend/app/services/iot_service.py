from typing import Dict, Any, Tuple, Optional
from app.models.issue import IssueTypeEnum, IssueSeverityEnum

class IoTAnomalyService:
    @staticmethod
    def evaluate_telemetry(
        device_type: str, data: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Optional[str], Optional[str], Optional[str]]:
        """
        Evaluates raw ESP32 sensor telemetry for abnormal conditions.

        Returns:
            (is_anomaly, anomaly_reason, severity, issue_type, issue_description)
        """
        dtype = device_type.upper().strip()

        # 1. STREETLIGHT (lux, motion, current)
        if dtype == "STREETLIGHT":
            lux = float(data.get("lux", 50.0))
            motion = int(data.get("motion", 0))
            current = float(data.get("current", 0.0))

            # Lamp failure: Dark or motion active, but no current flowing
            if (lux < 30.0 or motion == 1) and current <= 0.05:
                return (
                    True,
                    f"Streetlight luminaire failure: low ambient light ({lux} lux) or motion active, but zero current ({current}A) detected.",
                    IssueSeverityEnum.HIGH.value,
                    IssueTypeEnum.STREETLIGHT.value,
                    f"Automated IoT Alert: Streetlight lamp not illuminating during active demand (Lux: {lux}, Current: {current}A)."
                )

            # Electrical surge / short
            if current > 3.0:
                return (
                    True,
                    f"Dangerous electrical overcurrent detected ({current}A > 3.0A safe threshold).",
                    IssueSeverityEnum.CRITICAL.value,
                    IssueTypeEnum.STREETLIGHT.value,
                    f"Automated IoT Alert: Overcurrent surge on streetlight line ({current}A)."
                )

            # Daytime burning (energy wastage)
            if lux > 200.0 and current > 0.5:
                return (
                    True,
                    f"Daytime burning fault: broad daylight ({lux} lux) but luminaire drawing {current}A.",
                    IssueSeverityEnum.MEDIUM.value,
                    IssueTypeEnum.STREETLIGHT.value,
                    f"Automated IoT Alert: Day-burning streetlight detected (Lux: {lux}, Current: {current}A)."
                )

            return (False, None, None, None, None)

        # 2. POTHOLE_NODE (ir_distance, acceleration, latitude, longitude)
        elif dtype in ["POTHOLE_NODE", "POTHOLE", "ROAD_NODE"]:
            ir_distance = float(data.get("ir_distance", 5.0))  # in cm
            acceleration = float(data.get("acceleration", 0.1))  # in Gs

            # Significant vehicular impact shock
            if acceleration >= 2.5:
                return (
                    True,
                    f"Severe vehicular impact shock detected: {acceleration}g acceleration spike exceeding safe threshold (2.5g).",
                    IssueSeverityEnum.CRITICAL.value,
                    IssueTypeEnum.POTHOLE.value,
                    f"Automated IoT Alert: High shock road impact ({acceleration}g) registered by chassis/road sensor node."
                )

            # Surface cavity / depth depression
            if ir_distance >= 15.0:
                return (
                    True,
                    f"Road surface void / cavity detected: ultrasonic/IR sensor measured {ir_distance}cm depth (> 15cm threshold).",
                    IssueSeverityEnum.HIGH.value,
                    IssueTypeEnum.POTHOLE.value,
                    f"Automated IoT Alert: Road asphalt cavity of {ir_distance}cm detected by infra node."
                )

            return (False, None, None, None, None)

        # 3. DUSTBIN (fill_level)
        elif dtype in ["DUSTBIN", "SMART_BIN", "WASTE_BIN"]:
            fill_level = float(data.get("fill_level", 0.0))  # in %

            if fill_level >= 85.0:
                severity = IssueSeverityEnum.CRITICAL.value if fill_level >= 95.0 else IssueSeverityEnum.HIGH.value
                return (
                    True,
                    f"Municipal dustbin overflow condition: container volume reached {fill_level}% capacity.",
                    severity,
                    IssueTypeEnum.DUSTBIN.value,
                    f"Automated IoT Alert: Smart dustbin reached {fill_level}% fill capacity. Immediate clearance required."
                )

            return (False, None, None, None, None)

        # Generic / Other device types
        return (False, None, None, None, None)

iot_service = IoTAnomalyService()
