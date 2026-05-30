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
import { FiMessageSquare, FiSend, FiUser } from "react-icons/fi";
import { toast } from "react-toastify";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function ManagerChatPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { data: openChats, isLoading: chatsLoading, refetch: refetchChats } = useQuery({
    queryKey: ["manager", "chats", "open"],
    queryFn: () => chatService.getOpenChats(),
  });

  const { data: selectedChat, refetch: refetchChat } = useQuery({
    queryKey: ["chat", selectedChatId],
    queryFn: () => chatService.getChat(selectedChatId || ""),
    enabled: !!selectedChatId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(selectedChatId || "", { message: content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", selectedChatId] });
      queryClient.invalidateQueries({ queryKey: ["manager", "chats"] });
      setMessage("");
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể gửi tin nhắn";
      toast.error(errorMessage);
    },
  });

  const assignChatMutation = useMutation({
    mutationFn: () => chatService.assignToEmployee(selectedChatId || ""),
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["manager", "chats", "open"] });
      queryClient.invalidateQueries({ queryKey: ["chat", selectedChatId] });
      // Refetch selected chat immediately to get updated data
      if (selectedChatId) {
        refetchChat();
      }
      toast.success("Đã nhận chat");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể nhận chat";
      toast.error(errorMessage);
    },
  });

  const handleAssignChat = () => {
    if (!selectedChatId) return;
    assignChatMutation.mutate();
  };

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
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [selectedChat?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChatId) return;
    sendMessageMutation.mutate(message);
  };

  const messages = (selectedChat as Chat & { messages?: Message[] })?.messages || [];

  return (
    <PageShell>
      <PageHeader
        title="Chat với khách hàng"
        breadcrumbs={[
          { label: "Manager", href: "/manager" },
          { label: "Chat" },
        ]}
      />
      <main className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          {/* Chat List */}
          <Card className="overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="p-4 border-b border-stone-200">
                <h3 className="font-semibold">Danh sách chat</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chatsLoading ? (
                  <div className="p-4 text-center text-stone-500">Đang tải...</div>
                ) : !openChats || openChats.length === 0 ? (
                  <EmptyState
                    icon={<FiMessageSquare className="w-12 h-12 text-stone-300" />}
                    title="Chưa có chat nào"
                    description="Chat mới sẽ hiển thị tại đây"
                  />
                ) : (
                  <div className="divide-y divide-stone-200">
                    {openChats.map((chat: Chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChatId(chat.id)}
                        className={`w-full p-4 text-left hover:bg-stone-50 transition-colors ${
                          selectedChatId === chat.id ? "bg-emerald-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-stone-900">
                              {chat.customerName}
                            </p>
                            <p className="text-xs text-stone-500 mt-1">
                              {formatDistanceToNow(new Date(chat.lastMessageAt), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </p>
                          </div>
                          {chat.status === "open" && (
                            <Badge variant="warning">Mới</Badge>
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
          <Card className="lg:col-span-2 overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col">
              {selectedChatId && selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-stone-200 bg-gradient-to-r from-emerald-50 to-stone-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <FiUser className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">
                            {(selectedChat as Chat).customerName}
                          </p>
                          <p className="text-xs text-stone-500">
                            {(selectedChat as Chat).status === "open" && !(selectedChat as Chat).employeeId
                              ? "Chưa được nhận"
                              : (selectedChat as Chat).status === "open" ? "Đang xử lý" : "Đã đóng"}
                          </p>
                        </div>
                      </div>
                      {!(selectedChat as Chat).employeeId && (selectedChat as Chat).status === "open" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleAssignChat}
                          isLoading={assignChatMutation.isPending}
                        >
                          Nhận chat
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {messages.length === 0 ? (
                      <div className="text-center text-stone-500 py-8">
                        Chưa có tin nhắn nào
                      </div>
                    ) : (
                      messages.map((msg: Message | any) => {
                        const isManager = msg.senderRole === "branch_manager" || msg.senderId === user?.id;
                        // Backend uses 'message' field, frontend may use 'content'
                        const messageContent = msg.message || msg.content || "";
                        // Backend uses 'sentAt', frontend may use 'createdAt'
                        const messageDate = msg.sentAt || msg.createdAt || new Date().toISOString();
                        return (
                          <div
                            key={msg.id || msg._id || Math.random()}
                            className={`flex ${isManager ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isManager
                                  ? "bg-emerald-600 text-white"
                                  : "bg-stone-100 text-stone-900"
                              }`}
                            >
                              <p className="text-sm">{messageContent}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  isManager ? "text-emerald-100" : "text-stone-500"
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
                  {(selectedChat as Chat).status === "open" && (selectedChat as Chat).employeeId && (
                    <form
                      onSubmit={handleSendMessage}
                      className="p-4 border-t border-stone-200 bg-stone-50"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Nhập tin nhắn..."
                          className="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          isLoading={sendMessageMutation.isPending}
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
                    icon={<FiMessageSquare className="w-16 h-16 text-stone-300" />}
                    title="Chọn một cuộc trò chuyện"
                    description="Chọn chat từ danh sách bên trái để bắt đầu"
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

