import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Chat, ChatMessage, Message } from "@/lib/types";

interface ChatWithMessages extends Omit<Chat, "messages"> {
  messages?: ChatMessage[];
}

interface CreateChatData {
  subject?: string;
  initialMessage?: string;
}

interface SendMessageData {
  message: string; // Backend uses 'message' field
  content?: string; // Alias for backward compatibility
  type?: "text" | "image" | "file";
}

export const chatService = {
  createOrGetChat: async (data?: CreateChatData): Promise<Chat> => {
    const response = await apiClient.post<Chat>(endpoints.chat.create, data);
    return response.data;
  },

  getMyChats: async (): Promise<Chat[]> => {
    const response = await apiClient.get<Chat[]>(endpoints.chat.myChats);
    return response.data;
  },

  getOpenChats: async (): Promise<Chat[]> => {
    const response = await apiClient.get<Chat[]>(endpoints.chat.open);
    return response.data;
  },

  getChat: async (chatId: string): Promise<Chat> => {
    const response = await apiClient.get<Chat>(endpoints.chat.detail(chatId));
    return response.data;
  },

  getMessages: async (chatId: string): Promise<ChatMessage[]> => {
    // Messages are included in chat detail, or can be fetched separately if needed
    const chat = await chatService.getChat(chatId);
    return (chat as ChatWithMessages).messages || [];
  },

  sendMessage: async (chatId: string, data: SendMessageData): Promise<Message> => {
    // Ensure message field is set (backend requires 'message', not 'content')
    const payload = {
      message: data.message || data.content || "",
      type: data.type || "text",
    };
    const response = await apiClient.post<Message>(endpoints.chat.sendMessage(chatId), payload);
    return response.data;
  },

  assignToEmployee: async (chatId: string): Promise<Chat> => {
    const response = await apiClient.put<Chat>(endpoints.chat.assign(chatId));
    return response.data;
  },

  updateStatus: async (chatId: string, status: "open" | "assigned" | "closed"): Promise<Chat> => {
    const response = await apiClient.put<Chat>(endpoints.chat.updateStatus(chatId), { status });
    return response.data;
  },

  markAsRead: async (chatId: string): Promise<void> => {
    await apiClient.put(endpoints.chat.markAsRead(chatId));
  },

  deleteChat: async (chatId: string): Promise<void> => {
    await apiClient.delete(endpoints.chat.delete(chatId));
  },
};

