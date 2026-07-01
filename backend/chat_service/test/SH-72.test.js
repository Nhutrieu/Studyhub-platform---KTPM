import { jest } from "@jest/globals";
import { ChatService } from "../src/services/ChatService.js";
import { ChatController } from "../src/controllers/ChatController.js";

describe("StudyHub - SH-72 - Direct conversation white-box tests", () => {
    let chatService;
    let conversationRepo;
    let messageRepo;

    beforeEach(() => {
        conversationRepo = {
            findDirectConversation: jest.fn(),
            create: jest.fn(),
        };
        messageRepo = {};
        chatService = new ChatService({ conversationRepo, messageRepo });
    });

    it("returns the existing direct conversation without creating a duplicate", async () => {
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

    it("controller rejects a direct conversation without target_id", async () => {
        const controller = new ChatController({ chatService });
        const req = {
            user: { id: "user-1" },
            body: { type: "direct" },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await controller.createConversation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "target_id required for direct conversation",
        });
    });
});
