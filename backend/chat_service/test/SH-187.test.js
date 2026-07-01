import { jest } from "@jest/globals";
import { ChatService } from "../src/services/ChatService.js";

describe("SH-187 - ChatService unit tests", () => {
    let chatService;
    let conversationRepo;
    let messageRepo;

    beforeEach(() => {
        conversationRepo = {
            findByParticipant: jest.fn(),
            findDirectConversation: jest.fn(),
            findGroupConversation: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateLastMessage: jest.fn(),
        };
        messageRepo = {
            findByConversation: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            softDelete: jest.fn(),
        };
        chatService = new ChatService({ conversationRepo, messageRepo });
    });

    it("gets conversations with explicit pagination", async () => {
        const conversations = [{ _id: "conversation-1" }];
        conversationRepo.findByParticipant.mockResolvedValue(conversations);

        const result = await chatService.getConversations("user-1", { limit: 10, offset: 5 });

        expect(conversationRepo.findByParticipant).toHaveBeenCalledWith("user-1", {
            limit: 10,
            offset: 5,
        });
        expect(result).toBe(conversations);
    });

    it("gets conversations with default pagination", async () => {
        conversationRepo.findByParticipant.mockResolvedValue([]);

        await chatService.getConversations("user-1");

        expect(conversationRepo.findByParticipant).toHaveBeenCalledWith("user-1", {
            limit: 50,
            offset: 0,
        });
    });

    it("returns an existing direct conversation without creating a duplicate", async () => {
        const existingConversation = {
            _id: "conversation-1",
            type: "direct",
            participants: ["user-1", "user-2"],
        };
        conversationRepo.findDirectConversation.mockResolvedValue(existingConversation);

        const result = await chatService.getOrCreateDirectConversation("user-1", "user-2");

        expect(conversationRepo.findDirectConversation).toHaveBeenCalledWith("user-1", "user-2");
        expect(conversationRepo.create).not.toHaveBeenCalled();
        expect(result).toBe(existingConversation);
    });

    it("creates a direct conversation when none exists", async () => {
        const createdConversation = {
            _id: "conversation-2",
            type: "direct",
            participants: ["user-1", "user-2"],
        };
        conversationRepo.findDirectConversation.mockResolvedValue(null);
        conversationRepo.create.mockResolvedValue(createdConversation);

        const result = await chatService.getOrCreateDirectConversation("user-1", "user-2");

        expect(conversationRepo.create).toHaveBeenCalledWith({
            type: "direct",
            participants: ["user-1", "user-2"],
        });
        expect(result).toBe(createdConversation);
    });

    it("returns an existing group conversation by target id", async () => {
        const existingConversation = {
            _id: "group-conversation-1",
            type: "group",
            target_id: "group-1",
            participants: ["user-1", "user-2"],
        };
        conversationRepo.findGroupConversation.mockResolvedValue(existingConversation);

        const result = await chatService.getOrCreateGroupConversation("group-1", ["user-1"]);

        expect(conversationRepo.findGroupConversation).toHaveBeenCalledWith("group-1");
        expect(conversationRepo.create).not.toHaveBeenCalled();
        expect(result).toBe(existingConversation);
    });

    it("creates a group conversation when none exists", async () => {
        const participants = ["user-1", "user-2"];
        const createdConversation = {
            _id: "group-conversation-2",
            type: "group",
            target_id: "group-2",
            participants,
        };
        conversationRepo.findGroupConversation.mockResolvedValue(null);
        conversationRepo.create.mockResolvedValue(createdConversation);

        const result = await chatService.getOrCreateGroupConversation("group-2", participants);

        expect(conversationRepo.create).toHaveBeenCalledWith({
            type: "group",
            target_id: "group-2",
            participants,
        });
        expect(result).toBe(createdConversation);
    });

    it("gets a conversation when the requester is a participant", async () => {
        const conversation = { _id: "conversation-1", participants: ["user-1", "user-2"] };
        conversationRepo.findById.mockResolvedValue(conversation);

        const result = await chatService.getConversation("conversation-1", "user-1");

        expect(conversationRepo.findById).toHaveBeenCalledWith("conversation-1");
        expect(result).toBe(conversation);
    });

    it("rejects a missing conversation", async () => {
        conversationRepo.findById.mockResolvedValue(null);

        await expect(chatService.getConversation("missing", "user-1")).rejects.toMatchObject({
            message: "Conversation not found",
            status: 404,
        });
    });

    it("rejects a conversation requester who is not a participant", async () => {
        conversationRepo.findById.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-2"],
        });

        await expect(chatService.getConversation("conversation-1", "user-1")).rejects.toMatchObject({
            message: "Unauthorized",
            status: 403,
        });
    });

    it("gets messages when the requester is a participant", async () => {
        const before = new Date("2026-06-30T00:00:00.000Z");
        const messages = [{ _id: "message-1" }];
        conversationRepo.findById.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-1", "user-2"],
        });
        messageRepo.findByConversation.mockResolvedValue(messages);

        const result = await chatService.getMessages("conversation-1", "user-1", {
            limit: 20,
            before,
        });

        expect(messageRepo.findByConversation).toHaveBeenCalledWith("conversation-1", {
            limit: 20,
            before,
        });
        expect(result).toBe(messages);
    });

    it("rejects message history access for non-participants", async () => {
        conversationRepo.findById.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-2"],
        });

        await expect(chatService.getMessages("conversation-1", "user-1")).rejects.toMatchObject({
            message: "Unauthorized",
            status: 403,
        });
    });

    it("creates a message and updates the last message pointer", async () => {
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

    it("passes image and file message types to the repository", async () => {
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

    it("rejects sending to a missing conversation", async () => {
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

    it("rejects group messages when the group conversation is missing", async () => {
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

    it("soft deletes a message when the requester is the sender", async () => {
        const deletedMessage = {
            _id: "message-1",
            sender_id: "user-1",
            deleted_at: new Date("2026-06-30T00:00:00.000Z"),
        };
        messageRepo.findById.mockResolvedValue({
            _id: "message-1",
            sender_id: "user-1",
        });
        messageRepo.softDelete.mockResolvedValue(deletedMessage);

        const result = await chatService.deleteMessage("message-1", "user-1");

        expect(messageRepo.findById).toHaveBeenCalledWith("message-1");
        expect(messageRepo.softDelete).toHaveBeenCalledWith("message-1");
        expect(result).toBe(deletedMessage);
    });

    it("rejects deleting another user's message", async () => {
        messageRepo.findById.mockResolvedValue({
            _id: "message-1",
            sender_id: "user-2",
        });

        await expect(chatService.deleteMessage("message-1", "user-1")).rejects.toMatchObject({
            message: "Unauthorized",
            status: 403,
        });
    });
});
