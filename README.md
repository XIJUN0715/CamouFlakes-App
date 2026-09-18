# 🎭 CamouFlakes

## AI-Powered Mobile Deepfake Detection with MCMC Scam Reporting

![Expo](https://img.shields.io/badge/Expo-54.0.34-000020?style=flat-square&logo=expo)
![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688?style=flat-square&logo=fastapi)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16.0-FF6F00?style=flat-square&logo=tensorflow)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📌 Overview

**CamouFlakes** is an AI-driven mobile application that detects deepfake videos in real-time and enables users to report verified scams directly to Malaysia's MCMC (Malaysian Communications and Multimedia Commission). Built with a hybrid CNN-RNN deep learning architecture (MobileNetV3 + GRU), the system analyses temporal artifacts such as unnatural blinking, facial flickering, and lip-sync misalignment.

This project was developed as a Final Year Project for the Bachelor of Software Engineering with Honours at Universiti Tunku Abdul Rahman (UTAR).

---

## ✨ Key Features

| Feature | Description |
|---|---|
| Three Input Methods | Upload from gallery, record live with camera, or capture screen during video calls |
| Hybrid CNN-RNN Detection | MobileNetV3 + GRU achieves 86.41% AUC on Celeb-DF++ |
| Asynchronous Evidence Generation | Results appear in 2.4 seconds; trimmed video and thumbnail generated in background |
| MCMC Reporting Integration | Auto-fill MCMC forms via WebView; generate PDF reports with watermarks |
| Draft Persistence | Report drafts auto-save to AsyncStorage – resume anytime |
| Offline-First Storage | History, reports, and notifications stored locally in AsyncStorage |
| Passport-Style Camera Guide | Head-shoulder outline and pre-flight checklist for optimal video capture |
| Floating Screen Recording | Detect deepfakes during active video calls without leaving the call |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAMOUFLAKES SYSTEM ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                       MOBILE CLIENT (Android)                          │ │
│  │                         React Native (Expo)                            │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                        UI LAYER                                  │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │  │ │
│  │  │  │  Home    │ │  Camera  │ │  Upload  │ │  Result  │ │ MCMC  │ │  │ │
│  │  │  │  Screen  │ │  Screen  │ │  Screen  │ │  Screen  │ │ Flow  │ │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────┘ │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    BUSINESS LOGIC LAYER                         │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │  Utils: database.js, historyStorage.js, notifications.js  │  │  │ │
│  │  │  │         pdfGenerator.js, tflite.js, webViewAutofill.js   │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    STORAGE LAYER                                │  │ │
│  │  │  ┌────────────────────────────────────────────────────────┐    │  │ │
│  │  │  │  AsyncStorage (local key-value store)                  │    │  │ │
│  │  │  │  ├── @camouflakes_history (detection history)          │    │  │ │
│  │  │  │  ├── @camouflakes_reports (MCMC reports)              │    │  │ │
│  │  │  │  └── @notifications (in-app notifications)             │    │  │ │
│  │  │  └────────────────────────────────────────────────────────┘    │  │ │
│  │  │  ┌────────────────────────────────────────────────────────┐    │  │ │
│  │  │  │  File System (PDF reports, evidence)                   │    │  │ │
│  │  │  └────────────────────────────────────────────────────────┘    │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    NATIVE MODULES                              │  │ │
│  │  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │  │ │
│  │  │  │  MediaProjection│ │  CameraView     │ │  WebView        │   │  │ │
│  │  │  │  API            │ │  (expo-camera)  │ │  (react-native) │   │  │ │
│  │  │  └─────────────────┘ └─────────────────┘ └─────────────────┘   │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                               │                                              │
│                               │ HTTP / REST API (fetch)                     │
│                               ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        BACKEND SERVER (FastAPI)                        │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                        API ENDPOINTS                            │  │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │  │ │
│  │  │  │  /analyze   │  │ /evidence   │  │ /status, /send-report,   │ │  │ │
│  │  │  │  (POST)     │  │ /{job_id}   │  │ /store-feedback,         │ │  │ │
│  │  │  │             │  │ (GET)       │  │ /cleanup/trimmed         │ │  │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                   INFERENCE ENGINE                              │  │ │
│  │  │  ┌────────────────────────────────────────────────────────┐    │  │ │
│  │  │  │  TensorFlow Lite Model                                 │    │  │ │
│  │  │  │  (Hybrid CNN-GRU: MobileNetV3 + GRU)                   │    │  │ │
│  │  │  │  Input: 50 frames at 224x224 x 3 channels             │    │  │ │
│  │  │  │  Output: Probability (0-1), Classification             │    │  │ │
│  │  │  └────────────────────────────────────────────────────────┘    │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                   EVIDENCE GENERATOR                            │  │ │
│  │  │  ┌────────────────────────────────────────────────────────┐    │  │ │
│  │  │  │  FFmpeg (video trimming, thumbnail extraction)         │    │  │ │
│  │  │  │  └── trimmed_videos/ (trimmed 5s clips)               │    │  │ │
│  │  │  │  └── screenshots/ (evidence screenshots)               │    │  │ │
│  │  │  └────────────────────────────────────────────────────────┘    │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │                   BACKGROUND TASK                              │  │ │
│  │  │  └── Async evidence generation (non-blocking)                  │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                               │                                              │
│                               ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        EXTERNAL SERVICES                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  MCMC Consumer Redress Portal                                   │  │ │
│  │  │  https://aduan.mcmc.gov.my                                      │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Complete Setup Guide

