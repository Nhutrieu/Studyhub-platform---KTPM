import { jest } from "@jest/globals";
import { ChatService } from "../src/services/ChatService.js";
import { ChatController } from "../src/controllers/ChatController.js";

describe("StudyHub - SH-73 - Group conversation white-box tests", () => {
    let chatService;
    let conversationRepo;
    let messageRepo;

    beforeEach(() => {
        conversationRepo = {
            findGroupConversation: jest.fn(),
            create: jest.fn(),
        };
        messageRepo = {};
        chatService = new ChatService({ conversationRepo, messageRepo });
    });

    it("returns the existing group conversation for the same target id", async () => {
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

    it("creates a group conversation with the provided participants when none exists", async () => {
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

    it("controller rejects an unsupported conversation type", async () => {
        const controller = new ChatController({ chatService });
        const req = {
            user: { id: "user-1" },
            body: { type: "channel", target_id: "group-1" },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await controller.createConversation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "type must be 'direct' or 'group'",
        });
    });
});
