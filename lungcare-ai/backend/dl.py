# -------------------------------------------------
#  DL API (Deep Learning Server)
# -------------------------------------------------
from flask import Flask, request, jsonify
from flask_cors import CORS

import numpy as np
import os, gc
from datetime import datetime

# TensorFlow & Models
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.resnet50 import preprocess_input as resnet_preprocess
from tensorflow.keras.applications.densenet import preprocess_input as densenet_preprocess

# MySQL
import mysql.connector
from mysql.connector import Error

# Blueprint (Report Generation)
from report_api import report_bp


# -------------------------------------------------
#  INIT FLASK
# -------------------------------------------------
app = Flask(__name__)
CORS(app)

# Register Blueprints
app.register_blueprint(report_bp, url_prefix="/report")

print("🔹 Loaded Blueprints:", app.blueprints)

# -------------------------------------------------
#  DATABASE CONNECTION
# -------------------------------------------------
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="lung_user",
        password="gymhw6xf",
        database="lung_ai"
    )


# -------------------------------------------------
#  LOAD MODELS
# -------------------------------------------------
ResNet_Path = "/Users/muhammadhutaib/Documents/folder/chest_CT_SCAN-ResNet50.keras"
DenseNet_Path = "/Users/muhammadhutaib/Documents/folder/chest_CT_SCAN-DenseNet201.keras"

print("🔹 Loading AI Models...")
ResNet_model = load_model(ResNet_Path)
DenseNet_model = load_model(DenseNet_Path)
print("✅ Deep Learning Models Loaded Successfully")

# Labels
classes = ["Adenocarcinoma", "Large cell carcinoma", "Normal", "Squamous cell carcinoma"]

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# -------------------------------------------------
#  PREDICTION HELPERS
# -------------------------------------------------
def predict_class(img_array):
    """Run ResNet50 and DenseNet201 and return the strongest prediction."""

    # ---- ResNet ----
    res_input = resnet_preprocess(img_array.copy())
    res_pred = ResNet_model.predict(res_input)
    res_conf = float(np.max(res_pred))
    res_idx = int(np.argmax(res_pred))

    # ---- DenseNet ----
    dense_input = densenet_preprocess(img_array.copy())
    dense_pred = DenseNet_model.predict(dense_input)
    dense_conf = float(np.max(dense_pred))
    dense_idx = int(np.argmax(dense_pred))

    # Pick stronger model
    if res_conf >= dense_conf:
        return res_idx, "ResNet50", res_conf
    else:
        return dense_idx, "DenseNet201", dense_conf


# -------------------------------------------------
#  API: ANALYZE IMAGE (DL)
# -------------------------------------------------
@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]

        # Save image
        filepath = os.path.join(UPLOAD_DIR, file.filename)
        file.save(filepath)

        # Load image
        img = image.load_img(filepath, target_size=(460, 460))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)

        # Predict using DL models
        pred_idx, model_used, confidence = predict_class(img_array)

        label = classes[pred_idx]
        normalized_label = label.lower().strip().replace(" ", "_").replace(".", "_")

        image_url = file.filename

        # Save in DB
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO diagnoses (image_url, diagnosis_type, method, confidence)
                VALUES (%s, %s, %s, %s)
            """, (image_url, normalized_label, "deep_learning", confidence))
            conn.commit()
            cursor.close()
            conn.close()
        except Error as e:
            print("❌ Database Insert Error:", e)

        return jsonify({
            "classification": normalized_label,
            "confidence": confidence,
            "image_url": image_url,
            "method": "deep_learning"
        })

    except Exception as e:
        print("❌ Analyze Error:", e)
        gc.collect()
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------
#  API: GET ALL DIAGNOSES
# -------------------------------------------------
@app.route("/diagnoses", methods=["GET"])
def list_diagnoses():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, image_url, diagnosis_type, method, confidence, created_date
            FROM diagnoses
            ORDER BY created_date DESC
        """)

        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert datetime to ISO format
        for r in rows:
            if isinstance(r["created_date"], datetime):
                r["created_date"] = r["created_date"].isoformat()

        return jsonify(rows)

    except Exception as e:
        print("❌ Error loading diagnoses:", e)
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------
#  RUN SERVER
# -------------------------------------------------
if __name__ == "__main__":
    print("🚀 DL API Running on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=True, use_reloader=False)
