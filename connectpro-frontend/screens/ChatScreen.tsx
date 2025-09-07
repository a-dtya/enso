import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, Alert } from 'react-native';
import { GiftedChat, IMessage, User } from 'react-native-gifted-chat';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { apiService } from '../services/api';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function ChatScreen({ route }: Props) {
  const { chatId, recipientId, recipientName } = route.params;
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [activeChatId, setActiveChatId] = useState<string | null>(chatId || null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (activeChatId) {
      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel(`chat_messages:${activeChatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_id=eq.${activeChatId}`,
          },
          (payload) => {
            const newMessage = payload.new as ChatMessage;
            // Only add message if it's not from current user (to avoid duplicates)
            if (newMessage.sender_id !== currentUserId) {
              const giftedMessage = convertToGiftedMessage(newMessage);
              setMessages((previousMessages) =>
                GiftedChat.append(previousMessages, [giftedMessage])
              );
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [activeChatId, currentUserId]);

  async function initializeChat() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      setCurrentUserId(session.user.id);

      let finalChatId = chatId;

      // If no chatId provided, create or get existing chat
      if (!chatId) {
        const existingChat = await apiService.getOrCreateChat(
          recipientId,
          session.access_token
        );
        finalChatId = existingChat.id;
        setActiveChatId(existingChat.id);
      }

      // Load existing messages
      if (finalChatId) {
        const chatMessages = await apiService.getChatMessages(
          finalChatId,
          session.access_token
        );
        
        const giftedMessages = chatMessages.map(convertToGiftedMessage);
        setMessages(giftedMessages);

        // Mark messages as read
        await apiService.markMessagesAsRead(finalChatId, session.access_token);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load chat');
      console.error('Initialize chat error:', error);
    }
  }

  function convertToGiftedMessage(message: ChatMessage): IMessage {
    return {
      _id: message.id,
      text: message.content,
      createdAt: new Date(message.created_at),
      user: {
        _id: message.sender_id,
        name: message.sender_id === currentUserId ? 'You' : recipientName,
      },
    };
  }

  const onSend = useCallback(async (messages: IMessage[] = []) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const message = messages[0];
      let finalChatId = activeChatId;

      // Create chat if it doesn't exist
      if (!finalChatId) {
        const newChat = await apiService.getOrCreateChat(
          recipientId,
          session.access_token
        );
        finalChatId = newChat.id;
        setActiveChatId(newChat.id);
      }

      // Send message to backend
      await apiService.sendMessage(
        finalChatId,
        message.text,
        session.access_token
      );

      // Update local state immediately for smooth UX
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, messages)
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      console.error('Send message error:', error);
    }
  }, [activeChatId, recipientId]);

  const user: User = {
    _id: currentUserId,
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={user}
        placeholder="Type a message..."
        renderUsernameOnMessage={false}
        showUserAvatar={false}
        alwaysShowSend
        scrollToBottom
        scrollToBottomStyle={{
          backgroundColor: '#6366f1',
        }}
        textInputStyle={{
          backgroundColor: '#f9fafb',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          paddingHorizontal: 16,
          paddingTop: 8,
          marginRight: 8,
        }}
        sendButtonProps={{
          style: {
            backgroundColor: '#6366f1',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginRight: 8,
            marginBottom: 8,
          },
        }}
        messagesContainerStyle={{
          backgroundColor: '#ffffff',
        }}
        bottomOffset={0}
      />
    </SafeAreaView>
  );
}