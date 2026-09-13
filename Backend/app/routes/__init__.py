from app.routes.detection_routes import router as detection_router
from app.routes.pothole_routes import router as pothole_router
from app.routes.authority_routes import router as authority_router
from app.routes.ticket_routes import router as ticket_router

__all__ = ["detection_router", "pothole_router", "authority_router", "ticket_router"]
