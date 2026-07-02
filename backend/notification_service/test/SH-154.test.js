import { jest } from "@jest/globals";

// Mock jsonwebtoken BEFORE importing any file that uses it
jest.unstable_mockModule("jsonwebtoken", () => ({
    default: {
        verify: jest.fn(() => ({ id: "mock-user-123", role: "user" })),
    },
}));

// Dynamically import dependencies after mocking
const request = (await import("supertest")).default;
const express = (await import("express")).default;
const { createNotificationRouter } = await import("../src/routes/notificationRoutes.js");

describe("StudyHub - SH-154 - Kiểm thử tích hợp Router API (White Box)", () => {
    let app;
    let mockNotificationService;

    beforeEach(async () => {
        mockNotificationService = {
            sendNotification: jest.fn(),
            getNotificationsForUser: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            deleteNotification: jest.fn(),
            getUnreadCount: jest.fn(),
            getNotificationDetail: jest.fn(),
        };

        app = express();
        app.use(express.json());
        
        // Setup router with dependency injection
        const router = createNotificationRouter({
            notificationService: mockNotificationService,
        });
        app.use("/api/v1/notification", router);

        // Simple error handler for test app
        app.use((err, req, res, next) => {
            res.status(err.status || 500).json({ success: false, message: err.message });
        });
    });

    describe("GET /api/v1/notification", () => {
        it("should return list of notifications", async () => {
            const mockList = [{ id: "entry1", status: "unread" }];
            mockNotificationService.getNotificationsForUser.mockResolvedValue(mockList);

            const res = await request(app)
                .get("/api/v1/notification?limit=10&offset=0")
                .set("Authorization", "Bearer mocktoken");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: mockList });
            expect(mockNotificationService.getNotificationsForUser).toHaveBeenCalledWith("mock-user-123", {
                status: undefined,
                limit: 10,
                offset: 0,
            });
        });
    });

    describe("GET /api/v1/notification/unread-count", () => {
        it("should return count of unread notifications", async () => {
            mockNotificationService.getUnreadCount.mockResolvedValue(5);

            const res = await request(app)
                .get("/api/v1/notification/unread-count")
                .set("Authorization", "Bearer mocktoken");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: { count: 5 } });
            expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith("mock-user-123");
        });
    });

    describe("GET /api/v1/notification/:id", () => {
        it("should return notification detail", async () => {
            const mockDetail = { id: "entry1", status: "unread" };
            mockNotificationService.getNotificationDetail.mockResolvedValue(mockDetail);

            const res = await request(app)
                .get("/api/v1/notification/entry1")
                .set("Authorization", "Bearer mocktoken");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: mockDetail });
            expect(mockNotificationService.getNotificationDetail).toHaveBeenCalledWith("entry1", "mock-user-123");
        });
    });

    describe("POST /api/v1/notification", () => {
        it("should send a notification", async () => {
            const mockCreated = { _id: "notif1" };
            mockNotificationService.sendNotification.mockResolvedValue(mockCreated);

            const payload = {
                sender_id: "sender1",
                content: "new message",
                target: { type: "post", id: "post123456" },
                type: "ALERT",
                receiver_ids: ["user1"],
            };

            const res = await request(app)
                .post("/api/v1/notification")
                .set("Authorization", "Bearer mocktoken")
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual({ success: true, data: mockCreated });
            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(payload);
        });

        it("should return 400 if missing required fields", async () => {
            const res = await request(app)
                .post("/api/v1/notification")
                .set("Authorization", "Bearer mocktoken")
                .send({ sender_id: "sender1" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe("PATCH /api/v1/notification/:id/read", () => {
        it("should mark notification as read", async () => {
            mockNotificationService.markAsRead.mockResolvedValue({ _id: "entry1", status: "read" });

            const res = await request(app)
                .patch("/api/v1/notification/entry1/read")
                .set("Authorization", "Bearer mocktoken");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: { _id: "entry1", status: "read" } });
            expect(mockNotificationService.markAsRead).toHaveBeenCalledWith("entry1", "mock-user-123");
        });
    });

    describe("PATCH /api/v1/notification/read-all", () => {
        it("should mark all as read", async () => {
            mockNotificationService.markAllAsRead.mockResolvedValue({ modifiedCount: 3 });

            const res = await request(app)
                .patch("/api/v1/notification/read-all")
                .set("Authorization", "Bearer mocktoken");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, data: { modifiedCount: 3 } });
            expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith("mock-user-123");
        });
    });

    describe("DELETE /api/v1/notification/:id", () => {
        it("should soft delete notification", async () => {
            mockNotificationService.deleteNotification.mockResolvedValue({ _id: "entry1", status: "deleted" });

            const res = await request(app)
                .delete("/api/v1/notification/entry1")
                .set("Authorization", "Bearer mocktoken");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, message: "Notification deleted" });
            expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith("entry1", "mock-user-123");
        });
    });
});