### Prerequisites

| Tool | Version | Download Link |
|---|---|---|
| Node.js | v18.17+ | https://nodejs.org |
| Python | 3.10+ | https://python.org |
| Expo CLI | Latest | `npm install -g expo-cli` |
| Android Studio | Latest | https://developer.android.com/studio |
| Git | Latest | https://git-scm.com |
| Java JDK | 17 | https://adoptium.net |
| Android SDK | Latest | Via Android Studio |

---

### ⚠️ Files You Must Provide Manually

These files are **not** in the repository. You need to add them yourself:

| File/Folder | Where to Place | How to Get |
|---|---|---|
| `camouflakes_model.tflite` | `backend/` | Download from Google Drive |
| `ffmpeg/` folder with `bin/ffmpeg.exe`, `ffplay.exe`, `ffprobe.exe` | `backend/` | Download zip from Google Drive |
| `node_modules/` | `frontend/` | Run `npm install` |
| Python virtual environment | `backend/` | Run `python -m venv venv` |

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/XIJUN0715/CamouFlakes-App.git
cd CamouFlakes-App
```

---

### Step 2: Download and Place the TFLite Model

**Option A: Manual Download**
1. Download the model from: https://drive.google.com/file/d/1WAB6RfQxFugbjZ_QSoVE5Q_45-55qdwV/view?usp=sharing
2. Place the file in the `backend/` folder.

**Option B: Terminal Download (Recommended)**

```bash
# Make sure you are in the project root folder (CamouFlakes-App/)
# Install gdown if you don't have it
pip install gdown

# Download the model
gdown https://drive.google.com/uc?id=1WAB6RfQxFugbjZ_QSoVE5Q_45-55qdwV

# Move it to the backend folder
mv camouflakes_model.tflite backend/
```

---

### Step 3: Download and Extract FFmpeg

**Option A: Manual Download**
1. Download the FFmpeg zip from: https://drive.google.com/file/d/1XszTsrHi_65k8AKV38rEdf7jFnfbSaZJ/view?usp=sharing
2. Extract the zip so that the folder structure is `backend/ffmpeg/bin/` with `ffmpeg.exe`, `ffplay.exe`, and `ffprobe.exe` inside.

**Option B: Terminal Download (Recommended)**

```bash
# Make sure you are in the project root folder (CamouFlakes-App/)
# Download the FFmpeg zip
gdown https://drive.google.com/uc?id=1XszTsrHi_65k8AKV38rEdf7jFnfbSaZJ

