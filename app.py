# app.py
from flask import Flask, render_template, request, jsonify
import cv2, numpy as np, base64
import mediapipe as mp
import io
from datetime import datetime

mp_face = mp.solutions.face_mesh

app = Flask(__name__)
face_mesh = mp_face.FaceMesh(static_image_mode=False,
                                max_num_faces=2,
                                refine_landmarks=True,
                                min_detection_confidence=0.5,
                                min_tracking_confidence=0.5)

# helper: decode base64 image to cv2
def b64_to_cv2(img_b64):
    header, encoded = img_b64.split(',', 1) if ',' in img_b64 else (None, img_b64)
    data = base64.b64decode(encoded)
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img

def iris_center(landmarks, left_idx, right_idx, img_w, img_h):
    # compute center of given landmark indices
    pts = []
    for i in left_idx:
        lm = landmarks[i]
        pts.append((int(lm.x * img_w), int(lm.y * img_h)))
    cx = int(np.mean([p[0] for p in pts]))
    cy = int(np.mean([p[1] for p in pts]))
    return (cx, cy)

@app.route('/')
def home():
    # yeh tumhara index.html render karega
    return render_template('index.html')

@app.route('/frame', methods=['POST'])
def process_frame():
    payload = request.json
    img_b64 = payload.get('image')
    session_id = payload.get('session_id', 'anon')

    if not img_b64:
        return jsonify({"error":"no image"}), 400

    img = b64_to_cv2(img_b64)
    h, w = img.shape[:2]
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    resp = {
        "timestamp": datetime.utcnow().isoformat(),
        "face_count": 0,
        "faces": []
    }

    if not results.multi_face_landmarks:
        resp['face_count'] = 0
        resp['alert'] = 'no_face'
        return jsonify(resp)

    resp['face_count'] = len(results.multi_face_landmarks)

    # iris landmark indices (MediaPipe refined landmarks)
    LEFT_IRIS = [474, 475, 476, 477]
    RIGHT_IRIS = [469, 470, 471, 472]

    for flm in results.multi_face_landmarks:
        # get bounding box (approx)
        xs = [lm.x for lm in flm.landmark]
        ys = [lm.y for lm in flm.landmark]
        xmin, xmax = min(xs), max(xs)
        ymin, ymax = min(ys), max(ys)
        bbox = [int(xmin*w), int(ymin*h), int((xmax-xmin)*w), int((ymax-ymin)*h)]

        # iris centers
        lcx, lcy = iris_center(flm.landmark, LEFT_IRIS, None, w, h)
        rcx, rcy = iris_center(flm.landmark, RIGHT_IRIS, None, w, h)

        # simple gaze heuristic: compare iris center relative to eye corners
        # left eye corners ~ 33 (left outer), 133 (left inner), right eye corners ~ 362, 263 etc
        # here we compute normalized horizontal gaze ratio for left eye
        left_eye_lr = (flm.landmark[33].x * w, flm.landmark[33].y * h)
        left_eye_inner = (flm.landmark[133].x * w, flm.landmark[133].y * h)
        eye_w = abs(left_eye_lr[0] - left_eye_inner[0]) or 1.0
        gaze_ratio_left = (lcx - left_eye_inner[0]) / eye_w

        # same for right eye (use appropriate landmarks)
        right_eye_outer = (flm.landmark[362].x * w, flm.landmark[362].y * h)
        right_eye_inner = (flm.landmark[263].x * w, flm.landmark[263].y * h)
        eye_w2 = abs(right_eye_outer[0] - right_eye_inner[0]) or 1.0
        gaze_ratio_right = (rcx - right_eye_inner[0]) / eye_w2

        gaze_score = (gaze_ratio_left + gaze_ratio_right) / 2.0

        # Determine simple status
        status = 'on_screen'
        if gaze_score < 0.2:
            status = 'look_left'
        elif gaze_score > 0.8:
            status = 'look_right'
        # you can tune thresholds during calibration

        resp['faces'].append({
            "bbox": bbox,
            "left_iris": [lcx, lcy],
            "right_iris": [rcx, rcy],
            "gaze_score": float(gaze_score),
            "status": status
        })

    # simple multi-person alert
    if resp['face_count'] > 1:
        resp['alert'] = 'multiple_persons'

    return jsonify(resp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
