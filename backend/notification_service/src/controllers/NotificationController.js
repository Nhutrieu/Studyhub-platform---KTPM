/**
 * NotificationController
 * Handles HTTP requests for notification operations
 */
export class NotificationController {
    /**
     * @param {Object} deps
     * @param {import("../services/NotificationService.js").NotificationService} deps.notificationService
     */
    constructor({ notificationService }) {
        this.notificationService = notificationService;
    }

    /**
     * GET / - Get user's notifications
     */
    async getNotifications(req, res) {
        try {
            const user_id = req.user.id;
            const { status, limit = 50, offset = 0 } = req.query;
            const parsedLimit = Number(limit);
            const parsedOffset = Number(offset);

            if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
                return res.status(400).json({
                    success: false,
                    message: "limit must be an integer between 1 and 100",
                });
            }

            if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
                return res.status(400).json({
                    success: false,
                    message: "offset must be a non-negative integer",
                });
            }

            const notifications = await this.notificationService.getNotificationsForUser(
                user_id,
                {
                    status,
                    limit: parsedLimit,
                    offset: parsedOffset,
                }
            );

            res.json({
                success: true,
                data: notifications,
            });
        } catch (err) {
            res.status(err.status || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    /**
     * GET /:id - Get notification detail
     */
    async getNotificationDetail(req, res) {
        try {
            const user_id = req.user.id;
            const { id } = req.params;

            const notification = await this.notificationService.getNotificationDetail(id, user_id);

            res.json({
                success: true,
                data: notification,
            });
        } catch (err) {
            res.status(err.status || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    /**
     * GET /unread-count - Get unread notification count
     */
    async getUnreadCount(req, res) {
        try {
            const user_id = req.user.id;
            const count = await this.notificationService.getUnreadCount(user_id);

            res.json({
                success: true,
                data: { count },
            });
        } catch (err) {
            res.status(err.status || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    /**
     * POST / - Send notification (internal/admin use)
     */
    async sendNotification(req, res) {
        try {
            const { sender_id, content, target, type, receiver_ids } = req.body;

            if (!sender_id || !content || !target || !type || !receiver_ids) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields: sender_id, content, target, type, receiver_ids",
                });
            }

            if (typeof content !== "string" || content.length < 1 || content.length > 500) {
                return res.status(400).json({
                    success: false,
                    message: "content must be between 1 and 500 characters",
                });
            }

            if (!Array.isArray(receiver_ids) || receiver_ids.length < 1 || receiver_ids.length > 1000) {
                return res.status(400).json({
                    success: false,
                    message: "receiver_ids must contain between 1 and 1000 receivers",
                });
            }

            if (typeof type !== "string" || type.length < 4 || type.length > 20) {
                return res.status(400).json({
                    success: false,
                    message: "type must be between 4 and 20 characters",
                });
            }

            if (
                typeof target !== "object" ||
                typeof target.type !== "string" ||
                typeof target.id !== "string" ||
                target.id.length < 10 ||
                target.id.length > 24
            ) {
                return res.status(400).json({
                    success: false,
                    message: "target.id must be between 10 and 24 characters",
                });
            }

            const notification = await this.notificationService.sendNotification({
                sender_id,
                content,
                target,
                type,
                receiver_ids,
            });

            res.status(201).json({
                success: true,
                data: notification,
            });
        } catch (err) {
            res.status(err.status || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    /**
     * PATCH /:id/read - Mark notification as read
     */
    async markAsRead(req, res) {
        try {
            const user_id = req.user.id;
            const { id } = req.params;

            const updated = await this.notificationService.markAsRead(id, user_id);

            res.json({
                success: true,
                data: updated,
            });
        } catch (err) {
            res.status(err.status || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    /**
     * PATCH /read-all - Mark all notifications as read
     */
    async markAllAsRead(req, res) {
        try {
            const user_id = req.user.id;
            const result = await this.notificationService.markAllAsRead(user_id);

            res.json({
                success: true,
                data: { modifiedCount: result.modifiedCount },
            });
        } catch (err) {
            res.status(err.status || 500).json({
                success: false,
                message: err.message,
            });
        }
    }

    /**
     * DELETE /:id - Delete notification
     */
    async deleteNotification(req, res) {
        try {
            const user_id = req.user.id;
            const { id } = req.params;

            await this.notificationService.deleteNotification(id, user_id);

            res.json({
                success: true,
                message: "Notification deleted",
            });
        } catch (err) {
            res.status(err.status || 500).json({
                success: false,
                message: err.message,
            });
        }
    }
}
