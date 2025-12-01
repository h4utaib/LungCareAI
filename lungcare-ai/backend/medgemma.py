from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from transformers import pipeline
import torch
from huggingface_hub import login
import io, os, gc

# -------------------------------
# 🔐 Login and Load Model Once
# -------------------------------



app = Flask(__name__)
CORS(app)

# -------------------------------
# 🧠 Few-shot example paths
# -------------------------------
ex_adeno_path = "/Users/muhammadhutaib/Downloads/test/adenocarcinoma/000114.png"
ex_squamous_path = "/Users/muhammadhutaib/Downloads/test/squamous.cell.carcinoma/000111.png"
ex_large_path = "/Users/muhammadhutaib/Downloads/test/large.cell.carcinoma/000108.png"
ex_normal_path = "/Users/muhammadhutaib/Downloads/test/normal/6.png"

# Preload few-shot images
ex_adeno = Image.open(ex_adeno_path).convert("RGB")
ex_squamous = Image.open(ex_squamous_path).convert("RGB")
ex_large = Image.open(ex_large_path).convert("RGB")
ex_normal = Image.open(ex_normal_path).convert("RGB")

# -------------------------------
# 🔍 Inference Route
# -------------------------------
@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]
        filename = file.filename

        # --- Load uploaded image into memory like your test_image_path ---
        image_bytes = file.read()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Save to disk (optional for debugging)
        upload_dir = "/Users/muhammadhutaib/Documents/Python/medgemma-app/squamous.cell.carcinoma"
        os.makedirs(upload_dir, exist_ok=True)
        upload_path = os.path.join(upload_dir, filename)
        img.save(upload_path)

        # --- Build the few-shot prompt (same as notebook) ---
        text_prompt = f"""
You are an expert histopathologist specializing in lung tissue diagnosis.

Here are example images and their correct classifications:

Example 1 (Normal): {ex_normal_path}
<image> → Normal: clear alveolar spaces, uniform nuclei, no malignant growth.

Example 2 (Adenocarcinoma): {ex_adeno_path}
<image> → Adenocarcinoma: glandular structures, mucus formation, irregular cell nuclei.

Example 3 (Squamous Cell Carcinoma): {ex_squamous_path}
<image> → Squamous cell carcinoma: keratin pearls, intercellular bridges, dense pink cytoplasm.

Example 4 (Large Cell Carcinoma): {ex_large_path}
<image> → Large cell carcinoma: large undifferentiated cells with prominent nucleoli and poor differentiation.

Now analyze the following lung histopathology image: {upload_path}
<image>

Decide which category it most closely matches:
[normal, adenocarcinoma, squamous cell carcinoma, large cell carcinoma].
Respond only with the category name.
"""

        messages = [
            {"role": "system", "content": [{"type": "text", "text": "You are an expert radiologist."}]},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text_prompt},
                    {"type": "image", "image": ex_normal},
                    {"type": "image", "image": ex_adeno},
                    {"type": "image", "image": ex_squamous},
                    {"type": "image", "image": ex_large},
                    {"type": "image", "image": img},  
                ],
            },
        ]

        # --- Run inference ---
        output = pipe(text=messages, max_new_tokens=256)
        prediction = output[0]["generated_text"][-1]["content"].strip()

        # --- Clean up memory ---
        gc.collect()
        if torch.has_mps:
            torch.mps.empty_cache()

        return jsonify({
            "classification": prediction,
            "confidence": 0.9
        })

    except Exception as e:
        gc.collect()
        if torch.backends.mps.is_available():
         torch.mps.empty_cache()
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5002, debug=False)