# Unzip directly into the backend folder
unzip ffmpeg.zip -d backend/
```

---

### Step 4: Verify the Files Are in Place

After downloading, your `backend/` folder should look like this:

```
backend/
├── main.py
├── camouflakes_model.tflite          ← Model file (13.75 MB)
├── requirements.txt
├── ffmpeg/
│   └── bin/
│       ├── ffmpeg.exe
│       ├── ffplay.exe
│       └── ffprobe.exe
├── trimmed_videos/
└── screenshots/
```

---

### Step 5: Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

### Step 6: Install Backend Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

---

### Step 7: Configure Backend IP Address

The backend URL is **centralised** in a single file. Open `frontend/src/config.js` and update the `BACKEND_URL`:

```javascript
export const BACKEND_URL = 'http://YOUR_IP_ADDRESS:8000';
```

> **Note:** This single configuration file controls all API calls in the application. You no longer need to update multiple files.

**For the Backend Server (`main.py`):**

The backend uses environment variables for flexibility. To override the IP:

```bash
# Windows PowerShell
$env:SERVER_HOST="YOUR_IP_ADDRESS"
python main.py

# Windows CMD
set SERVER_HOST=YOUR_IP_ADDRESS
python main.py

# macOS/Linux
export SERVER_HOST="YOUR_IP_ADDRESS"
python main.py
```

If no environment variable is set, the server defaults to `172.25.223.105`.

> **To find your local IP:** Run `ipconfig` (Windows) or `ifconfig` (macOS/Linux).

---

### Step 8: Build and Run the Application

**Start the Backend:**
```bash
cd backend
venv\Scripts\activate
python main.py
```

**Start the Frontend (in a new terminal):**
```bash
cd frontend
npx expo start
npx expo run:android
```

---

## 📁 Project Structure

```
CamouFlakes-App/
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── navigation/      # Stack navigator
│   │   ├── screens/         # 22 app screens
│   │   ├── styles/          # Global styles
│   │   └── utils/           # Core utilities
│   │       ├── database.js          # Reports collection
│   │       ├── historyStorage.js    # History collection
│   │       ├── notifications.js     # In-app notifications
│   │       ├── pdfGenerator.js      # PDF generation
│   │       ├── tflite.js           # API communication
│   │       └── webViewAutofill.js   # MCMC autofill
│   ├── assets/              # Images, icons, audio
│   ├── plugins/             # Expo config plugins
│   └── App.js
├── backend/
│   ├── main.py              # FastAPI server
│   ├── camouflakes_model.tflite  # ← You must add this
│   ├── requirements.txt     # Python dependencies
│   ├── trimmed_videos/      # Generated evidence clips
│   ├── screenshots/         # Issue report screenshots
│   └── ffmpeg/              # FFmpeg binaries (you must add)
│       └── bin/
│           ├── ffmpeg.exe
│           ├── ffplay.exe
│           └── ffprobe.exe
└── README.md
```

---

## 📊 Performance Metrics

| Metric | Value |
|---|---|
| Model AUC | 86.41% (Celeb-DF++) |
| Model Size | 13.75 MB |
| Average Inference Time | 2.4 seconds |
| Minimum Inference Time | 1.15 seconds |
| Maximum Inference Time | 4.31 seconds |

---

## 🧪 Testing

### Backend Unit Tests

```bash
cd backend
venv\Scripts\activate
pytest test_backend.py -v
```

### Frontend Unit Tests

```bash
cd frontend
npm test
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo 54.0.34) |
| Backend | FastAPI (Python 3.10+) |
| Deep Learning | TensorFlow Lite (MobileNetV3 + GRU) |
| Local Storage | AsyncStorage |
| Video Processing | FFmpeg, OpenCV, decord |
| PDF Generation | pdf-lib |
| Version Control | Git / GitHub |

---

## 👤 Author

**Lee Xi Jun**  
Bachelor of Software Engineering with Honours  
Universiti Tunku Abdul Rahman (UTAR)  
[GitHub: XIJUN0715](https://github.com/XIJUN0715)

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- Supervisor: Mr. Kelwin Tan Seen Tiong for invaluable guidance and support
- UTAR – Lee Kong Chian Faculty of Engineering and Science
- CourseMate: Chong Chun Wei for support and collaboration

---

## ⚠️ Disclaimer

CamouFlakes uses AI to assist in detecting deepfakes for reference only. It is not a professional verification tool and may make mistakes. Appropriate handling of results is recommended.

---

> *Unmask the Fake. Protect the Real.*
