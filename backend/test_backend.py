import io

from fastapi.testclient import TestClient
from PIL import Image

from server import app

client = TestClient(app)


def create_test_jpeg() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (320, 240), "white").save(buffer, format="JPEG")
    return buffer.getvalue()


def test_status() -> None:
    response = client.get("/status")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_image_upload() -> None:
    response = client.post(
        "/test-image",
        files={"file": ("test.jpg", create_test_jpeg(), "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["width"] == 320
    assert body["height"] == 240
