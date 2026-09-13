# 🕳️ PotholeAI — Autonomous Road Defect Detection, GIS Geo-Routing & Civic Grievance Dispatch System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.109-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18.2-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite_5.4-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![YOLOv8](https://img.shields.io/badge/Vision_AI-Ultralytics_YOLOv8-00599C.svg?logo=yolo&logoColor=white)](https://ultralytics.com/)
[![Leaflet](https://img.shields.io/badge/GIS_Mapping-Leaflet_1.9-199900.svg?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS_3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_/_SQLite-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![ReportLab](https://img.shields.io/badge/PDF_Engine-ReportLab-D12424.svg)](https://www.reportlab.com/)

An enterprise-grade, end-to-end intelligent road infrastructure monitoring and governance platform. **PotholeAI** ingests visual road feeds (citizen uploads, dashcam footage, and live webcams), applies deep-learning computer vision to detect potholes and surface breakdown, computes quantitative severity indices, determines the precise civic jurisdiction via GIS polygon geofencing, automatically dispatches municipal grievance tickets, and manages repair lifecycles through an interactive civic Kanban system.

---

## 📑 Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Deep-Dive Module Breakdown](#3-deep-dive-module-breakdown)
   - [3.1 AI Computer Vision Pipeline](#31-ai-computer-vision-pipeline)
   - [3.2 Severity Scoring & Classification Mathematical Model](#32-severity-scoring--classification-mathematical-model)
   - [3.3 GIS Geo-Routing & Geofencing Engine](#33-gis-geo-routing--geofencing-engine)
   - [3.4 Automated Civic Dispatch & Ticket Generation](#34-automated-civic-dispatch--ticket-generation)
   - [3.5 Civic Resolution Kanban System](#35-civic-resolution-kanban-system)
   - [3.6 Official PDF Incident Report Generation](#36-official-pdf-incident-report-generation)
   - [3.7 Analytics & KPI Dashboard](#37-analytics--kpi-dashboard)
   - [3.8 Municipal Jurisdictions Directory](#38-municipal-jurisdictions-directory)
4. [File & Directory Architecture](#4-file--directory-architecture)
5. [Database Schema & Relational Models](#5-database-schema--relational-models)
6. [Complete REST API Reference](#6-complete-rest-api-reference)
7. [Storage Engine Architecture](#7-storage-engine-architecture)
8. [Environment Configuration & Variables](#8-environment-configuration--variables)
9. [Step-by-Step Installation & Setup](#9-step-by-step-installation--setup)
10. [Automated Testing & Quality Assurance](#10-automated-testing--quality-assurance)
11. [Troubleshooting & Frequently Asked Questions](#11-troubleshooting--frequently-asked-questions)
12. [License & Acknowledgements](#12-license--acknowledgements)

---

## 1. Executive Summary & Problem Statement

Road deterioration, fissures, and unpatched potholes cause billions of dollars in vehicular damages, severe traffic choke points, and life-threatening road accidents globally every year. In urban environments like Delhi-NCR, municipal grievance resolution suffers from systemic failure modes:
1. **Reporting Friction**: Citizens must navigate cumbersome municipal portals with ambiguous categories.
2. **Jurisdictional Confusion**: Roads are fragmented across different government bodies (e.g. MCD, PWD, NHAI, NDMC, DDA). Complaints submitted to the wrong department are typically discarded or stuck in multi-month bureaucratic queues.
3. **Lack of Severity Prioritization**: Road maintenance crews have no quantitative basis to triage hazardous potholes ahead of minor asphalt wear.
4. **Zero Verification Loop**: Work orders are marked closed without photographic proof or tamper-proof audit trails.

**PotholeAI solves this entire chain**:
- **Instant AI Detection**: Detects surface defects automatically in images, video clips, and live camera streams.
- **Accurate Geofencing**: Maps coordinates to the exact municipal division and road type automatically using spatial polygon intersection.
- **Immediate Dispatch**: Generates tickets with unique tracking identifiers, emails alerts to authorities, and compiles legal compliance PDF dossiers.
- **Transparent Lifecycle Tracking**: Enables civic authorities and citizens to track repairs from `Reported` to `Acknowledged`, `In Progress`, and `Resolved` with post-repair photo evidence.

---

## 2. High-Level System Architecture

```
                                  ┌────────────────────────────────────────┐
                                  │      Client Feeds & Citizen UI         │
                                  │   (Image Upload / Video / Webcam)      │
                                  └──────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                                  ┌────────────────────────────────────────┐
                                  │      React 18 + Vite Web App           │
                                  │  - Detection Studio + Leaflet Map      │
                                  │  - Civic Kanban Work List              │
                                  │  - Analytics Dashboard (Recharts)      │
                                  │  - Authority Directory                 │
                                  └──────────────────┬─────────────────────┘
                                                     │ HTTP REST (Axios)
                                                     ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       FastAPI Backend Services                                         │
│                                                                                                        │
│   ┌───────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────────────────┐   │
│   │    AI Vision Pipeline     │  │   GIS Geo-Routing Engine  │  │   Civic Dispatch & Tickets       │   │
│   │ - YOLOv8n Neural Network  │  │ - Shapely Point-in-Poly   │  │ - Automated Email Dispatch (SMTP)│   │
│   │ - OpenCV Surface Analyzer │  │ - OpenStreetMap Nominatim │  │ - Ticket Code Generator          │   │
│   │ - Severity Metric Engine  │  │ - Road Hierarchy Router   │  │ - ReportLab PDF Generator        │   │
│   └─────────────┬─────────────┘  └─────────────┬─────────────┘  └────────────────┬─────────────────┘   │
│                 │                              │                                 │                     │
│                 └──────────────────────────────┼─────────────────────────────────┘                     │
│                                                │                                                       │
│                                                ▼                                                       │
│                                  ┌───────────────────────────┐                                         │
│                                  │   SQLAlchemy 2.0 ORM      │                                         │
│                                  └─────────────┬─────────────┘                                         │
└────────────────────────────────────────────────┼───────────────────────────────────────────────────────┘
                                                 │
                                                 ├──► [ PostgreSQL / SQLite ] (potholes.db)
                                                 ├──► [ Local Media Directory ] (Backend/uploads/)
                                                 └──► [ AWS S3 Bucket ] (Optional Cloud Backup)
```

---

## 3. Deep-Dive Module Breakdown

### 3.1 AI Computer Vision Pipeline
| Severity Tier | Criteria | Color Code | Action Required |
|---|---|---|---|
| 🔴 **CRITICAL** | $R \ge 0.12$ or $S \ge 8.5$ | `#ef4444` (Red) | Immediate dispatch; structural hazard; emergency patch within 24h. |
| 🟠 **HIGH** | $R \ge 0.06$ or $S \ge 6.5$ | `#f97316` (Orange) | Severe tire/suspension hazard; schedule crew within 48h. |
| 🟡 **MEDIUM** | $R \ge 0.02$ or $S \ge 4.0$ | `#eab308` (Yellow) | Typical road pothole defect; routine maintenance within 72h. |
| 🟢 **LOW** | $R < 0.02$ and $S < 4.0$ | `#22c55e` (Green) | Surface wear / early cracking; monitor during periodic resurfacing. |

### 3.3 GIS Geo-Routing & Geofencing Engine
Located in `app/services/authority_service.py`, the routing engine resolves municipal jurisdiction automatically:
1. **EXIF GPS Extraction**: Automatically extracts latitude and longitude metadata from uploaded camera photos.
2. **Reverse Geocoding**: Queries OpenStreetMap Nominatim with caching and error handling to extract road name, suburb/zone, city, and detected road classification.
3. **Road Hierarchy Mapping**:
   - `NATIONAL_HIGHWAY` / Expressways $\to$ **National Highways Authority of India (NHAI)**.
   - `STATE_HIGHWAY` / Arterial Ring Roads / Flyovers $\to$ **Public Works Department (PWD Delhi)**.
4. **Spatial Polygon Geofencing**:
   - Utilizes `shapely.geometry.Point` and `shapely.geometry.Polygon` for point-in-polygon containment against registered municipal zones:
     - **NDMC**: Central VIP / Lutyens' Delhi corridor.
     - **MCD South**: South Delhi zones.
     - **MCD North**: North & North-West municipal divisions.
     - **MCD East**: Trans-Yamuna municipal divisions.
5. **Fallback Safety**: Gracefully routes to South Delhi Municipal Corporation or the nearest active civic authority if outside polygon boundaries.

### 3.4 Automated Civic Dispatch & Ticket Generation
- Automatically generates unique, human-readable incident tracking codes:
  $$\text{TKT}-\text{YYYYMMDD}-\langle\text{AUTHORITY\_CODE}\rangle-\langle\text{RANDOM\_4\_DIGITS}\rangle$$
  *(e.g., `TKT-20260913-MCD-S-8932`)*
- Prepares automated grievance emails and dispatch payloads containing incident coordinates, street address, defect count, severity rating, and media URLs.
- Dispatches emails through SMTP (e.g. Gmail SMTP) or emulates reliable delivery for staging/testing environments.

### 3.5 Civic Resolution Kanban System
Located in `Frontend/src/components/TicketKanban.jsx`:
- **Reported**: Automatically populated when a pothole is detected.
- **Acknowledged**: Road division logs the ticket into their work schedule.
- **In Progress**: Work teams deployed on-site with asphalt equipment.
- **Resolved & Closed**: Mandatory completion modal requiring:
  - Resolution notes (e.g. "Cold mix asphalt applied and rolled").
  - Post-repair photographic proof upload (stored as `resolution_image_url`).
- Records a complete, unalterable timeline in `pothole_status_history`.

### 3.6 Official PDF Incident Report Generation
Located in `app/services/report_service.py`:
- Built using **ReportLab** to generate official, downloadable legal compliance dossiers.
- Contains:
  - Incident reference metadata grid (Status, Ticket Code, Timestamp, Road Classification, Severity).
  - Assigned Civic Authority, official contact email, and target SLA.
  - Photographic Evidence: Embeds the AI-annotated defect image directly into the document.
  - Civic Compliance Directive notifying authorities of statutory road safety obligations.

### 3.7 Analytics & KPI Dashboard
Located in `Frontend/src/components/AnalyticsDashboard.jsx`:
- Real-time resolution rate indicator: $\frac{\text{Resolved}}{\text{Total}} \times 100\%$.
- Severity distribution breakdown rendered via **Recharts** interactive Pie Chart.
- Status breakdown across the repair lifecycle rendered via Recharts Bar Chart.
- Comparative Authority Workload Matrix showing total complaints, resolved counts, pending backlog, and SLA targets.

### 3.8 Municipal Jurisdictions Directory
Located in `Frontend/src/components/AuthorityDirectory.jsx`:
- Displays registered civic bodies: MCD (North, South, East), NDMC, PWD Delhi, NHAI, DDA, BBMP.
- Shows direct contact emails, emergency helpline numbers, resolution SLA timeframes, and active complaint counts.

---

## 4. File & Directory Architecture

```
Pothole Detection and Reporting System/
│
├── Backend/
│   ├── app/
│   │   ├── __init__.py                  # Application package identifier
│   │   ├── main.py                      # FastAPI instantiation, CORS, routers & startup hooks
│   │   ├── config.py                    # Pydantic Settings (.env configuration parser)
│   │   ├── database.py                  # SQLAlchemy engine, session maker & get_db dependency
│   │   ├── models/                      # SQLAlchemy ORM Data Models
│   │   │   ├── __init__.py
│   │   │   ├── pothole.py               # Pothole & PotholeStatusHistory tables
│   │   │   ├── authority.py             # CivicAuthority table
│   │   │   └── ticket.py                # CivicTicket table
│   │   ├── schemas/                     # Pydantic Schemas for Validation & Serialization
│   │   │   ├── __init__.py
│   │   │   ├── pothole_schema.py        # PotholeBase, PotholeResponse, StatusUpdate schemas
│   │   │   ├── authority_schema.py      # CivicAuthorityBase & Response schemas
│   │   │   └── ticket_schema.py         # CivicTicketResponse schema
│   │   ├── services/                    # Business Logic Layer
│   │   │   ├── __init__.py
│   │   │   ├── detection_service.py     # YOLOv8 inference, CV fallback, image annotator
│   │   │   ├── authority_service.py     # Shapely geofencing polygons & reverse geocoding
│   │   │   ├── notification_service.py  # SMTP email dispatcher & dispatch logging
│   │   │   ├── storage_service.py       # Dual-mode local file / AWS S3 media storage
│   │   │   └── report_service.py        # ReportLab incident PDF generator
│   │   └── routes/                      # API Endpoints
│   │       ├── __init__.py
│   │       ├── detection_routes.py      # /api/detect/image & /api/detect/video
│   │       ├── pothole_routes.py        # /api/potholes CRUD, status transitions, stats
│   │       ├── authority_routes.py      # /api/authorities list, get, lookup
│   │       └── ticket_routes.py         # /api/tickets list, PDF download, resend alert
│   │
│   ├── uploads/                         # Stored original, annotated, and repair images
│   ├── run.py                           # Server launcher script (uvicorn on port 8000)
│   ├── test_backend.py                  # Comprehensive automated test suite
│   ├── verify_s3_upload.py              # AWS S3 connectivity verification utility
│   ├── yolov8n.pt                       # Pre-trained YOLOv8 weights file
│   ├── requirements.txt                 # Backend Python package dependencies
│   ├── potholes.db                      # Local SQLite database file
│   └── .env                             # Environment variables & secrets
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Navigation header, logo, and live KPI badges
│   │   │   ├── DetectionStudio.jsx      # Multi-mode upload studio with interactive Leaflet map
│   │   │   ├── TicketKanban.jsx         # Drag-free column Kanban board with proof upload
│   │   │   ├── AnalyticsDashboard.jsx   # Charts & municipal performance breakdown
│   │   │   ├── AuthorityDirectory.jsx   # Civic authority directory cards
│   │   │   ├── PotholeDetailModal.jsx   # Modal for deep defect inspection & PDF download
│   │   │   └── SettingsModal.jsx        # Database & AWS connection inspection modal
│   │   ├── services/
│   │   │   └── api.js                   # Axios HTTP client & media URL resolution
│   │   ├── App.jsx                      # Primary layout & state coordinator
│   │   ├── main.jsx                     # Vite/React entry point
│   │   └── index.css                    # Tailwind CSS directives & global styling
│   │
│   ├── index.html                       # HTML5 template with Google Fonts
│   ├── package.json                     # Frontend npm dependencies & scripts
│   ├── vite.config.js                   # Vite configuration & proxy rules
│   ├── tailwind.config.js               # Tailwind CSS design system tokens
│   └── postcss.config.js                # PostCSS autoprefixer setup
│
└── README.md                            # Comprehensive technical documentation
```

---

## 5. Database Schema & Relational Models

mermaid
erDiagram
    CIVIC_AUTHORITY ||--o{ POTHOLE : "assigned_to"
    CIVIC_AUTHORITY ||--o{ CIVIC_TICKET : "receives"
    POTHOLE ||--o{ POTHOLE_STATUS_HISTORY : "has_audit_trail"
    POTHOLE ||--o{ CIVIC_TICKET : "generates"

    CIVIC_AUTHORITY {
        int id PK
        string name
        string code UK
        string department
        string contact_email
        string contact_phone
        int sla_hours
        string jurisdiction_type
        boolean active
    }

    POTHOLE {
        int id PK
        string ticket_code UK
        float latitude
        float longitude
        string road_name
        string road_type
        float confidence
        string severity
        float severity_score
        string status
        string image_url
        string annotated_image_url
        string resolution_image_url
        int authority_id FK
        datetime detected_at
        datetime resolved_at
    }

    POTHOLE_STATUS_HISTORY {
        int id PK
        int pothole_id FK
        string from_status
        string to_status
        string changed_by
        string notes
        datetime created_at
    }

    CIVIC_TICKET {
        int id PK
        string ticket_code UK
        int pothole_id FK
        int authority_id FK
        boolean email_sent
        string email_recipient
        string dispatch_log
        datetime created_at
    }
```

---

## 6. Complete REST API Reference

All routes are prefixed with `/api`. Interactive documentation is available at `http://localhost:8000/docs`.

### 6.1 Detection Endpoints (`/api/detect`)

#### `POST /api/detect/image`
Detects potholes in an uploaded image, resolves civic authority, and creates incident ticket.
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file` *(UploadFile, Required)*: JPEG/PNG image.
  - `latitude` *(float, Optional)*: GPS Latitude (auto-extracted from EXIF if omitted).
  - `longitude` *(float, Optional)*: GPS Longitude (auto-extracted from EXIF if omitted).
  - `road_type` *(string, Optional)*: `URBAN_ROAD`, `STATE_HIGHWAY`, `NATIONAL_HIGHWAY`, `RESIDENTIAL`.
  - `auto_report` *(bool, Default: `true`)*: Auto-creates database record and grievance ticket.
  - `reported_by` *(string, Default: `"AI Dashcam Feed"`)*: Reporter source label.
  - `notes` *(string, Optional)*: Additional remarks.
- **Response**:
```json
{
  "pothole_count": 1,
  "highest_severity": "CRITICAL",
  "average_confidence": 0.92,
  "bounding_boxes": [
    {
      "x1": 150.0, "y1": 250.0, "x2": 450.0, "y2": 480.0,
      "confidence": 0.92, "severity": "CRITICAL", "severity_score": 9.1,
      "box_area_ratio": 0.14, "class_name": "pothole"
    }
  ],
  "annotated_image_url": "/uploads/annotated_detection.jpg",
  "original_image_url": "/uploads/original_capture.jpg",
  "location_details": {
    "latitude": 28.5494, "longitude": 77.2528,
    "address": "Okhla Industrial Estate, New Delhi",
    "road_name": "Maa Anandmayee Marg", "zone": "South Delhi"
  },
  "suggested_authority": {
    "id": 2, "name": "MCD - South Delhi Municipal Corporation", "code": "MCD-S", "sla_hours": 48
  },
  "pothole_record": {
    "id": 42, "ticket_code": "TKT-20260913-MCD-S-8932", "status": "REPORTED"
  }
}


#### `POST /api/detect/video`
Processes video clips, sampling frames at intervals and aggregating unique defect detections.
- **Content-Type**: `multipart/form-data`
- **Parameters**: `file` (Video clip), `frame_interval` (int, default: 15), `latitude` (float), `longitude` (float).

---

### 6.2 Potholes Management (`/api/potholes`)

#### `GET /api/potholes`
Returns a paginated, filterable list of all reported potholes.
- **Query Filters**: `status`, `severity`, `authority_id`, `zone`, `search`, `limit` (default: 100), `offset`.

#### `GET /api/potholes/{id}`
Returns full incident record for a single defect, including assigned authority and timestamps.

#### `GET /api/potholes/{id}/status-history`
Returns chronological audit trail of status transitions for the defect.

#### `PATCH /api/potholes/{id}/status`
Transitions defect status (`REPORTED` $\to$ `ACKNOWLEDGED` $\to$ `IN_PROGRESS` $\to$ `RESOLVED`).
- **Body**:
```json
{
  "status": "IN_PROGRESS",
  "resolution_notes": "Repair team dispatched with cold asphalt mix.",
  "changed_by": "South MCD Field Officer"
}
```

#### `POST /api/potholes/{id}/resolution-proof`
Uploads post-repair photograph and marks the pothole as `RESOLVED`.
- **Content-Type**: `multipart/form-data`
- **Parameters**: `file` (UploadFile), `notes` (string, optional).

#### `DELETE /api/potholes/{id}`
Deletes a pothole record and cascades deletion to associated tickets and status histories.

#### `GET /api/potholes/stats/summary`
Returns KPI metrics:
```json
{
  "total_potholes": 18,
  "status_distribution": { "REPORTED": 5, "ACKNOWLEDGED": 4, "IN_PROGRESS": 3, "RESOLVED": 6 },
  "severity_distribution": { "CRITICAL": 4, "HIGH": 6, "MEDIUM": 5, "LOW": 3 },
  "resolution_rate_percent": 33.3,
  "authorities_breakdown": [ ... ]
}
```

---

### 6.3 Civic Authorities (`/api/authorities`)

#### `GET /api/authorities`
Returns all active civic departments with contact details and SLA targets.

#### `POST /api/authorities/lookup`
- **Query Parameters**: `lat` (float), `lng` (float), `road_type` (string).
- **Response**: Resolved authority using spatial geofencing and road hierarchy.

---

### 6.4 Civic Tickets & PDF Reports (`/api/tickets`)

#### `GET /api/tickets`
Returns history of dispatched grievance notifications and delivery logs.

#### `GET /api/tickets/{ticket_code}/download-pdf`
Generates and returns an official ReportLab PDF document with embedded defect image:
- **Response Header**: `Content-Type: application/pdf`
- **Filename**: `Incident_Report_TKT-XXXXXXXX.pdf`

#### `POST /api/tickets/{id}/resend-alert`
Re-triggers automated email/SMS dispatch for an existing ticket.

---

### 6.5 Configuration & Healthcheck

#### `GET /`
Returns root system health status, version, and AI model indicator.

#### `GET /api/config/status`
Reports current database connection type (PostgreSQL vs SQLite) and AWS S3 configuration readiness.

---

## 7. Storage Engine Architecture

The application implements a resilient **Dual-Tier Storage Strategy** in `app/services/storage_service.py`:

```
Incoming Media Bytes
        │
        ▼
[ Local Disk Save ] ──► Backend/uploads/<uuid>.jpg  (ALWAYS GUARANTEED)
        │
        ├── Served statically at: http://localhost:8000/uploads/<uuid>.jpg
        │
        ▼
Is USE_AWS_S3 = true?
  ├── YES ──► Uploads to s3://<bucket>/potholes/<uuid>.jpg
  │            ├── On Success: Returns S3 URL
  │            └── On Failure: Logs warning & falls back to local URL
  └── NO  ──► Returns local URL (/uploads/<uuid>.jpg)
```

The frontend client (`Frontend/src/services/api.js`) contains a smart `getMediaUrl()` resolver:
- Preserves `data:` and `blob:` preview URLs.
- Maps private S3 URLs to the local `/uploads/` proxy when S3 permissions are restricted.
- Automatically prepends `http://localhost:8000` to relative paths.
- Provides an SVG road defect placeholder if media is missing.

---

## 8. Environment Configuration & Variables

Configuration is loaded from `Backend/.env`:

```env
# Application Host & Port
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# Database Configuration
# Option A: PostgreSQL (Production)
DATABASE_URL=postgresql://postgres:password@localhost:5432/pothole_detection
# Option B: SQLite (Instant Zero-Config Demo)
# DATABASE_URL=sqlite:///./potholes.db

# Storage Engine (AWS S3 vs Local Uploads)
USE_AWS_S3=false
AWS_S3_FALLBACK_TO_LOCAL=true
AWS_S3_BUCKET_NAME=potholes-223
AWS_S3_UPLOAD_PREFIX=potholes
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Automated Email Notification (SMTP) - Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
NOTIFICATION_SENDER_EMAIL=alerts@civicroads.gov.in

# AI Model Inference Thresholds
MODEL_PATH=weights/yolov8_pothole.pt
CONFIDENCE_THRESHOLD=0.35
IOU_THRESHOLD=0.45
```

---

## 9. Step-by-Step Installation & Setup

### Prerequisites
- **Python 3.10+** (verify with `python --version` or `py -3.10 --version`)
- **Node.js 18+** & **npm** (verify with `node -v` and `npm -v`)
- (Optional) **PostgreSQL 14+** running locally, or use SQLite.

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/mr-rahulmahto/Food-Management-System.git "Pothole Detection and Reporting System"
cd "Pothole Detection and Reporting System"
```

---

### Step 2: Backend Setup & Launch
```bash
# Navigate to Backend folder
cd Backend

# Create a Python virtual environment (recommended)
py -3.10 -m venv venv

# Activate virtual environment:
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install all required Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend server
py -3.10 run.py
```
- API Server: **`http://localhost:8000`**
- Interactive Swagger API Documentation: **`http://localhost:8000/docs`**

---

### Step 3: Frontend Setup & Launch
Open a second terminal window:
```bash
# Navigate to Frontend folder
cd Frontend

# Install node dependencies
npm install

# Start the Vite development server
npm run dev
```
- Web Application: **`http://localhost:5173`**

---

## 10. Automated Testing & Quality Assurance

### Run Backend API Test Suite
The project contains an automated verification script that tests all API routes, AI detection, database transactions, and PDF compilation:

```bash
cd Backend
py -3.10 test_backend.py
```

**Validated Test Cases**:
1. ✅ **Root & Healthcheck**: Verifies API status and storage modes.
2. ✅ **Civic Authorities**: Validates retrieval of registered municipal divisions.
3. ✅ **Potholes Listing & Multi-criteria Filtering**: Verifies status, severity, and zone filters.
4. ✅ **Stats KPI Aggregation**: Verifies resolution rates and authority breakdowns.
5. ✅ **Official PDF Generation**: Generates and checks incident report PDF byte streams.
6. ✅ **GIS Geo-Routing Lookup**: Verifies GPS coordinate geofencing to authorities.

### Run Frontend Production Build Check
```bash
cd Frontend
npm run build
```
Builds the production bundle into `Frontend/dist/` verifying zero JSX/CSS/JS syntax errors.

---

## 11. Troubleshooting & Frequently Asked Questions

#### Q1: Defect images or thumbnails are not loading in the browser?
- **Solution**: The backend serves uploads statically at `http://localhost:8000/uploads/`. Ensure the Backend server is running. The frontend's `getMediaUrl()` function handles proxying and S3 fallback automatically.

#### Q2: Database connection fails on startup?
- **Solution**: If PostgreSQL is not installed or the service is stopped, switch to SQLite by setting in `Backend/.env`:
  ```env
  DATABASE_URL=sqlite:///./potholes.db
  ```
  Restart the backend server. The database tables will be created automatically.

#### Q3: How do I enable real email dispatches?
- **Solution**: Set valid SMTP credentials in `Backend/.env`:
  ```env
  SMTP_USER=your_email@gmail.com
  SMTP_PASSWORD=your_16_character_app_password
  ```
  If credentials are left blank, the system automatically runs in emulated mode, logging dispatch payloads without throwing connection errors.

#### Q4: Live Camera / Webcam feed is black or blocked?
- **Solution**: Ensure your browser has granted camera access to `http://localhost:5173`. Click the **Live Camera** tab in the Detection Studio to request browser media permissions.

#### Q5: Can I upload video files for automated processing?
- **Solution**: Yes. In the Detection Studio, select the **Video Analysis** tab, upload an MP4 clip, and the backend will sample frames, detect defects, and return annotated keyframes.

---

## 12. License & Acknowledgements

- **AI Model**: [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) (GPL-3.0 License).
- **Mapping**: [Leaflet.js](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/) contributors.
- **Icons**: [Lucide React](https://lucide.dev/).
- **Charts**: [Recharts](https://recharts.org/).
- **PDF Generation**: [ReportLab Open Source](https://www.reportlab.com/).

Developed with ❤️ for safer roads and accountable municipal governance.
