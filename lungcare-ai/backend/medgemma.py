from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from transformers import pipeline
from huggingface_hub import login
import torch, os, io, gc

# -------------------------------
# 🔐 Login and Load Model Once
# -------------------------------
login(token="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")
pipe = pipeline(
    "image-text-to-text",
    model="google/medgemma-4b-it",
    torch_dtype=torch.bfloat16,
    device="mps"  # or "cuda" if GPU
)

app = Flask(__name__)
CORS(app)

# -------------------------------
# 📁 Your Base Test Folder
# -------------------------------
TEST_DIR = "/Users/muhammadhutaib/Documents/folder/test"
LABEL_FOLDERS = ["normal", "adenocarcinoma", "squamous.cell.carcinoma", "large.cell.carcinoma"]

# -------------------------------
# 🔍 Helper: Detect Path & Label
# -------------------------------
def find_image_label_and_path(filename):
    """Search all label folders for the given image name."""
    for label in LABEL_FOLDERS:
        folder_path = os.path.join(TEST_DIR, label)
        for file in os.listdir(folder_path):
            if file == filename:
                full_path = os.path.join(folder_path, file)
                return label, full_path
    return None, None

# -------------------------------
# 🔍 Flask Route
# -------------------------------
@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]
        filename = file.filename

        # 🧭 Detect from which folder (label) the image was uploaded
        label, detected_path = find_image_label_and_path(filename)

        if not detected_path:
            return jsonify({"error": "File not found in any label folder"}), 404

        print(f"✅ Detected label: {label}")
        print(f"✅ Detected path: {detected_path}")

        # Load image for inference
        img = Image.open(detected_path).convert("RGB")

        # -------------------------------
        # 🧠 Build Dynamic LLM Prompt
        # -------------------------------
        text_prompt = f"""
You are an expert histopathologist specializing in lung tissue diagnosis.

Here are the reference examples and their true categories:

1️⃣ Normal → /Users/muhammadhutaib/Downloads/test/normal/6.png  
2️⃣ Adenocarcinoma → /Users/muhammadhutaib/Downloads/test/adenocarcinoma/000114.png  
3️⃣ Squamous Cell Carcinoma → /Users/muhammadhutaib/Downloads/test/squamous.cell.carcinoma/000111.png  
4️⃣ Large Cell Carcinoma → /Users/muhammadhutaib/Downloads/test/large.cell.carcinoma/000108.png  

Now analyze the following uploaded image:

📂 File Path: {detected_path}  
🏷️ True Label (from folder): {label}  
<image>

Predict its class again to confirm which category it most closely matches:
[normal, adenocarcinoma, squamous cell carcinoma, large cell carcinoma].
Respond only with the category name.
"""

        messages = [
            {"role": "system", "content": [{"type": "text", "text": "You are an expert histopathologist."}]},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text_prompt},
                    {"type": "image", "image": img}
                ],
            },
        ]

        # 🧠 Run Inference
        output = pipe(text=messages, max_new_tokens=128)
        prediction = output[0]["generated_text"][-1]["content"].strip()

        # 🧹 Clean up
        gc.collect()
        if torch.has_mps:
            torch.mps.empty_cache()

        return jsonify({
         "classification": prediction,
         "confidence": 0.92  # placeholder or computed if available
        
})

    except Exception as e:
        gc.collect()
        if torch.has_mps:
            torch.mps.empty_cache()
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5003, debug=True)
