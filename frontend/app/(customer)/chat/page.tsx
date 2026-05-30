"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "@/store/authStore";
import PageShell from "@/components/layouts/PageShell";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { FiSend, FiUser, FiHeadphones } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

export default function ChatPage() {
    const { user } = useAuthStore();
    const [message, setMessage] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch conversation history
    const { data: messages, refetch } = useQuery<ChatMessage[]>({
        queryKey: ["chat-messages", "support"],
        queryFn: () => chatService.getMessages("support"), // Assuming 'support' is the general channel or create new
        refetchInterval: 3000, // Simple polling for demo
    });

    const sendMessageMutation = useMutation({
        mutationFn: (content: string) => chatService.sendMessage("support", { message: content }),
        onSuccess: () => {
            setMessage("");
            refetch();
        }
    });

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        sendMessageMutation.mutate(message);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <PageShell className="h-[calc(100vh-80px)] py-4">
            <div className="flex flex-col h-full bg-white rounded-2xl shadow-premium overflow-hidden border border-secondary-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <FiHeadphones className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-secondary-900">Hỗ trợ khách hàng</h1>
                        <p className="text-xs text-secondary-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" /> Trực tuyến
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-secondary-50/30" ref={scrollRef}>
                    {messages && messages.length > 0 ? (
                        messages.map((msg, index) => {
                            const isMe = msg.senderId === user?.id;
                            const messageText = msg.content ?? msg.message;
                            const messageTimestamp = msg.createdAt ?? msg.sentAt;
                            const formattedTime = messageTimestamp
                              ? new Date(messageTimestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "";
                            return (
                                <div key={`msg-${index}-${msg.sentAt}`} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
                                        isMe
                                            ? "bg-primary-600 text-white rounded-br-none"
                                            : "bg-white text-secondary-900 border border-secondary-100 rounded-bl-none"
                                    )}>
                                        <p className="text-sm">{messageText}</p>
                                        <p className={cn("text-[10px] mt-1 text-right opacity-70", isMe ? "text-primary-100" : "text-secondary-400")}>
                                            {formattedTime}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-secondary-400">
                            <FiHeadphones className="w-16 h-16 mb-4 opacity-20" />
                            <p>Bắt đầu cuộc trò chuyện với chúng tôi</p>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-secondary-100 bg-white">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1"
                            autoFocus
                        />
                        <Button type="submit" variant="primary" disabled={sendMessageMutation.isPending || !message.trim()} className="px-6">
                            <FiSend />
                        </Button>
                    </form>
                </div>
            </div>
        </PageShell>
    );
}
