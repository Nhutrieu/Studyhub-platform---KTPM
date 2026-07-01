import { jest } from "@jest/globals";
import { ChatService } from "../src/services/ChatService.js";
import { ChatController } from "../src/controllers/ChatController.js";

jest.unstable_mockModule("jsonwebtoken", () => ({
    default: {
        verify: jest.fn(() => ({ id: "user-1", role: "user" })),
    },
}));

const request = (await import("supertest")).default;
const express = (await import("express")).default;
const { createChatRouter } = await import("../src/routes/chatRoutes.js");

describe("StudyHub - SH-71 - Chat conversation list white-box tests", () => {
    let chatService;
    let conversationRepo;
    let messageRepo;

    beforeEach(() => {
        conversationRepo = {
            findByParticipant: jest.fn(),
        };
        messageRepo = {};
        chatService = new ChatService({ conversationRepo, messageRepo });
    });

    it("passes the authenticated user id and pagination options to the repository", async () => {
        const conversations = [{ _id: "conversation-1" }];
        conversationRepo.findByParticipant.mockResolvedValue(conversations);

        const result = await chatService.getConversations("user-1", { limit: 10, offset: 5 });

        expect(conversationRepo.findByParticipant).toHaveBeenCalledWith("user-1", {
            limit: 10,
            offset: 5,
        });
        expect(result).toBe(conversations);
    });

    it("uses default pagination when no options are provided", async () => {
        conversationRepo.findByParticipant.mockResolvedValue([]);

        await chatService.getConversations("user-1");

        expect(conversationRepo.findByParticipant).toHaveBeenCalledWith("user-1", {
            limit: 50,
            offset: 0,
        });
    });

    it("controller converts limit and offset query values to numbers", async () => {
        const chatServiceMock = {
            getConversations: jest.fn().mockResolvedValue([{ _id: "conversation-1" }]),
        };
        const controller = new ChatController({ chatService: chatServiceMock });
        const req = {
            user: { id: "user-1" },
            query: { limit: "10", offset: "2" },
        };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        await controller.getConversations(req, res);

        expect(chatServiceMock.getConversations).toHaveBeenCalledWith("user-1", {
            limit: 10,
            offset: 2,
        });
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [{ _id: "conversation-1" }],
        });
    });

    it("router requires authentication and returns the user's conversations", async () => {
        const chatServiceMock = {
            getConversations: jest.fn().mockResolvedValue([{ _id: "conversation-1" }]),
        };
        const app = express();
        app.use(express.json());
        app.use("/api/v1/chat", createChatRouter({ chatService: chatServiceMock }));

        const noToken = await request(app).get("/api/v1/chat/conversations");
        expect(noToken.status).toBe(401);

        const authenticated = await request(app)
            .get("/api/v1/chat/conversations?limit=5&offset=1")
            .set("Authorization", "Bearer valid-token");

        expect(authenticated.status).toBe(200);
        expect(authenticated.body).toEqual({
            success: true,
            data: [{ _id: "conversation-1" }],
        });
        expect(chatServiceMock.getConversations).toHaveBeenCalledWith("user-1", {
            limit: 5,
            offset: 1,
        });
    });
});
