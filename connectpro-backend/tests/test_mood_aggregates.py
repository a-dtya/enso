# tests/test_mood_aggregates.py
from fastapi.testclient import TestClient  # type: ignore
import sys, os
from datetime import date, timedelta
import uuid
import pytest  # type: ignore
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
# Helper to insert test mood
# ------------------------
def insert_test_mood(user_id, company_id, project_id=None, mood_score=3, note="Test mood", entry_date=None):
    if entry_date is None:
        entry_date = date.today()
    payload = {
        "user_id": user_id,
        "company_id": company_id,
        "project_id": project_id,
        "mood_score": mood_score,
        "note": note,
        "entry_date": entry_date.isoformat()
    }
    supabase.table("employee_morale").insert(payload).execute()


# ------------------------
# Test company morale aggregation
# ------------------------
def test_company_morale_aggregation():
    user_id = os.getenv("TEST_USER_ID")
    # Cleanup
    supabase.table("employee_morale").delete().eq("user_id", user_id).execute()
    company_id = os.getenv("TEST_COMPANY_ID")
    project_id = os.getenv("TEST_PROJECT_ID", str(uuid.uuid4()))

    # Insert 3 test moods
    insert_test_mood(user_id, company_id, mood_score=3)
    insert_test_mood(user_id, company_id, mood_score=5, entry_date=date.today() - timedelta(days=1))
    insert_test_mood(user_id, company_id, mood_score=4, entry_date=date.today() - timedelta(days=2))
    insert_test_mood(user_id, company_id, project_id=project_id, mood_score=2, entry_date=date.today() - timedelta(days=3))
    insert_test_mood(user_id, company_id, project_id=project_id, mood_score=5, entry_date=date.today() - timedelta(days=4))
    insert_test_mood(user_id, company_id, project_id=project_id, mood_score=4, entry_date=date.today() - timedelta(days=5))

    # Call company aggregation endpoint
    response = client.get(f"/mood/company/{company_id}?range=weekly")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Check that average score exists and is numeric
    for entry in data:
        assert "avg_mood" in entry
        assert isinstance(entry["avg_mood"], (int, float))

    # Call project aggregation endpoint
    response = client.get(f"/mood/project/{project_id}?range=weekly")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Check that average score exists and is numeric
    for entry in data:
        assert "avg_mood" in entry
        assert isinstance(entry["avg_mood"], (int, float))

    # Cleanup
    supabase.table("employee_morale").delete().eq("user_id", user_id).execute()

