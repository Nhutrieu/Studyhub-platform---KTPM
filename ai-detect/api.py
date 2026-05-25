from flask import Flask, request, jsonify
from ultralytics import YOLO
import numpy as np
import cv2
import base64

app = Flask(__name__)

# Load model YOLO – nhớ để đúng đường dẫn
model = YOLO("models/best.pt")


def base64_to_image(b64):
    data = base64.b64decode(b64)
    arr = np.frombuffer(data, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def image_to_base64(img):
    _, buffer = cv2.imencode(".jpg", img)
    return base64.b64encode(buffer).decode("utf-8")


@app.route("/detect", methods=["POST"])
def detect():
    req = request.get_json()
    if not req or "image" not in req:
        return jsonify({"success": False, "message": "Image is required"}), 400

    # Chuyển base64 → ảnh
    img = base64_to_image(req["image"])

    # Chạy YOLO
    results = model(img)[0]

    detections = []
    for box in results.boxes:
        cls = int(box.cls)
        detections.append({
            "class_id": cls,
            "class_name": results.names[cls],
            "confidence": float(box.conf),
            "bbox": box.xyxy[0].tolist()
        })

    annotated = results.plot()
    annotated_b64 = image_to_base64(annotated)

    return jsonify({
        "success": True,
        "detections": detections,
        "annotated_image": annotated_b64
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)