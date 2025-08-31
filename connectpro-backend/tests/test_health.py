# tests/test_health.py
from fastapi.testclient import TestClient #type: ignore
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
