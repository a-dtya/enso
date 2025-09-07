from fastapi.testclient import TestClient  # type: ignore
import sys, os
import uuid
import pytest  # type: ignore
from datetime import datetime
from dotenv import load_dotenv  # type: ignore

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app, get_current_user
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
# Helpers
# ------------------------
def cleanup_chat(chat_id: str):
    supabase.table("chat_messages").delete().eq("chat_id", chat_id).execute()
    supabase.table("chats").delete().eq("id", chat_id).execute()


# ------------------------
# Tests
# ------------------------
def test_chat_flow():
    user_id = os.getenv("TEST_USER_ID")
    recipient_id = os.getenv("TEST_RECIPIENT_ID", str(uuid.uuid4()))
    # 1. Create/get chat
    response = client.post("/chats/with-user", json={"recipient_id": recipient_id})
    assert response.status_code == 200
    chat = response.json()
    chat_id = chat["id"]
    assert chat["participant1_id"] == user_id or chat["participant2_id"] == user_id

    # 2. Send a message
    response = client.post(f"/chats/{chat_id}/messages", json={"content": "Hello!"})
    assert response.status_code == 200
    message = response.json()
    assert message["content"] == "Hello!"
    assert message["chat_id"] == chat_id
    assert message["sender_id"] == user_id

    # 3. Get messages
    response = client.get(f"/chats/{chat_id}/messages")
    assert response.status_code == 200
    messages = response.json()
    assert isinstance(messages, list)
    assert len(messages) > 0
    assert messages[0]["content"] == "Hello!"

    # 4. Mark as read
    response = client.put(f"/chats/{chat_id}/read")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Messages marked as read"

    # 5. Get user chats
    response = client.get("/chats")
    assert response.status_code == 200
    chats = response.json()
    assert isinstance(chats, list)
    assert any(c["id"] == chat_id for c in chats)

    # Cleanup
    cleanup_chat(chat_id)
