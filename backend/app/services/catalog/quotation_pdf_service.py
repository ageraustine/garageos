"""Quotation PDF generation with beautiful gold-themed garage branding."""

from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF
import httpx


# GarageOS Brand Colors
NAVY_900 = colors.HexColor("#0f172a")
NAVY_800 = colors.HexColor("#1e293b")
NAVY_700 = colors.HexColor("#334155")
NAVY_600 = colors.HexColor("#475569")
NAVY_500 = colors.HexColor("#64748b")
NAVY_100 = colors.HexColor("#f1f5f9")
NAVY_50 = colors.HexColor("#f8fafc")

GOLD_600 = colors.HexColor("#ca8a04")
GOLD_500 = colors.HexColor("#eab308")
GOLD_400 = colors.HexColor("#facc15")
GOLD_100 = colors.HexColor("#fef9c3")


class QuotationPDFService:
    """Generate beautifully branded quotation PDFs with gold theme."""

    def __init__(self):
        self.page_width, self.page_height = A4
        self.margin = 15 * mm

    def _create_header_banner(self, width: float, chain_name: str) -> Drawing:
        """Create a gold-accented header banner."""
        d = Drawing(width, 8 * mm)
        # Gold accent bar
        d.add(Rect(0, 0, width, 3 * mm, fillColor=GOLD_500, strokeColor=None))
        # Navy bar
        d.add(Rect(0, 3 * mm, width, 5 * mm, fillColor=NAVY_900, strokeColor=None))
        return d

    def _create_footer_banner(self, width: float) -> Drawing:
        """Create a gold-accented footer banner."""
        d = Drawing(width, 5 * mm)
        # Navy bar
        d.add(Rect(0, 2 * mm, width, 3 * mm, fillColor=NAVY_900, strokeColor=None))
        # Gold accent bar
        d.add(Rect(0, 0, width, 2 * mm, fillColor=GOLD_500, strokeColor=None))
        return d

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
        services: List[dict],
        created_at: datetime,
    ) -> bytes:
        """Generate a beautiful quotation PDF with gold theme."""
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin,
        )

        content_width = self.page_width - 2 * self.margin

        # Use branding colors if provided, otherwise default gold theme
        primary_color = NAVY_900
        accent_color = GOLD_500
        if branding:
            if branding.get("primary_color"):
                primary_color = colors.HexColor(branding["primary_color"])
            if branding.get("accent_color"):
                accent_color = colors.HexColor(branding["accent_color"])

        logo_url = branding.get("logo_url") if branding else None

        # Build styles
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "Title",
            parent=styles["Heading1"],
            fontSize=28,
            textColor=NAVY_900,
            alignment=TA_CENTER,
            spaceAfter=2 * mm,
            fontName="Helvetica-Bold",
        )

        subtitle_style = ParagraphStyle(
            "Subtitle",
            parent=styles["Normal"],
            fontSize=14,
            textColor=GOLD_600,
            alignment=TA_CENTER,
            spaceAfter=8 * mm,
            fontName="Helvetica-Bold",
            spaceBefore=0,
        )

        section_style = ParagraphStyle(
            "Section",
            parent=styles["Heading2"],
            fontSize=12,
            textColor=NAVY_900,
            spaceBefore=6 * mm,
            spaceAfter=3 * mm,
            fontName="Helvetica-Bold",
            borderPadding=0,
        )

        normal_style = ParagraphStyle(
            "NormalText",
            parent=styles["Normal"],
            fontSize=10,
            textColor=NAVY_700,
            leading=14,
        )

        label_style = ParagraphStyle(
            "LabelText",
            parent=styles["Normal"],
            fontSize=9,
            textColor=NAVY_500,
            fontName="Helvetica",
        )

        value_style = ParagraphStyle(
            "ValueText",
            parent=styles["Normal"],
            fontSize=10,
            textColor=NAVY_900,
            fontName="Helvetica-Bold",
        )

        elements = []

        # Header banner
        elements.append(self._create_header_banner(content_width, chain_display_name))
        elements.append(Spacer(1, 8 * mm))

        # Logo and title section
        header_table_data = []

        # Try to load logo
        logo_element = None
        if logo_url:
            try:
                response = httpx.get(logo_url, timeout=5)
                if response.status_code == 200:
                    logo_buffer = BytesIO(response.content)
                    logo_element = Image(logo_buffer, width=35 * mm, height=14 * mm)
            except Exception:
                pass

        # Company name and quotation title
        company_para = Paragraph(chain_display_name, title_style)
        quote_para = Paragraph("QUOTATION", subtitle_style)

        if logo_element:
            # Logo on left, title on right
            header_data = [[logo_element, [company_para, quote_para]]]
            header_table = Table(header_data, colWidths=[45 * mm, content_width - 45 * mm])
            header_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (0, 0), "LEFT"),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
            ]))
            elements.append(header_table)
        else:
            elements.append(company_para)
            elements.append(quote_para)

        # Gold divider line
        elements.append(HRFlowable(
            width="100%",
            thickness=2,
            color=GOLD_500,
            spaceBefore=5 * mm,
            spaceAfter=8 * mm,
        ))

        # Quotation info and vehicle info side by side
        valid_until = created_at + timedelta(days=30)

        quote_info = [
            [Paragraph("Quote Number", label_style), Paragraph(f"Q-{job_id:06d}", value_style)],
            [Paragraph("Date Issued", label_style), Paragraph(created_at.strftime("%d %B %Y"), value_style)],
            [Paragraph("Valid Until", label_style), Paragraph(valid_until.strftime("%d %B %Y"), value_style)],
        ]

        vehicle_info = []
        if customer_name:
            vehicle_info.append([Paragraph("Customer", label_style), Paragraph(customer_name, value_style)])
        if customer_phone:
            vehicle_info.append([Paragraph("Phone", label_style), Paragraph(customer_phone, value_style)])
        vehicle_info.append([Paragraph("Vehicle", label_style), Paragraph(f"{vehicle_make} {vehicle_model}".strip() or "N/A", value_style)])
        vehicle_info.append([Paragraph("Registration", label_style), Paragraph(vehicle_plate, value_style)])

        quote_table = Table(quote_info, colWidths=[35 * mm, 45 * mm])
        quote_table.setStyle(TableStyle([
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
        ]))

        vehicle_table = Table(vehicle_info, colWidths=[35 * mm, 50 * mm])
        vehicle_table.setStyle(TableStyle([
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
        ]))

        # Two column layout for info
        info_layout = Table(
            [[quote_table, vehicle_table]],
            colWidths=[content_width * 0.48, content_width * 0.52]
        )
        info_layout.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, -1), NAVY_50),
            ("BOX", (0, 0), (-1, -1), 1, NAVY_100),
            ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
        ]))
        elements.append(info_layout)
        elements.append(Spacer(1, 8 * mm))

        # Services and pricing
        total = 0.0
        labor_total = 0.0
        parts_total = 0.0

        for svc in services:
            if not svc.get("quotation_items"):
                continue

            # Service section header with gold accent
            service_header_data = [[
                Paragraph(f"<b>{svc['name']}</b>", ParagraphStyle(
                    "ServiceHeader",
                    fontSize=11,
                    textColor=NAVY_900,
                    fontName="Helvetica-Bold",
                ))
            ]]
            service_header = Table(service_header_data, colWidths=[content_width])
            service_header.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), GOLD_100),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
                ("LINEBELOW", (0, 0), (-1, -1), 2, GOLD_500),
            ]))
            elements.append(service_header)

            # Items table
            items_data = [[
                Paragraph("<b>Description</b>", ParagraphStyle("TH", fontSize=9, textColor=colors.white, fontName="Helvetica-Bold")),
                Paragraph("<b>Type</b>", ParagraphStyle("TH", fontSize=9, textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_CENTER)),
                Paragraph(f"<b>Amount ({currency})</b>", ParagraphStyle("TH", fontSize=9, textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            ]]

            for item in svc["quotation_items"]:
                item_type = "Labor" if item.get("is_labor") else "Parts"
                price = float(item.get("price", 0))
                total += price
                if item.get("is_labor"):
                    labor_total += price
                else:
                    parts_total += price

                items_data.append([
                    Paragraph(item["name"], normal_style),
                    Paragraph(item_type, ParagraphStyle("TD", fontSize=10, textColor=NAVY_600, alignment=TA_CENTER)),
                    Paragraph(f"{price:,.2f}", ParagraphStyle("TD", fontSize=10, textColor=NAVY_900, alignment=TA_RIGHT, fontName="Helvetica-Bold")),
                ])

            items_table = Table(items_data, colWidths=[content_width * 0.55, content_width * 0.20, content_width * 0.25])
            items_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), NAVY_800),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (1, 0), (1, -1), "CENTER"),
                ("ALIGN", (2, 0), (2, -1), "RIGHT"),
                ("GRID", (0, 1), (-1, -1), 0.5, NAVY_100),
                ("LINEBELOW", (0, 0), (-1, 0), 0, colors.white),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, NAVY_50]),
            ]))
            elements.append(items_table)
            elements.append(Spacer(1, 5 * mm))

        # Summary section with gold accent
        elements.append(Spacer(1, 3 * mm))

        summary_data = [
            ["", Paragraph("Labor", label_style), Paragraph(f"{currency} {labor_total:,.2f}", value_style)],
            ["", Paragraph("Parts & Materials", label_style), Paragraph(f"{currency} {parts_total:,.2f}", value_style)],
        ]

        summary_table = Table(summary_data, colWidths=[content_width * 0.50, content_width * 0.25, content_width * 0.25])
        summary_table.setStyle(TableStyle([
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
        ]))
        elements.append(summary_table)

        # Grand total with gold background
        total_data = [[
            "",
            Paragraph("<b>TOTAL</b>", ParagraphStyle("TotalLabel", fontSize=14, textColor=NAVY_900, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            Paragraph(f"<b>{currency} {total:,.2f}</b>", ParagraphStyle("TotalValue", fontSize=16, textColor=NAVY_900, fontName="Helvetica-Bold", alignment=TA_RIGHT)),
        ]]
        total_table = Table(total_data, colWidths=[content_width * 0.50, content_width * 0.25, content_width * 0.25])
        total_table.setStyle(TableStyle([
            ("BACKGROUND", (1, 0), (-1, -1), GOLD_100),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("LINEABOVE", (1, 0), (-1, 0), 3, GOLD_500),
        ]))
        elements.append(total_table)

        # Terms and conditions
        elements.append(Spacer(1, 10 * mm))

        terms_style = ParagraphStyle(
            "Terms",
            parent=styles["Normal"],
            fontSize=8,
            textColor=NAVY_500,
            leading=11,
        )

        terms_box_data = [[Paragraph(
            "<b>Terms & Conditions</b><br/>"
            "• This quotation is valid for 30 days from the date of issue.<br/>"
            "• Prices are subject to change based on actual work required upon inspection.<br/>"
            "• Payment is due upon completion of work unless otherwise agreed.<br/>"
            "• Warranty terms apply as per service agreement.",
            terms_style
        )]]
        terms_box = Table(terms_box_data, colWidths=[content_width])
        terms_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), NAVY_50),
            ("BOX", (0, 0), (-1, -1), 1, NAVY_100),
            ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ]))
        elements.append(terms_box)

        # Footer
        elements.append(Spacer(1, 8 * mm))
        elements.append(self._create_footer_banner(content_width))
        elements.append(Spacer(1, 3 * mm))

        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=8,
            textColor=NAVY_500,
            alignment=TA_CENTER,
        )
        elements.append(Paragraph(
            f"Thank you for choosing {chain_display_name}<br/>"
            "<b>Powered by GarageOS</b> — Trust Infrastructure for Auto Repair",
            footer_style
        ))

        doc.build(elements)
        return buffer.getvalue()
