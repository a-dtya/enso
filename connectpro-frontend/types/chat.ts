export interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_content: string | null;
  last_message_time: string | null;
  updated_at: string;
  other_participant: {
    id: string;
    full_name: string;
    role?: string;
  };
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}