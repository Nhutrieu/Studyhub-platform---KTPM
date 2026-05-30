"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { chatService } from "@/services/chatService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { Chat, Message } from "@/lib/types";
import { FiMessageSquare, FiSend, FiUser, FiPlus, FiX, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function CustomerChatPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [newChatSubject, setNewChatSubject] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { data: myChats, isLoading: chatsLoading, refetch: refetchChats } = useQuery({
    queryKey: ["customer", "chats"],
    queryFn: () => chatService.getMyChats(),
  });

  const { data: selectedChat, refetch: refetchChat } = useQuery({
    queryKey: ["chat", selectedChatId],
    queryFn: () => chatService.getChat(selectedChatId || ""),
    enabled: !!selectedChatId,
  });

  const createChatMutation = useMutation({
    mutationFn: (subject?: string) => chatService.createOrGetChat({ subject }),
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: ["customer", "chats"] });
      const chatId = chat.id || chat._id || null;
      setSelectedChatId(chatId);
      setShowNewChat(false);
      setNewChatSubject("");
      toast.success("Đã tạo chat mới");
    },
    onError: (error: any) => {
      console.error("Create chat error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể tạo chat";
      toast.error(errorMessage);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (!selectedChatId) {
        throw new Error("Chưa chọn cuộc trò chuyện");
      }
      return chatService.sendMessage(selectedChatId, { message: content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ["customer", "chats"] });
      setMessage("");
      // Scroll to bottom of messages container only, not the whole page
      setTimeout(() => {
        if (messagesContainerRef.current && messagesEndRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    },
    onError: (error: any) => {
      console.error("Send message error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể gửi tin nhắn";
      toast.error(errorMessage);
    },
  });

  useEffect(() => {
    if (selectedChatId) {
      refetchChat();
      const interval = setInterval(() => {
        refetchChat();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChatId, refetchChat]);

  useEffect(() => {
    // Scroll to bottom of messages container only when messages change
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [selectedChat?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Vui lòng nhập tin nhắn");
      return;
    }
    if (!selectedChatId) {
      toast.error("Vui lòng chọn hoặc tạo cuộc trò chuyện");
      return;
    }
    sendMessageMutation.mutate(message);
  };

  const handleCreateChat = (e: React.FormEvent) => {
    e.preventDefault();
    createChatMutation.mutate(newChatSubject || undefined);
  };

  const closeChatMutation = useMutation({
    mutationFn: (chatId: string) => chatService.updateStatus(chatId, "closed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ["customer", "chats"] });
      toast.success("Đã đóng chat");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể đóng chat";
      toast.error(errorMessage);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: string) => chatService.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", "chats"] });
      setSelectedChatId(null);
      toast.success("Đã xóa chat");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể xóa chat";
      toast.error(errorMessage);
    },
  });

  const handleCloseChat = () => {
    if (!selectedChatId) return;
    if (confirm("Bạn có chắc muốn đóng chat này?")) {
      closeChatMutation.mutate(selectedChatId);
    }
  };

  const handleDeleteChat = () => {
    if (!selectedChatId) return;
    if (confirm("Bạn có chắc muốn xóa chat này? Hành động này không thể hoàn tác.")) {
      deleteChatMutation.mutate(selectedChatId);
    }
  };

  const messages = (selectedChat as Chat & { messages?: Message[] })?.messages || [];

  return (
    <PageShell>
      <PageHeader
        title="Hỗ trợ khách hàng"
        breadcrumbs={[
          { label: "Tài khoản", href: "/account" },
          { label: "Chat" },
        ]}
      />
      <main className="space-y-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
          {/* Chat List */}
          <Card className="overflow-hidden shadow-sm">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="p-4 border-b border-secondary-200 bg-secondary-50 flex items-center justify-between">
                <h3 className="font-semibold text-secondary-900">Cuộc trò chuyện</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewChat(!showNewChat)}
                  className="hover:bg-primary-50 hover:border-primary-300"
                >
                  <FiPlus className="w-4 h-4" />
                </Button>
              </div>
              {showNewChat && (
                <form onSubmit={handleCreateChat} className="p-4 border-b border-secondary-200 bg-white">
                  <input
                    type="text"
                    value={newChatSubject}
                    onChange={(e) => setNewChatSubject(e.target.value)}
                    placeholder="Chủ đề (tùy chọn)"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={createChatMutation.isPending}
                  >
                    Tạo chat mới
                  </Button>
                </form>
              )}
              <div className="flex-1 overflow-y-auto">
                {chatsLoading ? (
                  <div className="p-4 text-center text-secondary-500">Đang tải...</div>
                ) : !myChats || myChats.length === 0 ? (
                  <EmptyState
                    icon={<FiMessageSquare className="w-12 h-12 text-secondary-300" />}
                    title="Chưa có chat nào"
                    description="Tạo chat mới để bắt đầu"
                  />
                ) : (
                  <div className="divide-y divide-stone-200">
                    {myChats.map((chat: Chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChatId(chat.id)}
                        className={`w-full p-4 text-left hover:bg-secondary-50 transition-all duration-200 ${
                          selectedChatId === chat.id ? "bg-primary-50 border-l-4 border-primary-600" : "border-l-4 border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-secondary-900">
                              {chat.subject || "Chat hỗ trợ"}
                            </p>
                            <p className="text-xs text-secondary-500 mt-1">
                              {formatDistanceToNow(new Date(chat.lastMessageAt), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </p>
                          </div>
                          {chat.status === "open" && (
                            <Badge variant="success">Mở</Badge>
                          )}
                          {chat.status === "closed" && (
                            <Badge variant="default">Đã đóng</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Messages */}
          <Card className="lg:col-span-2 overflow-hidden shadow-sm">
            <CardContent className="p-0 h-full flex flex-col">
              {selectedChatId && selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-secondary-200 bg-gradient-to-r from-primary-50 to-secondary-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <FiUser className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-secondary-900">
                            {(selectedChat as Chat).subject || "Hỗ trợ khách hàng"}
                          </p>
                          <p className="text-xs text-secondary-500">
                            {(selectedChat as Chat).status === "open" ? "Đang mở" : "Đã đóng"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(selectedChat as Chat).status === "open" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCloseChat}
                            isLoading={closeChatMutation.isPending}
                          >
                            <FiX className="w-4 h-4 mr-1" />
                            Đóng chat
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteChat}
                          isLoading={deleteChatMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <FiTrash2 className="w-4 h-4 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {messages.length === 0 ? (
                      <div className="text-center text-secondary-500 py-8">
                        Chưa có tin nhắn nào
                      </div>
                    ) : (
                      messages.map((msg: Message | any) => {
                        const isCustomer = msg.senderRole === "customer" || msg.senderId === user?.id;
                        // Backend uses 'message' field, frontend may use 'content'
                        const messageContent = msg.message || msg.content || "";
                        // Backend uses 'sentAt', frontend may use 'createdAt'
                        const messageDate = msg.sentAt || msg.createdAt || new Date().toISOString();
                        return (
                          <div
                            key={msg.id || msg._id || Math.random()}
                            className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isCustomer
                                  ? "bg-primary-600 text-white"
                                  : "bg-secondary-100 text-secondary-900"
                              }`}
                            >
                              <p className="text-sm">{messageContent}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isCustomer ? "text-primary-100" : "text-secondary-500"
                                }`}
                              >
                                {new Date(messageDate).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  {(selectedChat as Chat).status === "open" && (
                    <form
                      onSubmit={handleSendMessage}
                      className="p-4 border-t border-secondary-200 bg-white"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Nhập tin nhắn..."
                          className="flex-1 px-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          isLoading={sendMessageMutation.isPending}
                          className="px-6"
                        >
                          <FiSend className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <EmptyState
                    icon={<FiMessageSquare className="w-16 h-16 text-secondary-300" />}
                    title="Chọn một cuộc trò chuyện"
                    description="Chọn chat từ danh sách bên trái hoặc tạo chat mới"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </PageShell>
  );
}

