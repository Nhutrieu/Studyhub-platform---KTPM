import { jest } from "@jest/globals";
import { ChatService } from "../src/services/ChatService.js";
import { ChatController } from "../src/controllers/ChatController.js";

describe("StudyHub - SH-77 - Delete message white-box tests", () => {
    let chatService;
    let conversationRepo;
    let messageRepo;

    beforeEach(() => {
        conversationRepo = {};
        messageRepo = {
            findById: jest.fn(),
            softDelete: jest.fn(),
        };
        chatService = new ChatService({ conversationRepo, messageRepo });
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

    it("throws 404 when the message does not exist", async () => {
        messageRepo.findById.mockResolvedValue(null);

        await expect(chatService.deleteMessage("missing", "user-1")).rejects.toMatchObject({
            message: "Message not found",
            status: 404,
        });
    });

    it("throws 403 when the requester is not the sender", async () => {
        messageRepo.findById.mockResolvedValue({
            _id: "message-1",
            sender_id: "user-2",
        });

        await expect(chatService.deleteMessage("message-1", "user-1")).rejects.toMatchObject({
            message: "Unauthorized",
            status: 403,
        });
    });

    it("controller returns the delete confirmation after soft delete succeeds", async () => {
        const chatServiceMock = {
            deleteMessage: jest.fn().mockResolvedValue({ _id: "message-1", deleted_at: new Date() }),
        };
        const controller = new ChatController({ chatService: chatServiceMock });
        const req = {
            user: { id: "user-1" },
            params: { id: "message-1" },
        };
        const res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        await controller.deleteMessage(req, res);

        expect(chatServiceMock.deleteMessage).toHaveBeenCalledWith("message-1", "user-1");
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: "Message deleted",
        });
    });
});
