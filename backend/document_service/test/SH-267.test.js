/**
 * SH-267: Integration Test cho Router Document Service
 * Sử dụng Supertest để giả lập cuộc gọi HTTP lên Express Router,
 * xác minh tính liên kết định tuyến (Route -> Middleware -> Controller -> Service).
 *
 * Mocking:
 *  - middlewares/auth.js  (verifyAccessToken)  -> giả lập theo header Authorization
 *  - middlewares/role.js  (requireRole)        -> giả lập kiểm tra role thực tế trên req.user
 *  - DocumentService                            -> mock toàn bộ hàm nghiệp vụ (đã kiểm tra ở SH-264)
 *
 * Quy tắc ESM: mock module trước, sau đó import động (theo TESTING_GUIDE.md - mục C)
 */
import { jest } from "@jest/globals";

// 1. Mock middleware xác thực: giả lập hành vi thật (401 nếu thiếu Bearer token)
jest.unstable_mockModule("../src/middlewares/auth.js", () => ({
  verifyAccessToken: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    if (token === "admin-token") {
      req.user = { id: "admin-1", role: ["admin"] };
    } else if (token === "invalid-token") {
      return res.status(401).json({ error: "Invalid or expired token" });
    } else {
      req.user = { id: "user-1", role: ["user"] };
    }
    next();
  }),
}));

// 2. Mock middleware phân quyền: giữ nguyên logic kiểm tra role thật
jest.unstable_mockModule("../src/middlewares/role.js", () => ({
  requireRole: (roleName) => (req, res, next) => {
    const roles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role];
    if (!roles.includes(roleName)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  },
}));

// 3. Load động các module cần thiết SAU khi mock
const express = (await import("express")).default;
const request = (await import("supertest")).default;
const { createDocumentRouter } = await import("../src/routes/documentRoutes.js");

const buildApp = (documentService) => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/document", createDocumentRouter({ documentService }));
  return app;
};

