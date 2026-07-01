import { jest } from "@jest/globals";
import { ChatService } from "../src/services/ChatService.js";
import { ChatController } from "../src/controllers/ChatController.js";

describe("StudyHub - SH-75 - Message history white-box tests", () => {
    let chatService;
    let conversationRepo;
    let messageRepo;

    beforeEach(() => {
        conversationRepo = {
            findById: jest.fn(),
        };
        messageRepo = {
            findByConversation: jest.fn(),
        };
        chatService = new ChatService({ conversationRepo, messageRepo });
    });

    it("loads messages when the requester is a participant", async () => {
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

    it("throws 404 when the conversation does not exist", async () => {
        conversationRepo.findById.mockResolvedValue(null);

        await expect(chatService.getMessages("missing", "user-1")).rejects.toMatchObject({
            message: "Conversation not found",
            status: 404,
        });
    });

    it("throws 403 when the requester is not a participant", async () => {
        conversationRepo.findById.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-2"],
        });

        await expect(chatService.getMessages("conversation-1", "user-1")).rejects.toMatchObject({
            message: "Unauthorized",
            status: 403,
        });
    });

    it("controller converts message history query values before calling the service", async () => {
        const chatServiceMock = {
            getMessages: jest.fn().mockResolvedValue([{ _id: "message-1" }]),
        };
        const controller = new ChatController({ chatService: chatServiceMock });
        const req = {
            user: { id: "user-1" },
            params: { id: "conversation-1" },
            query: {
                limit: "25",
                before: "2026-06-30T00:00:00.000Z",
            },
        };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        await controller.getMessages(req, res);

        expect(chatServiceMock.getMessages).toHaveBeenCalledWith("conversation-1", "user-1", {
            limit: 25,
            before: new Date("2026-06-30T00:00:00.000Z"),
        });
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [{ _id: "message-1" }],
        });
    });
});
