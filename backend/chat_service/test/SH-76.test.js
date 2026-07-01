import { jest } from "@jest/globals";
import { ChatService } from "../src/services/ChatService.js";
import { ChatController } from "../src/controllers/ChatController.js";

describe("StudyHub - SH-76 - Send message white-box tests", () => {
    let chatService;
    let conversationRepo;
    let messageRepo;

    beforeEach(() => {
        conversationRepo = {
            findById: jest.fn(),
            findDirectConversation: jest.fn(),
            findGroupConversation: jest.fn(),
            create: jest.fn(),
            updateLastMessage: jest.fn(),
        };
        messageRepo = {
            create: jest.fn(),
        };
        chatService = new ChatService({ conversationRepo, messageRepo });
    });

    it("creates a message and updates last_message_id", async () => {
        const message = {
            _id: "message-1",
            conversation_id: "conversation-1",
            sender_id: "user-1",
            content: "hello",
            type: "text",
        };
        conversationRepo.findById.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-1", "user-2"],
        });
        messageRepo.create.mockResolvedValue(message);

        const result = await chatService.sendMessage({
            sender_id: "user-1",
            conversation_id: "conversation-1",
            content: "hello",
            type: "text",
        });

        expect(messageRepo.create).toHaveBeenCalledWith({
            sender_id: "user-1",
            conversation_id: "conversation-1",
            content: "hello",
            type: "text",
        });
        expect(conversationRepo.updateLastMessage).toHaveBeenCalledWith("conversation-1", "message-1");
        expect(result).toBe(message);
    });

    it("accepts image and file message types through the service path", async () => {
        conversationRepo.findById.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-1", "user-2"],
        });
        messageRepo.create
            .mockResolvedValueOnce({ _id: "image-message", type: "image" })
            .mockResolvedValueOnce({ _id: "file-message", type: "file" });

        await chatService.sendMessage({
            sender_id: "user-1",
            conversation_id: "conversation-1",
            content: "https://example.com/image.png",
            type: "image",
        });
        await chatService.sendMessage({
            sender_id: "user-1",
            conversation_id: "conversation-1",
            content: "https://example.com/file.pdf",
            type: "file",
        });

        expect(messageRepo.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: "image" }));
        expect(messageRepo.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: "file" }));
    });

    it("throws 404 when sending to a missing conversation", async () => {
        conversationRepo.findById.mockResolvedValue(null);

        await expect(chatService.sendMessage({
            sender_id: "user-1",
            conversation_id: "missing",
            content: "hello",
        })).rejects.toMatchObject({
            message: "Conversation not found",
            status: 404,
        });

        expect(messageRepo.create).not.toHaveBeenCalled();
    });

    it("throws 403 when the sender is not a participant", async () => {
        conversationRepo.findById.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-2"],
        });

        await expect(chatService.sendMessage({
            sender_id: "user-1",
            conversation_id: "conversation-1",
            content: "hello",
        })).rejects.toMatchObject({
            message: "Unauthorized",
            status: 403,
        });
    });

    it("creates a direct conversation before sending a direct message when needed", async () => {
        const conversation = {
            _id: "conversation-1",
            type: "direct",
            participants: ["user-1", "user-2"],
        };
        const message = {
            _id: "message-1",
            conversation_id: "conversation-1",
            sender_id: "user-1",
            content: "hello",
            type: "text",
        };
        conversationRepo.findDirectConversation.mockResolvedValue(null);
        conversationRepo.create.mockResolvedValue(conversation);
        conversationRepo.findById.mockResolvedValue(conversation);
        messageRepo.create.mockResolvedValue(message);

        const result = await chatService.sendDirectMessage({
            sender_id: "user-1",
            receiver_id: "user-2",
            content: "hello",
        });

        expect(conversationRepo.create).toHaveBeenCalledWith({
            type: "direct",
            participants: ["user-1", "user-2"],
        });
        expect(result).toBe(message);
    });

    it("throws 404 when the group conversation does not exist", async () => {
        conversationRepo.findGroupConversation.mockResolvedValue(null);

        await expect(chatService.sendGroupMessage({
            sender_id: "user-1",
            group_id: "group-1",
            content: "hello",
        })).rejects.toMatchObject({
            message: "Group conversation not found",
            status: 404,
        });
    });

    it("throws 403 when the sender is not in the group conversation", async () => {
        conversationRepo.findGroupConversation.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-2"],
        });

        await expect(chatService.sendGroupMessage({
            sender_id: "user-1",
            group_id: "group-1",
            content: "hello",
        })).rejects.toMatchObject({
            message: "Unauthorized",
            status: 403,
        });
    });

    it("controller rejects message creation when content is missing", async () => {
        const controller = new ChatController({ chatService });
        const req = {
            user: { id: "user-1" },
            body: { conversation_id: "conversation-1" },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await controller.sendMessage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "conversation_id and content are required",
        });
    });

    it("controller emits socket events to receivers and the conversation room", async () => {
        const message = {
            _id: "message-1",
            conversation_id: "conversation-1",
            sender_id: "user-1",
            content: "hello",
            type: "text",
        };
        const chatServiceMock = {
            sendMessage: jest.fn().mockResolvedValue(message),
            getConversation: jest.fn().mockResolvedValue({
                _id: "conversation-1",
                participants: ["user-1", "user-2", "user-3"],
            }),
        };
        const emit = jest.fn();
        const to = jest.fn(() => ({ emit }));
        const controller = new ChatController({ chatService: chatServiceMock });
        const req = {
            user: { id: "user-1" },
            body: {
                conversation_id: "conversation-1",
                content: "hello",
                type: "text",
            },
            app: {
                locals: {
                    io: { to },
                },
            },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await controller.sendMessage(req, res);

        expect(chatServiceMock.sendMessage).toHaveBeenCalledWith({
            sender_id: "user-1",
            conversation_id: "conversation-1",
            content: "hello",
            type: "text",
        });
        expect(to).toHaveBeenCalledWith("user-2");
        expect(to).toHaveBeenCalledWith("user-3");
        expect(to).toHaveBeenCalledWith("conversation-1");
        expect(emit).toHaveBeenCalledWith("conversation_update");
        expect(emit).toHaveBeenCalledWith("receive_message", message);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ success: true, data: message });
    });
});
