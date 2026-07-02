import { jest } from "@jest/globals";
import { NotificationController } from "../src/controllers/NotificationController.js";

describe("StudyHub - SH-152 - Kiểm thử đơn vị Controller (White Box)", () => {
    let controller;
    let mockNotificationService;
    let req;
    let res;

    beforeEach(() => {
        mockNotificationService = {
            getNotificationsForUser: jest.fn(),
            getNotificationDetail: jest.fn(),
            getUnreadCount: jest.fn(),
            sendNotification: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            deleteNotification: jest.fn(),
        };

        controller = new NotificationController({
            notificationService: mockNotificationService,
        });

        req = {
            user: { id: "user123" },
            query: {},
            params: {},
            body: {},
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        jest.clearAllMocks();
    });

    describe("getNotifications", () => {
        it("should return notifications list with custom query params", async () => {
            req.query = { status: "unread", limit: "10", offset: "5" };
            const mockData = [{ id: "1" }];
            mockNotificationService.getNotificationsForUser.mockResolvedValue(mockData);

            await controller.getNotifications(req, res);

            expect(mockNotificationService.getNotificationsForUser).toHaveBeenCalledWith(
                "user123",
                { status: "unread", limit: 10, offset: 5 }
            );
            expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
        });

        it("should handle error status code and message", async () => {
            const err = new Error("Service failed");
            err.status = 400;
            mockNotificationService.getNotificationsForUser.mockRejectedValue(err);

            await controller.getNotifications(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Service failed" });
        });
    });

    describe("getNotificationDetail", () => {
        it("should return single notification detail", async () => {
            req.params.id = "notif123";
            const mockData = { id: "notif123", content: "hi" };
            mockNotificationService.getNotificationDetail.mockResolvedValue(mockData);

            await controller.getNotificationDetail(req, res);

            expect(mockNotificationService.getNotificationDetail).toHaveBeenCalledWith("notif123", "user123");
            expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
        });
    });

    describe("getUnreadCount", () => {
        it("should return unread count", async () => {
            mockNotificationService.getUnreadCount.mockResolvedValue(4);

            await controller.getUnreadCount(req, res);

            expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith("user123");
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { count: 4 } });
        });
    });

    describe("sendNotification", () => {
        it("should create notification with 201 status code", async () => {
            req.body = {
                sender_id: "sender1",
                content: "content1",
                target: { type: "post", id: "1234567890" },
                type: "ALERT",
                receiver_ids: ["r1"],
            };
            const mockCreated = { _id: "newnotif" };
            mockNotificationService.sendNotification.mockResolvedValue(mockCreated);

            await controller.sendNotification(req, res);

            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(req.body);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCreated });
        });

        it("should return 400 if required fields are missing", async () => {
            req.body = { sender_id: "sender1" }; // Missing content, target, etc.

            await controller.sendNotification(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Missing required fields: sender_id, content, target, type, receiver_ids",
            });
            expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
        });

        it("should return 400 for invalid receiver_ids boundary", async () => {
            req.body = {
                sender_id: "sender1",
                content: "content1",
                target: { type: "post", id: "1234567890" },
                type: "ALERT",
                receiver_ids: [],
            };

            await controller.sendNotification(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
        });

        it("should return 400 for invalid target id boundary", async () => {
            req.body = {
                sender_id: "sender1",
                content: "content1",
                target: { type: "post", id: "1234567890123456789012345" },
                type: "ALERT",
                receiver_ids: ["r1"],
            };

            await controller.sendNotification(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
        });
    });

    describe("markAsRead", () => {
        it("should update read status of notification", async () => {
            req.params.id = "entry123";
            const mockUpdated = { _id: "entry123", status: "read" };
            mockNotificationService.markAsRead.mockResolvedValue(mockUpdated);

            await controller.markAsRead(req, res);

            expect(mockNotificationService.markAsRead).toHaveBeenCalledWith("entry123", "user123");
            expect(res.json).toHaveBeenCalledWith({ success: true, data: mockUpdated });
        });
    });

    describe("markAllAsRead", () => {
        it("should mark all as read and return modifiedCount", async () => {
            mockNotificationService.markAllAsRead.mockResolvedValue({ modifiedCount: 10 });

            await controller.markAllAsRead(req, res);

            expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith("user123");
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { modifiedCount: 10 } });
        });
    });

    describe("deleteNotification", () => {
        it("should delete notification and return confirmation message", async () => {
            req.params.id = "entry123";
            mockNotificationService.deleteNotification.mockResolvedValue();

            await controller.deleteNotification(req, res);

            expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith("entry123", "user123");
            expect(res.json).toHaveBeenCalledWith({ success: true, message: "Notification deleted" });
        });
    });
});
