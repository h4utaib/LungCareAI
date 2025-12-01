from flask import Blueprint, request, jsonify
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    Table,
    TableStyle,
)
from reportlab.lib.units import inch
from openai import OpenAI
from datetime import datetime
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import io
from config import OPENAI_API_KEY
import json

report_bp = Blueprint("report_api", __name__)
client = OpenAI(api_key=OPENAI_API_KEY)

# ============================================================
#                 REPORT GENERATION ROUTE
# ============================================================

@report_bp.route("/generate-report", methods=["POST"])
def generate_report():
    print("📥 /report/generate-report called")
    print("Received JSON:", request.json)
    try:
        data = request.json
        dl_result = data["dlResult"]
        medgemma_result = data["medgemmaResult"]
        patient = data["patient"]

        # ------------------------------
        # GPT PROMPT (RETURN PURE JSON)
        # ------------------------------
        prompt = f"""
You are helping generate the narrative text for a lung cancer AI screening report.

Return ONLY valid JSON with this exact structure (no extra text):

{{
  "executive_summary": "...",
  "risk_assessment": "...",
  "final_findings": "...",
  "next_steps": "...",
  "disclaimer": "..."
}}

Rules:
- Executive summary: general overview of the AI screening. Do NOT state a diagnosis.
- Risk assessment & final findings: base ONLY on these AI model outputs:
   -dont write risk assessment based on the executive summary or the user data but solely on the consensus analyses from both models
   - Deep Learning model diagnosis: "{dl_result['diagnosis_type']}" (confidence {dl_result['confidence']:.2f}%)
   - MedGemma model diagnosis: "{medgemma_result['diagnosis_type']}" (confidence {medgemma_result['confidence']:.2f}%)
- Do not invent diseases, probabilities, or treatment plans.
- Next steps: general, conservative clinical suggestions, reminding that only a clinician can diagnose.
- Disclaimer: clearly state that this report is AI-generated support information and not a medical diagnosis.
- Keep language clear and professional, suitable for a medical report.
"""

        response = client.responses.create(
            model="gpt-4.1",
            input=prompt,
        )

        raw_text = response.output_text.strip()

        # Parse JSON from model
        try:
            sections = json.loads(raw_text)
        except json.JSONDecodeError:
            # Fallback: if something goes wrong, put everything in executive_summary
            sections = {
                "executive_summary": raw_text,
                "risk_assessment": "",
                "final_findings": "",
                "next_steps": "",
                "disclaimer": "",
            }

        exec_summary = sections.get("executive_summary", "")
        risk_assessment = sections.get("risk_assessment", "")
        final_findings = sections.get("final_findings", "")
        next_steps = sections.get("next_steps", "")
        disclaimer = sections.get("disclaimer", "")

        # ============================================================
        #                      BUILD NICE PDF
        # ============================================================

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=50,
            rightMargin=50,
            topMargin=60,
            bottomMargin=60,
        )

        styles = getSampleStyleSheet()

        # ---- Minimalist Grey/Black Styles ----
        styles.add(ParagraphStyle(
    name="CustomTitle",
    parent=styles["Heading1"],
    fontSize=24,
    textColor=colors.HexColor("#111827"),
    alignment=1,
    spaceAfter=18,
))

        styles.add(ParagraphStyle(
    name="CustomSectionHeader",
    parent=styles["Heading2"],
    fontSize=14,
    textColor=colors.HexColor("#111827"),
    backColor=colors.HexColor("#e5e7eb"),
    leftIndent=0,
    rightIndent=0,
    spaceBefore=18,
    spaceAfter=8,
    leading=16,
    padding=6,
))

        styles.add(ParagraphStyle(
    name="CustomBodyText",
    parent=styles["BodyText"],
    fontSize=11,
    leading=15,
    textColor=colors.HexColor("#374151"),
))


        story = []

        # ---- Title + top rule ----
        story.append(Paragraph("LUNG CANCER AI DIAGNOSTIC REPORT", styles["CustomTitle"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#9ca3af")))
        story.append(Spacer(1, 0.2 * inch))

        # ============================================================
        # PATIENT INFORMATION (TABLE)
        # ============================================================
        story.append(Paragraph("Patient Information", styles["CustomSectionHeader"]))
        story.append(Spacer(1, 0.05 * inch))

        patient_rows = [
            ["Name", patient.get("name", "")],
            ["Age", str(patient.get("age", ""))],
            ["Gender", patient.get("gender", "")],
            ["Medical Conditions", patient.get("medical_conditions", "")],
            ["Patient History", patient.get("patient_history", "")],
        ]

        patient_table = Table(patient_rows, colWidths=[1.8 * inch, 4.7 * inch])
        patient_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),   # left column light grey
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#9ca3af")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(patient_table)
        story.append(Spacer(1, 0.25 * inch))

        # ============================================================
        # AI MODEL FINDINGS (TABLE)
        # ============================================================
        story.append(Paragraph("AI Model Findings", styles["CustomSectionHeader"]))
        story.append(Spacer(1, 0.05 * inch))

        ai_rows = [
            ["Model", "Diagnosis", "Confidence"],
            ["Deep Learning", dl_result["diagnosis_type"], f"{dl_result['confidence']:.2f}%"],
            ["MedGemma", medgemma_result["diagnosis_type"], f"{medgemma_result['confidence']:.2f}%"],
        ]

        ai_table = Table(ai_rows, colWidths=[1.8 * inch, 3.0 * inch, 1.7 * inch])
        ai_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e5e7eb")),  # header row
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 10),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#9ca3af")),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(ai_table)
        story.append(Spacer(1, 0.25 * inch))

        # ============================================================
        # NARRATIVE SECTIONS
        # ============================================================

        def add_section(title, text):
            if not text:
                return
            story.append(Paragraph(title, styles["CustomSectionHeader"]))
            story.append(Spacer(1, 0.05 * inch))
            story.append(Paragraph(text, styles["CustomBodyText"]))
            story.append(Spacer(1, 0.2 * inch))

        add_section("1. Executive Summary", exec_summary)
        add_section("2. Risk Assessment (AI-Based Only)", risk_assessment)
        add_section("3. Final Combined Findings", final_findings)
        add_section("4. Recommended Next Steps", next_steps)
        add_section("5. Disclaimer", disclaimer)

        # Build PDF
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        filename = f"Diagnosis_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return jsonify({"pdf": pdf_bytes.hex(), "filename": filename})

    except Exception as e:
        import traceback
        print("🔥 FULL TRACEBACK (REPORT ERROR):")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ============================================================
#                    SEND EMAIL ROUTE
# ============================================================

@report_bp.route("/send-report-email", methods=["POST"])
def send_report_email():
    try:
        data = request.json
        recipient = data["email"]
        pdf_hex = data["pdf"]
        filename = data["filename"]

        pdf_bytes = bytes.fromhex(pdf_hex)

        msg = MIMEMultipart()
        msg["From"] = "muhammadhutaib10c16652@gmail.com"
        msg["To"] = recipient
        msg["Subject"] = f"Lung Cancer AI Report - {datetime.now().strftime('%Y-%m-%d')}"

        msg.attach(MIMEText("Please find attached your AI diagnosis report.", "plain"))

        part = MIMEBase("application", "pdf")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f"attachment; filename={filename}")
        msg.attach(part)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login("muhammadhutaib10c16652@gmail.com", "jirz uhnd uuuo rabj")
        server.send_message(msg)
        server.quit()

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
