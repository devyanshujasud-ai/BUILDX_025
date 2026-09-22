import os
import io
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.config import settings

class ReportService:
    def generate_pothole_pdf(self, pothole, authority) -> bytes:
        """Generates a downloadable official civic PDF report with evidence"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()

        # Custom header styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=10,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=14
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=10,
            spaceAfter=6
        )
        cell_style = ParagraphStyle(
            'CellText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12
        )

        # 1. Header
        story.append(Paragraph("CIVIC INFRASTRUCTURE INCIDENT REPORT", title_style))
        story.append(Paragraph(f"Official Automated Grievance Dispatch &bull; Generated {datetime.datetime.now().strftime('%d %b %Y %H:%M:%S UTC')}", subtitle_style))
        story.append(Spacer(1, 10))

        # 2. Metadata Table
        auth_name = authority.name if authority else "Municipal Corporation (Pending Allocation)"
        auth_email = authority.contact_email if authority else "roads@civic.gov"
        sla = f"{authority.sla_hours} Hours" if authority else "48 Hours"

        metadata = [
            [Paragraph("<b>Ticket Reference Code:</b>", cell_style), Paragraph(str(pothole.ticket_code), cell_style)],
            [Paragraph("<b>Current Status:</b>", cell_style), Paragraph(str(pothole.status), cell_style)],
            [Paragraph("<b>Severity Rating:</b>", cell_style), Paragraph(f"<font color='{'red' if pothole.severity in ['CRITICAL', 'HIGH'] else 'orange'}'><b>{pothole.severity}</b> (Score: {pothole.severity_score}/10)</font>", cell_style)],
            [Paragraph("<b>Responsible Civic Authority:</b>", cell_style), Paragraph(f"<b>{auth_name}</b> ({auth_email})", cell_style)],
            [Paragraph("<b>Resolution SLA Target:</b>", cell_style), Paragraph(sla, cell_style)],
            [Paragraph("<b>GPS Coordinates:</b>", cell_style), Paragraph(f"Latitude: {pothole.latitude:.5f}, Longitude: {pothole.longitude:.5f}", cell_style)],
            [Paragraph("<b>Street / Location:</b>", cell_style), Paragraph(f"{pothole.road_name or 'Arterial Road'}, {pothole.zone or ''}, {pothole.city or 'Nagpur'}", cell_style)],
            [Paragraph("<b>Road Classification:</b>", cell_style), Paragraph(str(pothole.road_type), cell_style)],
            [Paragraph("<b>AI Confidence:</b>", cell_style), Paragraph(f"{int(pothole.confidence * 100)}%", cell_style)],
            [Paragraph("<b>Detection Timestamp:</b>", cell_style), Paragraph(pothole.detected_at.strftime('%Y-%m-%d %H:%M:%S') if pothole.detected_at else "N/A", cell_style)],
        ]

        t = Table(metadata, colWidths=[160, 360])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(t)
        story.append(Spacer(1, 15))

        # 3. Evidence Images Section
        story.append(Paragraph("PHOTOGRAPHIC EVIDENCE & AI ANNOTATION", section_heading))
        
        # Check if local image file exists for embedding
        img_added = False
        img_rel_path = pothole.annotated_image_url or pothole.image_url
        if img_rel_path and img_rel_path.startswith("/uploads/"):
            filename = img_rel_path.replace("/uploads/", "")
            full_img_path = os.path.join(settings.UPLOAD_DIR, filename)
            if os.path.exists(full_img_path):
                try:
                    story.append(RLImage(full_img_path, width=420, height=240))
                    img_added = True
                except Exception as e:
                    story.append(Paragraph(f"Image placeholder: {filename}", cell_style))

        if not img_added:
            story.append(Paragraph(f"<b>Evidence URL:</b> {pothole.annotated_image_url or pothole.image_url}", cell_style))

        story.append(Spacer(1, 15))

        # 4. Mandatory Compliance Notice
        notice_text = """
        <b>CIVIC COMPLIANCE DIRECTIVE:</b> In accordance with Road Safety & Municipal Infrastructure Standards, 
        the designated authority must dispatch a rapid inspection unit to initiate patch/asphalt resurfacing within 
        the SLA limit. Status updates must be synchronized with the Central Monitoring Dashboard.
        """
        story.append(Paragraph(notice_text, cell_style))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

report_service = ReportService()
