# tests/test_health.py
from fastapi.testclient import TestClient #type: ignore
from main import app  # adjust import if your FastAPI app is in a different file

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
