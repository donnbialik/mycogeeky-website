"""Regenerate the printable field cards with Python and ReportLab."""
import json
from pathlib import Path
from xml.sax.saxutils import escape

import reportlab
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
ACTIVITIES = json.loads((ROOT / "src/data/curiosityActivities.json").read_text())
OUTPUT = ROOT / "public/downloads/curiosity-field-cards.pdf"
URL = "https://mycoview.com/learn/lead-a-walk/"
FONT_DIR = Path(reportlab.__file__).parent / "fonts"
pdfmetrics.registerFont(TTFont("FieldSans", str(FONT_DIR / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("FieldSansBold", str(FONT_DIR / "VeraBd.ttf")))

INK = colors.HexColor("#201B15")
GREEN = colors.HexColor("#345B48")
LINE = colors.HexColor("#8E978D")

TITLE = ParagraphStyle("Title", fontName="FieldSansBold", fontSize=19, leading=22, textColor=INK)
BODY = ParagraphStyle("Body", fontName="FieldSans", fontSize=12, leading=16, textColor=INK)
LABEL = ParagraphStyle("Label", fontName="FieldSansBold", fontSize=9, leading=11, textColor=GREEN)
SMALL = ParagraphStyle("Small", fontName="FieldSans", fontSize=9, leading=11, textColor=INK)


def paragraph(pdf, text, style, x, top, width):
    item = Paragraph(escape(text), style)
    _, height = item.wrap(width, 1000)
    item.drawOn(pdf, x, top - height)
    return top - height


def qr_code(pdf, url, x, y, size):
    qr = QrCodeWidget(url, barWidth=size, barHeight=size, barBorder=4)
    drawing = Drawing(size, size)
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, x, y)
    pdf.linkURL(url, (x, y, x + size, y + size), relative=0, thickness=0)


def card(pdf, activity, x, y, width, height):
    padding = 20
    content_x = x + padding
    content_width = width - 2 * padding
    fold_y = y + 94

    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.8)
    pdf.rect(x, y, width, height)
    top = paragraph(pdf, "MYCOVIEW  |  CURIOSITY GENERATOR", LABEL, content_x, y + height - 17, content_width) - 7
    top = paragraph(pdf, activity["title"], TITLE, content_x, top, content_width) - 12

    # Keep the challenge and group instructions in a broad text column, with
    # the QR beside them. The strip below is revealed after the discussion.
    qr_size = 82
    text_width = content_width - qr_size - 18
    for label, key in [("THE CHALLENGE", "prompt"), ("TRY IT TOGETHER", "group"), ("DISCUSS", "discussion")]:
        top = paragraph(pdf, label, LABEL, content_x, top, text_width) - 3
        top = paragraph(pdf, activity[key], BODY, content_x, top, text_width) - 10
    if top < fold_y:
        raise ValueError(f"Card text overlaps fold: {activity['id']}")

    qr_x = x + width - padding - qr_size
    qr_y = y + height - 176
    qr_code(pdf, URL + "#" + activity["id"], qr_x, qr_y, qr_size)
    paragraph(pdf, "Online activity", SMALL, qr_x, qr_y - 4, qr_size)
    pdf.setFont("FieldSans", 8)
    pdf.setFillColor(INK)
    pdf.drawRightString(x + width - padding, fold_y + 9, "mycoview.com/learn/lead-a-walk/")

    pdf.setStrokeColor(LINE)
    pdf.setDash(4, 3)
    pdf.line(x, fold_y, x + width, fold_y)
    pdf.setDash()
    strip = paragraph(pdf, "FOLD HERE | REVEAL THE SCIENCE AFTER THE CHALLENGE", LABEL, content_x, fold_y - 12, content_width) - 6
    strip = paragraph(pdf, activity["insight"], BODY, content_x, strip, content_width)
    if strip < y + 12:
        raise ValueError(f"Science strip too tall: {activity['id']}")


def main():
    pdf = canvas.Canvas(str(OUTPUT), pagesize=letter, pageCompression=1, invariant=1)
    pdf.setTitle("MycoView Curiosity Generator - Field Cards")
    pdf.setAuthor("MycoView")
    page_w, page_h = letter
    margin = 30
    gap = 12
    height = (page_h - 2 * margin - gap) / 2
    width = page_w - 2 * margin
    for index, activity in enumerate(ACTIVITIES):
        y = page_h - margin - height if index % 2 == 0 else margin
        card(pdf, activity, margin, y, width, height)
        if index % 2 == 1 or index == len(ACTIVITIES) - 1:
            pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    main()
