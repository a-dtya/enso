# tests/test_mood.py
from fastapi.testclient import TestClient  # type: ignore
import sys, os
from datetime import date
import uuid
import pytest # type: ignore
from dotenv import load_dotenv  # type: ignore

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app, get_current_user  # import the dependency
from supabase import create_client  # type: ignore

load_dotenv()
client = TestClient(app)

# ------------------------
# Fake user for testing
# ------------------------
class FakeUser:
    def __init__(self, id, company_id):
        self.id = id
        self.company_id = company_id


@pytest.fixture(autouse=True)
def override_user_dependency(monkeypatch):
    user_id = os.getenv("TEST_USER_ID", str(uuid.uuid4()))
    company_id = os.getenv("TEST_COMPANY_ID", str(uuid.uuid4()))

    async def fake_get_current_user():
        return FakeUser(user_id, company_id)

    app.dependency_overrides[get_current_user] = fake_get_current_user
    yield
    app.dependency_overrides.clear()


# ------------------------
# Supabase client
# ------------------------
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))


# ------------------------
# Integration test for mood
# ------------------------
def test_log_and_duplicate_mood():
    # Use same user as in dependency override
    user_id = os.getenv("TEST_USER_ID")
    # Cleanup test data
    supabase.table("employee_morale").delete().eq("user_id", user_id).execute()
    company_id = os.getenv("TEST_COMPANY_ID")

    # Ensure profile exists
    profile = supabase.table("profiles").select("company_id").eq("id", user_id).execute().data
    if not profile or profile[0]["company_id"] != company_id:
        # Test failed
        assert False, "Test user profile does not exist in the database."

    payload = {"mood_score": 3, "note": "Integration test"}

    # 1st attempt → should succeed
    r1 = client.post("/mood", json=payload)
    assert r1.status_code == 200
    data1 = r1.json()
    assert "entry" in data1
    assert data1["entry"]["mood_score"] == 3

    # 2nd attempt same day → should fail with 400
    r2 = client.post("/mood", json=payload)
    assert r2.status_code == 400
    assert r2.json()["detail"] == "Mood already logged for today"

    # Cleanup test data
    supabase.table("employee_morale").delete().eq("user_id", user_id).execute()
