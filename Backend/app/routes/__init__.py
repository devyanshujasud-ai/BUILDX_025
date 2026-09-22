from app.routes.detection_routes import router as detection_router
from app.routes.pothole_routes import router as pothole_router
from app.routes.authority_routes import router as authority_router
from app.routes.ticket_routes import router as ticket_router
from app.routes.asset_routes import router as asset_router
from app.routes.issue_routes import router as issue_router
from app.routes.rfid_routes import router as rfid_router
from app.routes.iot_routes import router as iot_router
from app.routes.construction_routes import router as construction_router

__all__ = [
    "detection_router",
    "pothole_router",
    "authority_router",
    "ticket_router",
    "asset_router",
    "issue_router",
    "rfid_router",
    "iot_router",
    "construction_router",
]


