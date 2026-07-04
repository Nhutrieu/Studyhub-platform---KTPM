import { jest } from "@jest/globals";

jest.unstable_mockModule("jsonwebtoken", () => ({
    default: {
        verify: jest.fn(() => ({ id: "user-1", role: "user" })),
    },
}));

const request = (await import("supertest")).default;
const express = (await import("express")).default;
const { createChatRouter } = await import("../src/routes/chatRoutes.js");

describe("SH-190 - Chat router integration tests", () => {
    let app;
    let chatService;
    let emit;
    let to;

    beforeEach(() => {
        emit = jest.fn();
        to = jest.fn(() => ({ emit }));
        chatService = {
            getConversations: jest.fn().mockResolvedValue([{ _id: "conversation-1" }]),
            getConversation: jest.fn().mockResolvedValue({
                _id: "conversation-1",
                participants: ["user-1", "user-2"],
            }),
            getMessages: jest.fn().mockResolvedValue([{ _id: "message-1" }]),
            getOrCreateDirectConversation: jest.fn().mockResolvedValue({ _id: "conversation-1" }),
            getOrCreateGroupConversation: jest.fn().mockResolvedValue({ _id: "group-conversation-1" }),
            sendMessage: jest.fn().mockResolvedValue({
                _id: "message-1",
                conversation_id: "conversation-1",
                sender_id: "user-1",
                content: "hello",
            }),
            sendDirectMessage: jest.fn().mockResolvedValue({
                _id: "message-2",
                conversation_id: "conversation-1",
                sender_id: "user-1",
                content: "hello",
            }),
            deleteMessage: jest.fn().mockResolvedValue({ _id: "message-1" }),
        };

        app = express();
        app.use(express.json());
        app.locals.io = { to };
        app.use("/chat", createChatRouter({ chatService }));
    });

    it("requires authentication before reaching chat routes", async () => {
        const res = await request(app).get("/chat/conversations");

        expect(res.status).toBe(401);
        expect(chatService.getConversations).not.toHaveBeenCalled();
    });

    it("routes GET /conversations to ChatController.getConversations", async () => {
        const res = await request(app)
            .get("/chat/conversations?limit=5&offset=1")
            .set("Authorization", "Bearer valid-token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, data: [{ _id: "conversation-1" }] });
        expect(chatService.getConversations).toHaveBeenCalledWith("user-1", {
            limit: 5,
            offset: 1,
        });
    });

    it("routes GET /conversations/:id to ChatController.getConversation", async () => {
        const res = await request(app)
            .get("/chat/conversations/conversation-1")
            .set("Authorization", "Bearer valid-token");

        expect(res.status).toBe(200);
        expect(chatService.getConversation).toHaveBeenCalledWith("conversation-1", "user-1");
    });

    it("routes POST /conversations for direct conversations", async () => {
        const res = await request(app)
            .post("/chat/conversations")
            .set("Authorization", "Bearer valid-token")
            .send({ type: "direct", target_id: "user-2" });

        expect(res.status).toBe(201);
        expect(chatService.getOrCreateDirectConversation).toHaveBeenCalledWith("user-1", "user-2");
    });

    it("routes POST /conversations for group conversations", async () => {
        const res = await request(app)
            .post("/chat/conversations")
            .set("Authorization", "Bearer valid-token")
            .send({ type: "group", target_id: "group-1", participant_ids: ["user-1"] });

        expect(res.status).toBe(201);
        expect(chatService.getOrCreateGroupConversation).toHaveBeenCalledWith("group-1", ["user-1"]);
    });

    it("routes GET /conversations/:id/messages to ChatController.getMessages", async () => {
        const res = await request(app)
            .get("/chat/conversations/conversation-1/messages?limit=10")
            .set("Authorization", "Bearer valid-token");

        expect(res.status).toBe(200);
        expect(chatService.getMessages).toHaveBeenCalledWith("conversation-1", "user-1", {
            limit: 10,
            before: null,
        });
    });

    it("routes POST /messages and emits message events", async () => {
        const res = await request(app)
            .post("/chat/messages")
            .set("Authorization", "Bearer valid-token")
            .send({ conversation_id: "conversation-1", content: "hello" });

        expect(res.status).toBe(201);
        expect(chatService.sendMessage).toHaveBeenCalledWith({
            sender_id: "user-1",
            conversation_id: "conversation-1",
            content: "hello",
            type: "text",
        });
        expect(to).toHaveBeenCalledWith("user-2");
        expect(to).toHaveBeenCalledWith("conversation-1");
        expect(emit).toHaveBeenCalledWith("receive_message", expect.objectContaining({ _id: "message-1" }));
    });

    it("routes POST /messages/direct and emits message events", async () => {
        const res = await request(app)
            .post("/chat/messages/direct")
            .set("Authorization", "Bearer valid-token")
            .send({ receiver_id: "user-2", content: "hello" });

        expect(res.status).toBe(201);
        expect(chatService.sendDirectMessage).toHaveBeenCalledWith({
            sender_id: "user-1",
            receiver_id: "user-2",
            content: "hello",
            type: "text",
        });
        expect(to).toHaveBeenCalledWith("user-2");
        expect(to).toHaveBeenCalledWith("conversation-1");
    });

    it("routes DELETE /messages/:id to ChatController.deleteMessage", async () => {
        const res = await request(app)
            .delete("/chat/messages/message-1")
            .set("Authorization", "Bearer valid-token");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, message: "Message deleted" });
        expect(chatService.deleteMessage).toHaveBeenCalledWith("message-1", "user-1");
    });
});
