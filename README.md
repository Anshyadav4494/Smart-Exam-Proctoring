# 👁️ Smart Exam Eye Protecting App

This **Smart Eye Protecting / Exam Proctoring App** is an AI-powered system built with **Flask**, **Mediapipe**, and **WebGazer.js** that tracks eye and face movement during online tests or long screen sessions. It helps prevent cheating in exams and promotes healthy screen habits by detecting gaze direction, multiple persons, or distractions.

---

## 🌟 Key Features

* **AI Eye Tracking:** Uses Mediapipe FaceMesh (Python backend) to detect iris positions and gaze direction in real time.
* **Web-based Calibration:** Frontend eye calibration points ensure accurate gaze estimation.
* **Smart Proctoring Alerts:** Detects when the user looks away, moves excessively, or multiple faces appear.
* **Sound Notifications:** Plays different alert sounds for warnings, violations, or critical detections.
* **Privacy Friendly:** All webcam processing happens locally — no data is uploaded or stored externally.
* **Modern UI:** Built with Tailwind CSS and responsive design for a professional look.

---

## 🧰 Tech Stack

**Frontend**

* HTML5, CSS3, JavaScript (Vanilla)
* Tailwind CSS
* WebGazer.js for gaze prediction
* face-api.js for multiple-person and face detection

**Backend**

* Flask (Python)
* Mediapipe (for FaceMesh + Iris detection)
* OpenCV, NumPy

**Environment**

* Python 3.9+
* Works on all major browsers supporting webcam access

---

## ⚙️ Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/your-username/eye-protecting-app.git
cd eye-protecting-app
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate       # for Linux/macOS
venv\Scripts\activate          # for Windows
```

### 3. Install Requirements

```bash
pip install -r requirements.txt
```

### 4. Run Flask Server

```bash
python app.py
```

Open your browser and go to 👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🧩 Project Structure

```
eye-protecting-app/
│
├── app.py                  # Flask backend using Mediapipe for iris & gaze detection
├── requirements.txt         # Python dependencies
├── templates/
│   └── index.html          # Frontend interface (exam layout, calibration, etc.)
├── static/
│   ├── js/
│   │   └── script.js       # Eye tracking logic, calibration, alert system
│   └── css/
│       └── styles.css      # Modern responsive styles
└── README.md               # Project documentation
```

---

## 🧠 How It Works

1. **User starts calibration** by clicking on points on the screen.
2. **WebGazer.js** begins predicting gaze direction.
3. **Flask backend** receives webcam frames, runs Mediapipe FaceMesh to find iris and gaze ratio.
4. **Alerts trigger** when:

   * Face not detected
   * User looks away or down
   * Multiple persons are visible
5. The interface plays different **sound effects** (warning / critical) and shows on-screen messages.

---

## 🔐 Privacy & Ethics

* All video processing occurs locally in the browser and Flask server — **no cloud storage**.
* The app is intended for ethical exam monitoring or digital wellness purposes.
* Users can mute alerts anytime.

---

## 🛠️ Future Enhancements

* Add **real-time dashboard** for invigilators or teachers.
* Integrate **AI-based drowsiness or emotion detection**.
* Support **mobile browsers and dark/light themes**.
* Export **violation reports** (JSON or CSV).

---

## 🧑‍💻 Author

**Ansh Yadav**
Developer | AI & Web Integration Enthusiast

📧 *For feedback or collaboration: open an issue or fork the repo.*

---

## 📜 License

This project is licensed under the **MIT License** — free to use, modify, and share with proper attribution.

---

> 🌿 “Protect your eyes, ensure exam integrity, and build trust with AI-powered monitoring.”
