import { jest } from "@jest/globals";
import { NotificationService } from "../src/services/NotificationService.js";

describe("StudyHub - SH-151 - Kiểm thử đơn vị Service (White Box)", () => {
    let notificationService;
    let mockNotificationRepo;
    let mockReceiverRepo;

    beforeEach(() => {
        mockNotificationRepo = {
            create: jest.fn(),
        };
        mockReceiverRepo = {
            createMany: jest.fn(),
            findByReceiver: jest.fn(),
            findById: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            markAsDeleted: jest.fn(),
            countUnread: jest.fn(),
        };

        notificationService = new NotificationService({
            notificationRepo: mockNotificationRepo,
            receiverRepo: mockReceiverRepo,
        });
    });

    describe("sendNotification", () => {
        it("should create a notification and create receiver entries", async () => {
            const mockNotification = { _id: "notif123", sender_id: "sender1", content: "hello" };
            mockNotificationRepo.create.mockResolvedValue(mockNotification);
            mockReceiverRepo.createMany.mockResolvedValue([]);

            const data = {
                sender_id: "sender1",
                content: "hello",
                target: { type: "post", id: "post123" },
                type: "LIKE",
                receiver_ids: ["user1", "user2"],
            };

            const result = await notificationService.sendNotification(data);

            expect(mockNotificationRepo.create).toHaveBeenCalledWith({
                sender_id: data.sender_id,
                content: data.content,
                target: data.target,
                type: data.type,
            });
            expect(mockReceiverRepo.createMany).toHaveBeenCalledWith([
                { notification_id: "notif123", receiver_id: "user1" },
                { notification_id: "notif123", receiver_id: "user2" },
            ]);
            expect(result).toEqual(mockNotification);
        });

        it("should not create receiver entries if receiver_ids is empty", async () => {
            const mockNotification = { _id: "notif123" };
            mockNotificationRepo.create.mockResolvedValue(mockNotification);

            const result = await notificationService.sendNotification({
                sender_id: "sender1",
                content: "hello",
                receiver_ids: [],
            });

            expect(mockReceiverRepo.createMany).not.toHaveBeenCalled();
            expect(result).toEqual(mockNotification);
        });
    });

    describe("getNotificationsForUser", () => {
        it("should return formatted receiver entries", async () => {
            const mockReceivers = [
                {
                    _id: "entry1",
                    notification_id: { _id: "notif1", content: "test" },
                    status: "unread",
                    received_at: "2026-06-30T00:00:00.000Z",
                    read_at: null,
                },
            ];
            mockReceiverRepo.findByReceiver.mockResolvedValue(mockReceivers);

            const result = await notificationService.getNotificationsForUser("user1", { limit: 10, offset: 0 });

            expect(mockReceiverRepo.findByReceiver).toHaveBeenCalledWith("user1", {
                status: null,
                limit: 10,
                offset: 0,
            });
            expect(result).toEqual([
                {
                    id: "entry1",
                    notification: { _id: "notif1", content: "test" },
                    status: "unread",
                    received_at: "2026-06-30T00:00:00.000Z",
                    read_at: null,
                },
            ]);
        });
    });

    describe("markAsRead", () => {
        it("should mark notification as read if owner matches", async () => {
            const mockEntry = { _id: "entry123", receiver_id: "user1", status: "unread" };
            mockReceiverRepo.findById.mockResolvedValue(mockEntry);
            mockReceiverRepo.markAsRead.mockResolvedValue({ ...mockEntry, status: "read" });

            const result = await notificationService.markAsRead("entry123", "user1");

            expect(mockReceiverRepo.findById).toHaveBeenCalledWith("entry123");
            expect(mockReceiverRepo.markAsRead).toHaveBeenCalledWith("entry123");
            expect(result.status).toBe("read");
        });

        it("should throw 404 if notification entry not found", async () => {
            mockReceiverRepo.findById.mockResolvedValue(null);

            await expect(notificationService.markAsRead("entry123", "user1"))
                .rejects.toThrow("Notification not found");
        });

        it("should throw 403 if user is not the owner", async () => {
            const mockEntry = { _id: "entry123", receiver_id: "userOther" };
            mockReceiverRepo.findById.mockResolvedValue(mockEntry);

            await expect(notificationService.markAsRead("entry123", "user1"))
                .rejects.toThrow("Unauthorized");
        });
    });

    describe("markAllAsRead", () => {
        it("should call markAllAsRead on repo", async () => {
            mockReceiverRepo.markAllAsRead.mockResolvedValue({ modifiedCount: 5 });
            const result = await notificationService.markAllAsRead("user1");
            expect(mockReceiverRepo.markAllAsRead).toHaveBeenCalledWith("user1");
            expect(result).toEqual({ modifiedCount: 5 });
        });
    });

    describe("deleteNotification", () => {
        it("should delete notification if owner matches", async () => {
            const mockEntry = { _id: "entry123", receiver_id: "user1" };
            mockReceiverRepo.findById.mockResolvedValue(mockEntry);
            mockReceiverRepo.markAsDeleted.mockResolvedValue({ ...mockEntry, status: "deleted" });

            const result = await notificationService.deleteNotification("entry123", "user1");

            expect(mockReceiverRepo.findById).toHaveBeenCalledWith("entry123");
            expect(mockReceiverRepo.markAsDeleted).toHaveBeenCalledWith("entry123");
            expect(result.status).toBe("deleted");
        });

        it("should throw 404 if not found", async () => {
            mockReceiverRepo.findById.mockResolvedValue(null);
            await expect(notificationService.deleteNotification("entry123", "user1"))
                .rejects.toThrow("Notification not found");
        });

        it("should throw 403 if unauthorized", async () => {
            const mockEntry = { _id: "entry123", receiver_id: "userOther" };
            mockReceiverRepo.findById.mockResolvedValue(mockEntry);

            await expect(notificationService.deleteNotification("entry123", "user1"))
                .rejects.toThrow("Unauthorized");
        });
    });

    describe("getUnreadCount", () => {
        it("should return count of unread notifications", async () => {
            mockReceiverRepo.countUnread.mockResolvedValue(3);
            const result = await notificationService.getUnreadCount("user1");
            expect(mockReceiverRepo.countUnread).toHaveBeenCalledWith("user1");
            expect(result).toBe(3);
        });
    });

    describe("getNotificationDetail", () => {
        it("should return notification detail if owner matches", async () => {
            const mockEntry = {
                _id: "entry123",
                notification_id: { _id: "notif1", content: "hello" },
                receiver_id: "user1",
                status: "unread",
                received_at: "2026-06-30T00:00:00.000Z",
                read_at: null,
            };
            mockReceiverRepo.findById.mockResolvedValue(mockEntry);

            const result = await notificationService.getNotificationDetail("entry123", "user1");

            expect(result).toEqual({
                id: "entry123",
                notification: { _id: "notif1", content: "hello" },
                status: "unread",
                received_at: "2026-06-30T00:00:00.000Z",
                read_at: null,
            });
        });

        it("should throw 404 if not found", async () => {
            mockReceiverRepo.findById.mockResolvedValue(null);
            await expect(notificationService.getNotificationDetail("entry123", "user1"))
                .rejects.toThrow("Notification not found");
        });

        it("should throw 403 if unauthorized", async () => {
            const mockEntry = { _id: "entry123", receiver_id: "userOther" };
            mockReceiverRepo.findById.mockResolvedValue(mockEntry);

            await expect(notificationService.getNotificationDetail("entry123", "user1"))
                .rejects.toThrow("Unauthorized");
        });
    });
});
