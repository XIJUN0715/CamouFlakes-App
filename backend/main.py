import os
import tempfile
import subprocess
import base64
import cv2
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import logging
import time
import shutil
import json
import re
import uuid
import threading
from datetime import datetime, timezone
import decord
import gc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# ---------- Server Configuration ----------
# Use environment variables or fallback to default IP
SERVER_HOST = os.environ.get("SERVER_HOST", "172.25.223.105")
SERVER_PORT = os.environ.get("SERVER_PORT", "8000")
BASE_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"
logger.info(f"Server BASE_URL: {BASE_URL}")

# ---------- Paths ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "camouflakes_model.tflite")
FFMPEG_PATH = os.path.join(BASE_DIR, "ffmpeg", "bin", "ffmpeg.exe")
FFMPEG_AVAILABLE = os.path.exists(FFMPEG_PATH)

TRIMMED_VIDEO_DIR = os.path.join(BASE_DIR, "trimmed_videos")
os.makedirs(TRIMMED_VIDEO_DIR, exist_ok=True)

FEEDBACK_FILE = os.path.join(BASE_DIR, "feedback.json")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

app.mount("/trimmed", StaticFiles(directory=TRIMMED_VIDEO_DIR), name="trimmed")
app.mount("/screenshots", StaticFiles(directory=SCREENSHOTS_DIR), name="screenshots")

if FFMPEG_AVAILABLE:
    logger.info(f"FFmpeg found at: {FFMPEG_PATH}")
else:
    logger.warning(f"FFmpeg NOT found at {FFMPEG_PATH}")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

# ---------- Load TFLite Model ----------
try:
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    input_shape = input_details[0]['shape']
    logger.info(f"Model input shape: {input_shape}")

    if len(input_shape) != 5:
        raise ValueError("Model input is not 5-dimensional; expected [batch, time, channels, height, width].")

    time_dim = int(input_shape[1]) if input_shape[1] is not None else 5
    height = int(input_shape[3]) if input_shape[3] is not None else 224
    width = int(input_shape[4]) if input_shape[4] is not None else 224

    logger.info(f"Using {time_dim} frames per clip, image size {height}x{width}")

except Exception as e:
    logger.error(f"Failed to load model: {e}")
    raise

# ---------- Pydantic models ----------
class VideoRequest(BaseModel):
    file: str
    startTime: Optional[float] = 0.0

class ScreenshotAttachment(BaseModel):
    filename: str
    data: str  # base64, no data-URI prefix

class IssueReportRequest(BaseModel):
    issueId: str
    category: str
    description: str
    device: str
    osVersion: str
    appVersion: str
    submittedAt: str
    screenshots: Optional[List[ScreenshotAttachment]] = []

class FeedbackStoreRequest(BaseModel):
    issueId: str
    category: str
    description: str
    device: str
    osVersion: str
    osName: str
    appVersion: str
    submittedAt: str
    screenshots_count: Optional[int] = 0

# ---------- Configurable threshold ----------
DECISION_THRESHOLD = float(os.environ.get("CAMOUFLAKES_THRESHOLD", 0.5))
logger.info(f"Decision threshold set to {DECISION_THRESHOLD}")

# ---------- Evidence job tracking ----------
# Stores background job status so the client can poll for
# trimmedUri and thumbnailUri after the /analyze response
# is already returned.
EVIDENCE_JOBS = {}
EVIDENCE_JOBS_LOCK = threading.Lock()

# ---------- Helper Functions ----------

# ========== OS version mapping ==========
def map_api_level_to_name(api_level):
    """Convert Android API level to readable OS name"""
    version_map = {
        '23': 'Android 6.0 (Marshmallow)',
        '24': 'Android 7.0 (Nougat)',
        '25': 'Android 7.1',
        '26': 'Android 8.0 (Oreo)',
        '27': 'Android 8.1',
        '28': 'Android 9.0 (Pie)',
        '29': 'Android 10',
        '30': 'Android 11',
        '31': 'Android 12',
        '32': 'Android 12L',
        '33': 'Android 13',
        '34': 'Android 14',
        '35': 'Android 15',
        '36': 'Android 16',
    }
    return version_map.get(str(api_level), f'Android API {api_level}')