describe("Document Router - Integration Test (SH-267)", () => {
  let documentService;
  let app;

  beforeEach(() => {
    documentService = {
      createDocument: jest.fn().mockResolvedValue({ id: "doc-1" }),
      countDocuments: jest.fn().mockResolvedValue({ countDocuments: 1 }),
      countComments: jest.fn().mockResolvedValue({ countComments: 0 }),
      getCommentsByDocument: jest.fn().mockResolvedValue([]),
      getAllComments: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
      getPublicFeed: jest.fn().mockResolvedValue([{ id: "doc-public" }]),
      getHomeFeed: jest.fn().mockResolvedValue([]),
      getMyDocuments: jest.fn().mockResolvedValue([]),
      getDocumentDetail: jest.fn().mockResolvedValue({ id: "doc-1" }),
      getDocumentPreview: jest.fn().mockResolvedValue({ preview_url: "url" }),
      getUserPublicProfileDocuments: jest.fn().mockResolvedValue([]),
      getApprovedDocuments: jest.fn().mockResolvedValue([]),
      getGroupApproved: jest.fn().mockResolvedValue([]),
      getGroupPending: jest.fn().mockResolvedValue([]),
      updateDocument: jest.fn().mockResolvedValue({ id: "doc-1", title: "Updated" }),
      deleteDocument: jest.fn().mockResolvedValue(),
      searchDocuments: jest.fn().mockResolvedValue([]),
      getAllTags: jest.fn().mockResolvedValue(["math", "ai"]),
    };
    app = buildApp(documentService);
  });

  /* ================= public routes (không cần token) ================= */
  describe("Route công khai (không cần xác thực)", () => {
    it("GET /feed/public -> 200 và trả về danh sách document công khai", async () => {
      const res = await request(app).get("/api/v1/document/feed/public");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "doc-public" }]);
      expect(documentService.getPublicFeed).toHaveBeenCalled();
    });

    it("GET /tags -> 200 và trả về danh sách tag không cần token", async () => {
      const res = await request(app).get("/api/v1/document/tags");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(["math", "ai"]);
    });
  });

  /* ================= auth wiring ================= */
  describe("Liên kết Middleware xác thực trên các route được bảo vệ", () => {
    it("GET /search không có token -> 401", async () => {
      const res = await request(app).get("/api/v1/document/search?query=abc");

      expect(res.status).toBe(401);
      expect(documentService.searchDocuments).not.toHaveBeenCalled();
    });

    it("GET /search với token hợp lệ -> 200 và forward query đến service", async () => {
      const res = await request(app)
        .get("/api/v1/document/search?query=math")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
      expect(documentService.searchDocuments).toHaveBeenCalledWith(
        "math",
        "user-1",
        expect.any(Object)
      );
    });

    it("GET /search với token không hợp lệ -> 401", async () => {
      const res = await request(app)
        .get("/api/v1/document/search?query=math")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });

  /* ================= create (multipart) ================= */
  describe("POST / - Tạo document (multipart/form-data)", () => {
    it("trả về 400 khi không đính kèm file", async () => {
      const res = await request(app)
        .post("/api/v1/document")
        .set("Authorization", "Bearer user-token")
        .field("title", "No file doc");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "file_missing" });
    });

    it("trả về 200 và tạo document thành công khi có file", async () => {
      const res = await request(app)
        .post("/api/v1/document")
        .set("Authorization", "Bearer user-token")
        .field("title", "New doc")
        .attach("file", Buffer.from("dummy content"), "note.pdf");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: "doc-1" });
      expect(documentService.createDocument).toHaveBeenCalled();
    });
  });

  /* ================= authenticated GET routes ================= */
  describe("Các route GET yêu cầu xác thực", () => {
    it("GET /feed/home -> 200 khi có token hợp lệ", async () => {
      const res = await request(app)
        .get("/api/v1/document/feed/home")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
      expect(documentService.getHomeFeed).toHaveBeenCalled();
    });

    it("GET /me -> 200 với danh sách document của owner", async () => {
      const res = await request(app)
        .get("/api/v1/document/me")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
      expect(documentService.getMyDocuments).toHaveBeenCalled();
    });

    it("GET /:id -> 200 với chi tiết document", async () => {
      const res = await request(app)
        .get("/api/v1/document/doc-1")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: "doc-1" });
    });

    it("GET /:id/preview -> 200 với preview_url", async () => {
      const res = await request(app)
        .get("/api/v1/document/doc-1/preview")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ preview_url: "url" });
    });

    it("GET /:id/comments -> 200 với danh sách comment", async () => {
      const res = await request(app)
        .get("/api/v1/document/doc-1/comments")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
    });

    it("GET /user/:user_id/public -> 200 với danh sách document public của user", async () => {
      const res = await request(app)
        .get("/api/v1/document/user/user-2/public")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
      expect(documentService.getUserPublicProfileDocuments).toHaveBeenCalledWith(
        "user-2"
      );
    });

    it("GET /group/:group_id/approved -> 200 với danh sách document đã duyệt", async () => {
      const res = await request(app)
        .get("/api/v1/document/group/g1/approved")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
    });
  });

  /* ================= admin role wiring ================= */
  describe("Liên kết Middleware requireRole('admin') trên các route quản trị", () => {
    it("GET /admin/approved với user thường -> 403", async () => {
      const res = await request(app)
        .get("/api/v1/document/admin/approved")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(403);
      expect(documentService.getApprovedDocuments).not.toHaveBeenCalled();
    });

    it("GET /admin/approved với admin -> 200", async () => {
      const res = await request(app)
        .get("/api/v1/document/admin/approved")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(documentService.getApprovedDocuments).toHaveBeenCalled();
    });

    it("GET /admin/countDocuments với admin -> 200", async () => {
      const res = await request(app)
        .get("/api/v1/document/admin/countDocuments")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ countDocuments: 1 });
    });

    it("GET /admin/comments với user thường -> 403", async () => {
      const res = await request(app)
        .get("/api/v1/document/admin/comments")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(403);
    });
  });

  /* ================= update/delete ================= */
  describe("PATCH /:id / DELETE /:id", () => {
    it("PATCH /:id -> 200 khi cập nhật thành công", async () => {
      const res = await request(app)
        .patch("/api/v1/document/doc-1")
        .set("Authorization", "Bearer user-token")
        .send({ title: "Updated" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: "doc-1", title: "Updated" });
    });

    it("PATCH /:id -> 403 khi service báo forbidden", async () => {
      documentService.updateDocument.mockRejectedValue(new Error("forbidden"));

      const res = await request(app)
        .patch("/api/v1/document/doc-1")
        .set("Authorization", "Bearer user-token")
        .send({ title: "Updated" });

      expect(res.status).toBe(403);
    });

    it("DELETE /:id -> 200 { deleted: true }", async () => {
      const res = await request(app)
        .delete("/api/v1/document/doc-1")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ deleted: true });
    });
  });

  /* ================= 404 fallback ================= */
  describe("Route không tồn tại", () => {
    it("trả về 404 cho path không được định nghĩa", async () => {
      const res = await request(app)
        .get("/api/v1/document/unknown/path/xyz")
        .set("Authorization", "Bearer user-token");

      expect(res.status).toBe(404);
    });
  });
});
