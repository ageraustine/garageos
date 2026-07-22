"""Quotation PDF generation with garage branding."""

from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import httpx


class QuotationPDFService:
    """Generate branded quotation PDFs."""

    def __init__(self):
        self.page_width, self.page_height = A4
        self.margin = 20 * mm

    def generate(
        self,
        chain_name: str,
        chain_display_name: str,
        branding: Optional[dict],
        currency: str,
        job_id: int,
        vehicle_plate: str,
        vehicle_make: str,
        vehicle_model: str,
        customer_name: Optional[str],
        customer_phone: Optional[str],
        services: List[dict],  # [{name, quotation_items: [{name, price, is_labor}]}]
        created_at: datetime,
    ) -> bytes:
        """Generate a quotation PDF and return as bytes."""
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin,
        )

        # Extract branding colors
        primary_color = colors.HexColor(branding.get("primary_color", "#1e3a5f")) if branding else colors.HexColor("#1e3a5f")
        accent_color = colors.HexColor(branding.get("accent_color", "#d4a72c")) if branding else colors.HexColor("#d4a72c")
        logo_url = branding.get("logo_url") if branding else None

        # Build styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "Title",
            parent=styles["Heading1"],
            fontSize=24,
            textColor=primary_color,
            alignment=TA_CENTER,
            spaceAfter=10 * mm,
        )
        subtitle_style = ParagraphStyle(
            "Subtitle",
            parent=styles["Normal"],
            fontSize=12,
            textColor=colors.grey,
            alignment=TA_CENTER,
            spaceAfter=5 * mm,
        )
        section_style = ParagraphStyle(
            "Section",
            parent=styles["Heading2"],
            fontSize=14,
            textColor=primary_color,
            spaceBefore=8 * mm,
            spaceAfter=4 * mm,
        )
        normal_style = ParagraphStyle(
            "NormalText",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.black,
        )
        bold_style = ParagraphStyle(
            "BoldText",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.black,
            fontName="Helvetica-Bold",
        )
        right_style = ParagraphStyle(
            "RightText",
            parent=styles["Normal"],
            fontSize=10,
            alignment=TA_RIGHT,
        )

        elements = []

        # Header with logo
        if logo_url:
            try:
                response = httpx.get(logo_url, timeout=5)
                if response.status_code == 200:
                    logo_buffer = BytesIO(response.content)
                    logo = Image(logo_buffer, width=40 * mm, height=15 * mm)
                    elements.append(logo)
                    elements.append(Spacer(1, 5 * mm))
            except Exception:
                pass  # Skip logo if unavailable

        # Title
        elements.append(Paragraph(chain_display_name, title_style))
        elements.append(Paragraph("QUOTATION", subtitle_style))
        elements.append(Spacer(1, 5 * mm))

        # Quotation metadata
        valid_until = created_at + timedelta(days=30)
        meta_data = [
            ["Quotation #:", f"Q-{job_id:06d}"],
            ["Date:", created_at.strftime("%d %B %Y")],
            ["Valid Until:", valid_until.strftime("%d %B %Y")],
        ]
        meta_table = Table(meta_data, colWidths=[50 * mm, 60 * mm])
        meta_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "LEFT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 8 * mm))

        # Customer & Vehicle info
        elements.append(Paragraph("Customer & Vehicle Details", section_style))
        info_data = [
            ["Vehicle:", f"{vehicle_make} {vehicle_model}"],
            ["Registration:", vehicle_plate],
        ]
        if customer_name:
            info_data.insert(0, ["Customer:", customer_name])
        if customer_phone:
            info_data.insert(1 if customer_name else 0, ["Phone:", customer_phone])

        info_table = Table(info_data, colWidths=[50 * mm, 100 * mm])
        info_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 8 * mm))

        # Services and quotation items
        elements.append(Paragraph("Services & Pricing", section_style))

        total = 0.0
        labor_total = 0.0
        parts_total = 0.0

        for svc in services:
            if not svc.get("quotation_items"):
                continue

            # Service name header
            elements.append(Paragraph(f"<b>{svc['name']}</b>", normal_style))
            elements.append(Spacer(1, 2 * mm))

            # Items table
            items_data = [["Item", "Type", f"Price ({currency})"]]
            for item in svc["quotation_items"]:
                item_type = "Labor" if item.get("is_labor") else "Parts"
                price = float(item.get("price", 0))
                total += price
                if item.get("is_labor"):
                    labor_total += price
                else:
                    parts_total += price

                items_data.append([
                    item["name"],
                    item_type,
                    f"{price:,.2f}",
                ])

            items_table = Table(items_data, colWidths=[90 * mm, 30 * mm, 40 * mm])
            items_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), primary_color),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (2, 0), (2, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 0.95, 0.95)]),
            ]))
            elements.append(items_table)
            elements.append(Spacer(1, 5 * mm))

        # Summary
        elements.append(Spacer(1, 5 * mm))
        summary_data = [
            ["", "Labor:", f"{currency} {labor_total:,.2f}"],
            ["", "Parts:", f"{currency} {parts_total:,.2f}"],
            ["", "TOTAL:", f"{currency} {total:,.2f}"],
        ]
        summary_table = Table(summary_data, colWidths=[80 * mm, 40 * mm, 40 * mm])
        summary_table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 2), (-1, 2), "Helvetica-Bold"),
            ("FONTSIZE", (1, 2), (-1, 2), 12),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("LINEABOVE", (1, 2), (-1, 2), 1, primary_color),
            ("TEXTCOLOR", (1, 2), (-1, 2), primary_color),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
        ]))
        elements.append(summary_table)

        # Footer
        elements.append(Spacer(1, 15 * mm))
        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.grey,
            alignment=TA_CENTER,
        )
        elements.append(Paragraph(
            "This quotation is valid for 30 days from the date of issue.<br/>"
            "Prices may vary based on actual work required.<br/>"
            f"Powered by GarageOS | {chain_display_name}",
            footer_style
        ))

        doc.build(elements)
        return buffer.getvalue()
