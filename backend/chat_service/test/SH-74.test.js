import { jest } from "@jest/globals";
import { ChatService } from "../src/services/ChatService.js";
import { ChatController } from "../src/controllers/ChatController.js";

describe("StudyHub - SH-74 - Conversation detail white-box tests", () => {
    let chatService;
    let conversationRepo;
    let messageRepo;

    beforeEach(() => {
        conversationRepo = {
            findById: jest.fn(),
        };
        messageRepo = {};
        chatService = new ChatService({ conversationRepo, messageRepo });
    });

    it("returns the conversation when the requester is a participant", async () => {
        const conversation = {
            _id: "conversation-1",
            participants: ["user-1", "user-2"],
        };
        conversationRepo.findById.mockResolvedValue(conversation);

        const result = await chatService.getConversation("conversation-1", "user-1");

        expect(conversationRepo.findById).toHaveBeenCalledWith("conversation-1");
        expect(result).toBe(conversation);
    });

    it("throws 404 when the conversation does not exist", async () => {
        conversationRepo.findById.mockResolvedValue(null);

        await expect(chatService.getConversation("missing", "user-1")).rejects.toMatchObject({
            message: "Conversation not found",
            status: 404,
        });
    });

    it("throws 403 when the requester is not a participant", async () => {
        conversationRepo.findById.mockResolvedValue({
            _id: "conversation-1",
            participants: ["user-2"],
        });

        await expect(chatService.getConversation("conversation-1", "user-1")).rejects.toMatchObject({
            message: "Unauthorized",
            status: 403,
        });
    });

    it("controller maps service errors to their HTTP status code", async () => {
        const error = new Error("Unauthorized");
        error.status = 403;
        const chatServiceMock = {
            getConversation: jest.fn().mockRejectedValue(error),
        };
        const controller = new ChatController({ chatService: chatServiceMock });
        const req = {
            user: { id: "user-1" },
            params: { id: "conversation-1" },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await controller.getConversation(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Unauthorized",
        });
    });
});
