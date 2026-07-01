import { jest } from "@jest/globals";
import { ChatController } from "../src/controllers/ChatController.js";

describe("SH-188 - ChatController unit tests", () => {
    function mockResponse() {
        return {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    }

    function mockSocket() {
        const emit = jest.fn();
        const to = jest.fn(() => ({ emit }));
        return { io: { to }, to, emit };
    }

    it("converts conversation list query params to numbers", async () => {
        const chatService = {
            getConversations: jest.fn().mockResolvedValue([{ _id: "conversation-1" }]),
        };
        const controller = new ChatController({ chatService });
        const req = { user: { id: "user-1" }, query: { limit: "10", offset: "2" } };
        const res = mockResponse();

        await controller.getConversations(req, res);

        expect(chatService.getConversations).toHaveBeenCalledWith("user-1", {
            limit: 10,
            offset: 2,
        });
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [{ _id: "conversation-1" }],
        });
    });

    it("maps service errors to their HTTP status code", async () => {
        const error = new Error("Unauthorized");
        error.status = 403;
        const chatService = {
            getConversation: jest.fn().mockRejectedValue(error),
        };
        const controller = new ChatController({ chatService });
        const req = { user: { id: "user-1" }, params: { id: "conversation-1" } };
        const res = mockResponse();

        await controller.getConversation(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Unauthorized",
        });
    });

    it("converts message history query params before calling the service", async () => {
        const chatService = {
            getMessages: jest.fn().mockResolvedValue([{ _id: "message-1" }]),
        };
        const controller = new ChatController({ chatService });
        const req = {
            user: { id: "user-1" },
            params: { id: "conversation-1" },
            query: {
                limit: "25",
                before: "2026-06-30T00:00:00.000Z",
            },
        };
        const res = mockResponse();

        await controller.getMessages(req, res);

        expect(chatService.getMessages).toHaveBeenCalledWith("conversation-1", "user-1", {
            limit: 25,
            before: new Date("2026-06-30T00:00:00.000Z"),
        });
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [{ _id: "message-1" }],
        });
    });

    it("rejects direct conversation creation without target_id", async () => {
        const controller = new ChatController({ chatService: {} });
        const req = { user: { id: "user-1" }, body: { type: "direct" } };
        const res = mockResponse();

        await controller.createConversation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "target_id required for direct conversation",
        });
    });

    it("rejects group conversation creation without target_id", async () => {
        const controller = new ChatController({ chatService: {} });
        const req = { user: { id: "user-1" }, body: { type: "group" } };
        const res = mockResponse();

        await controller.createConversation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "target_id (group_id) required for group conversation",
        });
    });

    it("rejects unsupported conversation types", async () => {
        const controller = new ChatController({ chatService: {} });
        const req = { user: { id: "user-1" }, body: { type: "channel", target_id: "target-1" } };
        const res = mockResponse();

        await controller.createConversation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "type must be 'direct' or 'group'",
        });
    });

    it("creates a direct conversation through the service", async () => {
        const conversation = { _id: "conversation-1", type: "direct" };
        const chatService = {
            getOrCreateDirectConversation: jest.fn().mockResolvedValue(conversation),
        };
        const controller = new ChatController({ chatService });
        const req = { user: { id: "user-1" }, body: { type: "direct", target_id: "user-2" } };
        const res = mockResponse();

        await controller.createConversation(req, res);

        expect(chatService.getOrCreateDirectConversation).toHaveBeenCalledWith("user-1", "user-2");
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: conversation });
    });

    it("rejects message creation when content is missing", async () => {
        const controller = new ChatController({ chatService: {} });
        const req = { user: { id: "user-1" }, body: { conversation_id: "conversation-1" } };
        const res = mockResponse();

        await controller.sendMessage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "conversation_id and content are required",
        });
    });

    it("sends a message and emits socket events to receivers", async () => {
        const message = {
            _id: "message-1",
            conversation_id: "conversation-1",
            sender_id: "user-1",
            content: "hello",
            type: "text",
        };
        const chatService = {
            sendMessage: jest.fn().mockResolvedValue(message),
            getConversation: jest.fn().mockResolvedValue({
                _id: "conversation-1",
                participants: ["user-1", "user-2", "user-3"],
            }),
        };
        const socket = mockSocket();
        const controller = new ChatController({ chatService });
        const req = {
            user: { id: "user-1" },
            body: {
                conversation_id: "conversation-1",
                content: "hello",
                type: "text",
            },
            app: { locals: { io: socket.io } },
        };
        const res = mockResponse();

        await controller.sendMessage(req, res);

        expect(chatService.sendMessage).toHaveBeenCalledWith({
            sender_id: "user-1",
            conversation_id: "conversation-1",
            content: "hello",
            type: "text",
        });
        expect(socket.to).toHaveBeenCalledWith("user-2");
        expect(socket.to).toHaveBeenCalledWith("user-3");
        expect(socket.to).toHaveBeenCalledWith("conversation-1");
        expect(socket.emit).toHaveBeenCalledWith("conversation_update");
        expect(socket.emit).toHaveBeenCalledWith("receive_message", message);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("rejects direct messages without receiver_id", async () => {
        const controller = new ChatController({ chatService: {} });
        const req = { user: { id: "user-1" }, body: { content: "hello" } };
        const res = mockResponse();

        await controller.sendDirectMessage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "receiver_id and content are required",
        });
    });

    it("sends a direct message and emits socket events", async () => {
        const message = {
            _id: "message-1",
            conversation_id: "conversation-1",
            sender_id: "user-1",
            content: "hello",
            type: "text",
        };
        const chatService = {
            sendDirectMessage: jest.fn().mockResolvedValue(message),
            getConversation: jest.fn().mockResolvedValue({
                _id: "conversation-1",
                participants: ["user-1", "user-2"],
            }),
        };
        const socket = mockSocket();
        const controller = new ChatController({ chatService });
        const req = {
            user: { id: "user-1" },
            body: { receiver_id: "user-2", content: "hello" },
            app: { locals: { io: socket.io } },
        };
        const res = mockResponse();

        await controller.sendDirectMessage(req, res);

        expect(chatService.sendDirectMessage).toHaveBeenCalledWith({
            sender_id: "user-1",
            receiver_id: "user-2",
            content: "hello",
            type: "text",
        });
        expect(socket.to).toHaveBeenCalledWith("user-2");
        expect(socket.to).toHaveBeenCalledWith("conversation-1");
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns a delete confirmation after soft delete succeeds", async () => {
        const chatService = {
            deleteMessage: jest.fn().mockResolvedValue({ _id: "message-1" }),
        };
        const controller = new ChatController({ chatService });
        const req = { user: { id: "user-1" }, params: { id: "message-1" } };
        const res = mockResponse();

        await controller.deleteMessage(req, res);

        expect(chatService.deleteMessage).toHaveBeenCalledWith("message-1", "user-1");
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Message deleted",
        });
    });
});
