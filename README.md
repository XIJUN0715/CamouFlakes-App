<<<<<<< HEAD
# VisionCamera Stable HTTP Test

Compatibility-focused stack:

- Expo SDK 54.0.34
- React Native 0.81.5
- React Native VisionCamera 4.7.3
- No Nitro Modules
- No Worklets
- No Frame Processor
- FastAPI over ordinary HTTP

Extract this folder to a short Windows path such as `C:\VCamTest`.

## Backend

```bat
cd /d C:\VCamTest\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

## Phone connection

```bat
adb devices
adb reverse tcp:8000 tcp:8000
```

## Frontend build

```bat
cd /d C:\VCamTest\frontend
build-android.cmd
```

After BUILD SUCCESSFUL:

```bat
cd android
gradlew.bat app:installDebug -PreactNativeArchitectures=arm64-v8a
cd ..
npx expo start
```

Open the installed `VisionCamera Stable Test` app on the phone.
=======
# CamouFlakes-App
CamouFlakes: AI-driven mobile deepfake detection application with MCMC scam reporting services
>>>>>>> 2c16da28297e536e687a1cc7111cb382dc814b3f