# ========== Feedback storage ==========
def append_feedback_entry(entry):
    """Append feedback entry to feedback.json file"""
    feedback_file = FEEDBACK_FILE
    try:
        if os.path.exists(feedback_file):
            with open(feedback_file, 'r') as f:
                data = json.load(f)
        else:
            data = []
        
        data.append(entry)
        
        with open(feedback_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Feedback entry saved: {entry.get('issueId')}")
    except Exception as e:
        logger.error(f"Failed to save feedback: {e}")

# ========== Issue ID validation ==========
ISSUE_ID_PATTERN = re.compile(r'^[A-Z]{2}-\d{8}-\d{5}$')

# ========== Email search (simplified) ==========
def _search_inbox_for_subject_fragment(issue_id):
    """
    Check if an email with the given issue ID was received.
    For production, connect to IMAP server.
    For testing, returns True if issue_id matches pattern.
    """
    if ISSUE_ID_PATTERN.match(issue_id):
        return True
    return False

# ---------- Existing Helper Functions ----------
def transcode_video(input_path, output_path, start_time=0):
    if not FFMPEG_AVAILABLE:
        return False
    try:
        cmd = [
            FFMPEG_PATH,
            '-ss', str(start_time),
            '-i', input_path,
            '-t', '5',
            '-r', '10',
            '-vf', 'scale=-2:480',
            '-c:v', 'libx264',
            '-an',
            '-b:v', '1M',
            '-preset', 'fast',
            '-y',
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f"Transcoded video saved to {output_path}")
        return True
    except Exception as e:
        logger.error(f"FFmpeg transcode error: {e}")
        return False

def trim_video_exact(input_path, output_path, start_time, duration=5):
    if not FFMPEG_AVAILABLE:
        return False
    try:
        cmd = [
            FFMPEG_PATH,
            '-ss', str(start_time),
            '-i', input_path,
            '-t', str(duration),
            '-c:v', 'libx264',
            '-crf', '18',
            '-preset', 'veryfast',
            '-vsync', 'cfr',
            '-r', '30',
            '-pix_fmt', 'yuv420p',
            '-profile:v', 'baseline',
            '-level', '3.0',
            '-an',
            '-movflags', '+faststart',
            '-y',
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f"Exact trimmed video saved to {output_path} (duration: {duration}s)")
        return True
    except Exception as e:
        logger.error(f"Exact trim failed: {e}")
        return False

def extract_thumbnail(input_video_path, output_image_path):
    if not FFMPEG_AVAILABLE:
        return False
    try:
        cmd = [
            FFMPEG_PATH,
            '-ss', '0',
            '-i', input_video_path,
            '-vframes', '1',
            '-f', 'image2',
            '-c:v', 'png',
            '-y',
            output_image_path
        ]
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info(f"Thumbnail saved to {output_image_path}")
        return True
    except Exception as e:
        logger.error(f"Thumbnail extraction error: {e}")
        return False

def preprocess_frame(frame):
    resized = cv2.resize(frame, (width, height))
    normalized = resized.astype(np.float32) / 255.0
    return normalized

def infer_clip(frames):
    clip = np.stack(frames, axis=0)
    clip = np.transpose(clip, (0, 3, 1, 2))
    input_data = np.expand_dims(clip, axis=0).astype(np.float32)
    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()
    output_tensor = interpreter.get_tensor(output_details[0]['index'])
    if output_tensor.ndim == 0:
        raw = float(output_tensor)
    elif output_tensor.ndim == 1:
        idx = 1 if output_tensor.shape[0] >= 2 else 0
        raw = float(output_tensor[idx])
    elif output_tensor.ndim == 2:
        idx = 1 if output_tensor.shape[1] >= 2 else 0
        raw = float(output_tensor[0][idx])
    else:
        raw = float(output_tensor.flat[0])
    prob = 1 / (1 + np.exp(-np.clip(raw, -20, 20)))
    return prob

def describe_confidence(confidence):
    if confidence >= 90:
        return "high"
    elif confidence >= 70:
        return "moderate"
    elif confidence > 50:
        return "low"
    else:
        return "none"

def build_reasoning(is_fake, confidence, fake_prob, segments):
    lines = []
    band = describe_confidence(confidence)

    if is_fake:
        if band == "high":
            lines.append(
                f"The AI model classified this video as a DEEPFAKE (synthetic) with {confidence}% confidence. "
                f"This is a high‑confidence detection, meaning the model strongly identifies the statistical "
                f"patterns associated with AI‑generated facial manipulation. We strongly recommend taking action."
            )
        elif band == "moderate":
            lines.append(
                f"The AI model classified this video as a DEEPFAKE (synthetic) with {confidence}% confidence. "
                f"This is a moderate‑confidence detection – the classification is clear, but some ambiguity "
                f"remains. It is advisable to review the video carefully before acting."
            )
        else:
            lines.append(
                f"The AI model classified this video as a DEEPFAKE (synthetic) with {confidence}% confidence. "
                f"This is a low‑confidence detection – the result is close to the decision boundary, so it should "
                f"be treated as a suggestive indicator rather than definitive proof. Consider gathering additional "
                f"evidence before reporting."
            )
    else:
        lines.append(
            f"The AI model classified this video as GENUINE (authentic) with {100 - confidence}% confidence. "
            f"The model did not detect the statistical patterns it associates with synthetic media. "
            f"No action is required based on this analysis."
        )

    if is_fake and band == "high":
        lines.append(
            "The high confidence suggests the model identified strong statistical signals consistent with "
            "AI‑generated content. However, this remains a statistical estimate, not a forensic guarantee."
        )
    elif is_fake and band == "moderate":
        lines.append(
            "The moderate confidence indicates the model sees some patterns of manipulation, but with less "
            "certainty. Human review is recommended to confirm the classification."
        )
    elif is_fake and band == "low":
        lines.append(
            "The low confidence means the model is uncertain. This should be considered an early warning "
            "and may require further verification before making a report."
        )

    if len(segments) >= 2:
        probs = [s["fakeProbability"] for s in segments]
        mean_p = sum(probs) / len(probs)
        variance = sum((p - mean_p) ** 2 for p in probs) / len(probs)
        std_dev = variance ** 0.5
        min_p, max_p = min(probs), max(probs)

        if std_dev < 0.07:
            lines.append(
                f"The assessment was consistent across {len(segments)} independently sampled segments of the video, "
                f"with fake‑probability ranging from {min_p * 100:.0f}% to {max_p * 100:.0f}%."
            )
        else:
            lines.append(
                f"The confidence varied across the video's segments (from {min_p * 100:.0f}% to {max_p * 100:.0f}%), "
                f"indicating the signal was not uniform throughout the video."
            )

    lines.append(
        "This analysis is based on a statistical AI model trained on known deepfake datasets. "
        "It is a probability estimate, not a certified forensic analysis. "
        "Always verify suspicious content through multiple sources before taking action."
    )

    return lines

# ---------- Background evidence task ----------
def _save_evidence_task(job_id: str, raw_path: str, start_time: float):
    """
    Runs AFTER the /analyze response has already been sent to the client.
    Does the FFmpeg trim + thumbnail extraction that used to block the
    response, then records the result so GET /evidence/{job_id} can pick
    it up. Also owns cleanup of raw_path now, since the request handler
    no longer deletes it (this task needs the file to still exist).
    """
    trimmed_uri = None
    thumbnail_uri = None
    try:
        timestamp = int(time.time())
        if FFMPEG_AVAILABLE:
            trimmed_filename = f"trimmed_{timestamp}.mp4"
            trimmed_path = os.path.join(TRIMMED_VIDEO_DIR, trimmed_filename)
            if trim_video_exact(raw_path, trimmed_path, start_time, duration=5):
                trimmed_uri = f"{BASE_URL}/trimmed/{trimmed_filename}"
                logger.info(f"[{job_id}] Exact trimmed video saved: {trimmed_uri}")
                thumb_filename = f"thumbnail_{timestamp}.png"
                thumb_path = os.path.join(TRIMMED_VIDEO_DIR, thumb_filename)
                if extract_thumbnail(trimmed_path, thumb_path):
                    thumbnail_uri = f"{BASE_URL}/trimmed/{thumb_filename}"
                    logger.info(f"[{job_id}] Thumbnail saved: {thumbnail_uri}")
                else:
                    logger.warning(f"[{job_id}] Thumbnail generation failed; continuing without it.")
            else:
                logger.warning(f"[{job_id}] Exact trim failed; falling back to transcoding.")
                if transcode_video(raw_path, trimmed_path, start_time):
                    trimmed_uri = f"{BASE_URL}/trimmed/{trimmed_filename}"
                    logger.info(f"[{job_id}] Transcoded trimmed video saved: {trimmed_uri}")
                    thumb_filename = f"thumbnail_{timestamp}.png"
                    thumb_path = os.path.join(TRIMMED_VIDEO_DIR, thumb_filename)
                    if extract_thumbnail(trimmed_path, thumb_path):
                        thumbnail_uri = f"{BASE_URL}/trimmed/{thumb_filename}"
                        logger.info(f"[{job_id}] Thumbnail saved: {thumbnail_uri}")
                else:
                    logger.warning(f"[{job_id}] All trimming attempts failed; no evidence clip saved.")
    except Exception as e:
        logger.error(f"[{job_id}] Evidence background task error: {e}")
    finally:
        if raw_path and os.path.exists(raw_path):
            try:
                os.unlink(raw_path)
            except PermissionError:
                logger.warning(f"[{job_id}] Could not delete raw file {raw_path}")
                gc.collect()
                time.sleep(0.1)
                try:
                    os.unlink(raw_path)
                except Exception as e:
                    logger.error(f"[{job_id}] Second attempt to delete raw file failed: {e}")
        with EVIDENCE_JOBS_LOCK:
            EVIDENCE_JOBS[job_id] = {
                "ready": True,
                "trimmedUri": trimmed_uri,
                "thumbnailUri": thumbnail_uri,
            }
        logger.info(
            f"[{job_id}] Evidence task complete: "
            f"trimmed={'yes' if trimmed_uri else 'no'}, thumbnail={'yes' if thumbnail_uri else 'no'}"
        )

# ---------- Endpoints ----------

@app.get("/status")
async def status():
    return {
        "status": "ok",
        "ffmpeg_available": FFMPEG_AVAILABLE,
        "model_loaded": True,
    }

@app.post("/analyze")
async def analyze_video(request: VideoRequest, background_tasks: BackgroundTasks):
    start_time = request.startTime if request.startTime is not None else 0.0
    raw_path = None
    frame_list = None

    # ─── START TIMER FOR INFERENCE ───
    inference_start_time = time.time()

    try:
        video_data = base64.b64decode(request.file)

        if not video_data:
            logger.warning("Empty video data received")
            raise HTTPException(status_code=400, detail="Empty video data")

        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
            tmp.write(video_data)
            raw_path = tmp.name
        logger.info(f"Raw video saved to {raw_path}, size: {len(video_data)} bytes")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Decode/save error: {e}")
        raise HTTPException(status_code=400, detail="Invalid video data")

    # ---------- Read only the 5-second segment for inference ----------
    vr = None
    try:
        vr = decord.VideoReader(raw_path, width=width, height=height)
        total_frames = len(vr)
        fps = vr.get_avg_fps()
        if fps <= 0:
            fps = 30.0
        logger.info(f"Total frames (raw): {total_frames}, FPS: {fps}")

        if total_frames == 0:
            raise ValueError("Video has no frames")

        start_frame = int(start_time * fps)
        end_frame = min(total_frames - 1, int((start_time + 5.0) * fps))
        segment_frame_count = end_frame - start_frame + 1

        if segment_frame_count <= 0:
            start_frame = 0
            end_frame = total_frames - 1
            segment_frame_count = total_frames
            logger.warning("Segment too short; using full video.")

        if segment_frame_count < time_dim:
            indices = list(range(start_frame, end_frame + 1))
            while len(indices) < time_dim:
                indices.append(indices[-1])
        else:
            step = segment_frame_count / time_dim
            indices = [start_frame + int(i * step) for i in range(time_dim)]

        frames_np = vr.get_batch(indices).asnumpy()
        frames = frames_np.astype(np.float32) / 255.0
        frame_list = [frames[i] for i in range(frames.shape[0])]
        del vr
        vr = None
    except Exception as e:
        logger.error(f"decord reading failed: {e}; falling back to cv2")
        if vr is not None:
            del vr
        cap = None
        try:
            cap = cv2.VideoCapture(raw_path)
            if not cap.isOpened():
                raise ValueError("Could not open video with cv2")
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames == 0:
                raise ValueError("Video has no frames")
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            start_frame = int(start_time * fps)
            end_frame = min(total_frames - 1, int((start_time + 5.0) * fps))
            segment_frame_count = end_frame - start_frame + 1
            if segment_frame_count <= 0:
                start_frame = 0
                end_frame = total_frames - 1
                segment_frame_count = total_frames
            if segment_frame_count < time_dim:
                indices = list(range(start_frame, end_frame + 1))
                while len(indices) < time_dim:
                    indices.append(indices[-1])
            else:
                step = segment_frame_count / time_dim
                indices = [start_frame + int(i * step) for i in range(time_dim)]
            frame_list = []
            for idx in indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if not ret:
                    frame = np.zeros((height, width, 3), dtype=np.uint8)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                processed = preprocess_frame(frame_rgb)
                frame_list.append(processed)
        finally:
            if cap is not None:
                cap.release()
                cap = None

    if frame_list is None:
        if raw_path and os.path.exists(raw_path):
            try:
                os.unlink(raw_path)
            except:
                pass
        raise HTTPException(status_code=400, detail="Could not read video frames")

    # ─── RUN INFERENCE ─── This is what the user is actually waiting on.
    # Everything below is evidence-saving, handed off to a background task
    # so it happens AFTER this response is sent.
    try:
        fake_prob = infer_clip(frame_list)
        logger.info(f"Fake probability: {fake_prob:.4f}")
    except Exception as e:
        logger.error(f"Inference error: {e}")
        if raw_path and os.path.exists(raw_path):
            try:
                os.unlink(raw_path)
            except:
                pass
        raise HTTPException(status_code=500, detail="Inference failed")

    # ─── INFERENCE TIMER ENDS ───
    inference_time = time.time() - inference_start_time
    logger.info(f"Inference time: {inference_time:.3f} seconds")

    is_fake = bool(fake_prob >= DECISION_THRESHOLD)
    confidence = int(max(fake_prob, 1 - fake_prob) * 100)

    segments_info = []
    reasoning = build_reasoning(is_fake, confidence, fake_prob, segments_info)

    # ─── EVIDENCE: Hand off trim + thumbnail to a background task.
    # raw_path's cleanup is now this task's job (see _save_evidence_task),
    # not this handler's - it still needs the file after we return.
    job_id = str(uuid.uuid4())
    with EVIDENCE_JOBS_LOCK:
        EVIDENCE_JOBS[job_id] = {"ready": False, "trimmedUri": None, "thumbnailUri": None}
    background_tasks.add_task(_save_evidence_task, job_id, raw_path, start_time)

    # ─── RETURN RESPONSE IMMEDIATELY (no waiting for FFmpeg) ───
    return {
        "probability": float(fake_prob),
        "isFake": is_fake,
        "confidence": confidence,
        "processing_time": round(inference_time, 3),
        "trimmedUri": None,          # ← Will be available via /evidence/{job_id}
        "thumbnailUri": None,        # ← Will be available via /evidence/{job_id}
        "reasoning": reasoning,
        "segments": segments_info,
        "jobId": job_id,
    }

@app.get("/evidence/{job_id}")
async def get_evidence(job_id: str):
    """Poll this endpoint to get the trimmed video and thumbnail URIs."""
    with EVIDENCE_JOBS_LOCK:
        job = EVIDENCE_JOBS.get(job_id)
    if job is None:
        return {"ready": False, "trimmedUri": None, "thumbnailUri": None}
    return job

@app.post("/send-report")
async def send_report(request: IssueReportRequest):
    server_timestamp = datetime.now(timezone.utc).isoformat()

    screenshot_filenames = []
    for idx, shot in enumerate(request.screenshots or []):
        try:
            img_bytes = base64.b64decode(shot.data)
            filename = f"screenshot_{request.issueId}_{idx}.png"
            file_path = os.path.join(SCREENSHOTS_DIR, filename)
            with open(file_path, "wb") as f:
                f.write(img_bytes)
            screenshot_filenames.append(filename)
        except Exception as e:
            logger.warning(f"Failed to save screenshot {idx}: {e}")

    feedback_entry = {
        "issueId": request.issueId,
        "category": request.category,
        "description": request.description,
        "device": request.device,
        "osVersion": request.osVersion,
        "osName": map_api_level_to_name(request.osVersion),
        "appVersion": request.appVersion,
        "submittedAt": request.submittedAt,
        "screenshots": screenshot_filenames,
        "serverTimestamp": server_timestamp,
    }

    append_feedback_entry(feedback_entry)
    return {"success": True}

@app.post("/store-feedback")
async def store_feedback(request: FeedbackStoreRequest):
    server_timestamp = datetime.now(timezone.utc).isoformat()

    feedback_entry = {
        "issueId": request.issueId,
        "category": request.category,
        "description": request.description,
        "device": request.device,
        "osVersion": request.osVersion,
        "osName": request.osName,
        "appVersion": request.appVersion,
        "submittedAt": request.submittedAt,
        "screenshots_count": request.screenshots_count or 0,
        "serverTimestamp": server_timestamp,
    }

    append_feedback_entry(feedback_entry)
    return {"success": True}

@app.get("/check-email-received")
async def check_email_received(issue_id: str):
    if not ISSUE_ID_PATTERN.match(issue_id):
        raise HTTPException(status_code=400, detail="Invalid issue_id format")
    received = _search_inbox_for_subject_fragment(issue_id)
    return {"received": received, "issueId": issue_id}

@app.delete("/cleanup/trimmed")
async def cleanup_trimmed():
    try:
        if os.path.exists(TRIMMED_VIDEO_DIR):
            shutil.rmtree(TRIMMED_VIDEO_DIR)
        os.makedirs(TRIMMED_VIDEO_DIR, exist_ok=True)
        logger.info("Cleaned up trimmed_videos directory")

        if os.path.exists(SCREENSHOTS_DIR):
            shutil.rmtree(SCREENSHOTS_DIR)
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        logger.info("Cleaned up screenshots directory")

        return {"success": True}
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/debug/infer")
async def debug_infer(request: VideoRequest):
    start_time = time.time()
    video_data = base64.b64decode(request.file)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
        tmp.write(video_data)
        raw_path = tmp.name
    logger.info(f"[DEBUG] Raw video saved to {raw_path}, size: {len(video_data)} bytes")

    try:
        vr = decord.VideoReader(raw_path, width=width, height=height)
        total_frames = len(vr)
        if total_frames == 0:
            raise ValueError("Video has no frames")
        fps = vr.get_avg_fps() or 30.0
        start_frame = int(request.startTime * fps) if request.startTime else 0
        end_frame = min(total_frames - 1, int((request.startTime + 5.0) * fps)) if request.startTime else total_frames - 1
        segment_frame_count = end_frame - start_frame + 1
        if segment_frame_count < time_dim:
            indices = list(range(start_frame, end_frame + 1))
            while len(indices) < time_dim:
                indices.append(indices[-1])
        else:
            step = segment_frame_count / time_dim
            indices = [start_frame + int(i * step) for i in range(time_dim)]
        frames_np = vr.get_batch(indices).asnumpy()
        frames = frames_np.astype(np.float32) / 255.0
        frame_list = [frames[i] for i in range(frames.shape[0])]
        del vr
        os.unlink(raw_path)
    except Exception as e:
        logger.warning(f"decord failed in debug, falling back to cv2: {e}")
        cap = None
        try:
            cap = cv2.VideoCapture(raw_path)
            if not cap.isOpened():
                raise ValueError("Could not open video with cv2")
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames == 0:
                raise ValueError("Video has no frames")
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            start_frame = int(request.startTime * fps) if request.startTime else 0
            end_frame = min(total_frames - 1, int((request.startTime + 5.0) * fps)) if request.startTime else total_frames - 1
            segment_frame_count = end_frame - start_frame + 1
            if segment_frame_count < time_dim:
                indices = list(range(start_frame, end_frame + 1))
                while len(indices) < time_dim:
                    indices.append(indices[-1])
            else:
                step = segment_frame_count / time_dim
                indices = [start_frame + int(i * step) for i in range(time_dim)]
            frame_list = []
            for idx in indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if not ret:
                    frame = np.zeros((height, width, 3), dtype=np.uint8)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                processed = preprocess_frame(frame_rgb)
                frame_list.append(processed)
        finally:
            if cap is not None:
                cap.release()
        os.unlink(raw_path)

    clip = np.stack(frame_list, axis=0)
    clip = np.transpose(clip, (0, 3, 1, 2))
    input_data = np.expand_dims(clip, axis=0).astype(np.float32)

    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()
    output_tensor = interpreter.get_tensor(output_details[0]['index'])

    if output_tensor.ndim == 0:
        raw = float(output_tensor)
    elif output_tensor.ndim == 1:
        idx = 1 if output_tensor.shape[0] >= 2 else 0
        raw = float(output_tensor[idx])
    elif output_tensor.ndim == 2:
        idx = 1 if output_tensor.shape[1] >= 2 else 0
        raw = float(output_tensor[0][idx])
    else:
        raw = float(output_tensor.flat[0])

    prob = 1 / (1 + np.exp(-np.clip(raw, -20, 20)))

    logger.info(f"[DEBUG] Fake probability: {prob:.6f}")
    logger.info(f"[DEBUG] Is Fake: {prob >= DECISION_THRESHOLD}")
    logger.info(f"[DEBUG] Confidence: {int(max(prob, 1-prob) * 100)}%")

    return {
        "probability": float(prob),
        "isFake": bool(prob >= DECISION_THRESHOLD),
        "confidence": int(max(prob, 1 - prob) * 100),
        "raw_logit": float(np.log(prob / (1 - prob + 1e-10))),
        "processing_time": time.time() - start_time,
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)