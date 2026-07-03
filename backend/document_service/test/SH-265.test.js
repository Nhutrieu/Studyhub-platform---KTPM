/**
 * SH-265: Unit Test cho DocumentController
 * Mocking: DocumentService (toàn bộ hàm nghiệp vụ)
 * Giả lập đối tượng Request/Response của Express để kiểm tra mã trạng thái HTTP
 */
import { jest } from "@jest/globals";
import { DocumentController } from "../src/controllers/DocumentController.js";

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("DocumentController (SH-265)", () => {
  let documentService;
  let controller;
  let res;

  // Ẩn console.error khi chạy test để terminal sạch sẽ
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // Khôi phục lại console.error sau khi chạy xong tất cả các test
  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    documentService = {
      createDocument: jest.fn(),
      countDocuments: jest.fn(),
      countComments: jest.fn(),
      getCommentsByDocument: jest.fn(),
      getAllComments: jest.fn(),
      getPublicFeed: jest.fn(),
      getHomeFeed: jest.fn(),
      getMyDocuments: jest.fn(),
      getDocumentDetail: jest.fn(),
      getDocumentPreview: jest.fn(),
      getUserPublicProfileDocuments: jest.fn(),
      getApprovedDocuments: jest.fn(),
      getGroupApproved: jest.fn(),
      getGroupPending: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
      searchDocuments: jest.fn(),
      getAllTags: jest.fn(),
    };
    controller = new DocumentController({ documentService });
    res = mockRes();
  });

  /* ================= createDocument ================= */
  describe("createDocument()", () => {
    it("trả về 400 khi thiếu file đính kèm", async () => {
      const req = { body: {}, user: { id: "user-1" }, file: undefined };

      await controller.createDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "file_missing" });
      expect(documentService.createDocument).not.toHaveBeenCalled();
    });

    it("trả về 200 và document đã tạo khi thành công", async () => {
      const req = {
        body: {
          title: "T1",
          description: "D1",
          visibility: "PUBLIC",
          tags: "math",
        },
        user: { id: "user-1" },
        file: { originalname: "a.pdf" },
      };
      documentService.createDocument.mockResolvedValue({ id: "doc-1" });

      await controller.createDocument(req, res);

      expect(documentService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({ owner_id: "user-1", tags: ["math"] }),
      );
      expect(res.json).toHaveBeenCalledWith({ id: "doc-1" });
    });

    it("trả về 400 khi service ném lỗi", async () => {
      const req = {
        body: {},
        user: { id: "user-1" },
        file: { originalname: "a.pdf" },
      };
      documentService.createDocument.mockRejectedValue(
        new Error("group_id_required"),
      );

      await controller.createDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "group_id_required" });
    });
  });

  /* ================= admin counts ================= */
  describe("countDocuments() / countComments()", () => {
    it("countDocuments trả về 200 với payload từ service", async () => {
      documentService.countDocuments.mockResolvedValue({ countDocuments: 10 });
      await controller.countDocuments({}, res);
      expect(res.json).toHaveBeenCalledWith({ countDocuments: 10 });
    });

    it("countDocuments trả về 400 khi service lỗi", async () => {
      documentService.countDocuments.mockRejectedValue(new Error("db_error"));
      await controller.countDocuments({}, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("countComments trả về 200 với payload từ service", async () => {
      documentService.countComments.mockResolvedValue({ countComments: 3 });
      await controller.countComments({}, res);
      expect(res.json).toHaveBeenCalledWith({ countComments: 3 });
    });
  });

  describe("getCommentsByDocument()", () => {
    it("trả về 200 với danh sách comment, dùng limit/offset mặc định", async () => {
      const req = { params: { id: "doc-1" }, query: {} };
      documentService.getCommentsByDocument.mockResolvedValue([{ id: "c1" }]);

      await controller.getCommentsByDocument(req, res);

      expect(documentService.getCommentsByDocument).toHaveBeenCalledWith(
        "doc-1",
        {
          limit: 50,
          offset: 0,
        },
      );
      expect(res.json).toHaveBeenCalledWith([{ id: "c1" }]);
    });

    it("trả về 403 khi service ném lỗi", async () => {
      const req = { params: { id: "doc-1" }, query: {} };
      documentService.getCommentsByDocument.mockRejectedValue(
        new Error("forbidden"),
      );

      await controller.getCommentsByDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("getAllComments()", () => {
    it("giới hạn limit tối đa 100", async () => {
      const req = { query: { limit: "500", offset: "0" } };
      documentService.getAllComments.mockResolvedValue({
        data: [],
        pagination: {},
      });

      await controller.getAllComments(req, res);

      expect(documentService.getAllComments).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
      });
    });

    it("trả về 500 khi service lỗi", async () => {
      const req = { query: {} };
      documentService.getAllComments.mockRejectedValue(new Error("db_error"));

      await controller.getAllComments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ================= feeds ================= */
  describe("getPublicFeed() / getHomeFeed() / getMyDocuments()", () => {
    it("getPublicFeed trả về 200 với danh sách document", async () => {
      documentService.getPublicFeed.mockResolvedValue([{ id: "doc-1" }]);
      await controller.getPublicFeed({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith([{ id: "doc-1" }]);
    });

    it("getPublicFeed trả về 400 khi service lỗi", async () => {
      documentService.getPublicFeed.mockRejectedValue(new Error("db_error"));
      await controller.getPublicFeed({ query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("getHomeFeed lấy user_id/token từ req và trả về 200", async () => {
      const req = {
        query: {},
        user: { id: "user-1" },
        headers: { authorization: "Bearer token-abc" },
      };
      documentService.getHomeFeed.mockResolvedValue([]);

      await controller.getHomeFeed(req, res);

      expect(documentService.getHomeFeed).toHaveBeenCalledWith(
        "user-1",
        "token-abc",
        { limit: 50, offset: 0 },
      );
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("getHomeFeed dùng user_id null khi req.user không tồn tại (khách vãng lai)", async () => {
      const req = { query: {}, headers: {} };
      documentService.getHomeFeed.mockResolvedValue([]);

      await controller.getHomeFeed(req, res);

      expect(documentService.getHomeFeed).toHaveBeenCalledWith(
        null,
        null,
        expect.any(Object),
      );
    });

    it("getMyDocuments trả về 200 với danh sách document của owner", async () => {
      const req = { user: { id: "user-1" } };
      documentService.getMyDocuments.mockResolvedValue([{ id: "doc-1" }]);

      await controller.getMyDocuments(req, res);

      expect(documentService.getMyDocuments).toHaveBeenCalledWith("user-1");
      expect(res.json).toHaveBeenCalledWith([{ id: "doc-1" }]);
    });
  });

  /* ================= detail & preview ================= */
  describe("getDocument() / getDocumentPreviewUrl()", () => {
    it("getDocument nhận diện isAdmin=true khi role là mảng chứa 'admin'", async () => {
      const req = {
        params: { id: "doc-1" },
        user: { id: "u1", role: ["admin"] },
      };
      documentService.getDocumentDetail.mockResolvedValue({ id: "doc-1" });

      await controller.getDocument(req, res);

      expect(documentService.getDocumentDetail).toHaveBeenCalledWith(
        "doc-1",
        "u1",
        true,
      );
    });

    it("getDocument nhận diện isAdmin=true khi role là string 'admin'", async () => {
      const req = {
        params: { id: "doc-1" },
        user: { id: "u1", role: "admin" },
      };
      documentService.getDocumentDetail.mockResolvedValue({ id: "doc-1" });

      await controller.getDocument(req, res);

      expect(documentService.getDocumentDetail).toHaveBeenCalledWith(
        "doc-1",
        "u1",
        true,
      );
    });

    it("getDocument trả về 403 khi service ném lỗi forbidden", async () => {
      const req = { params: { id: "doc-1" }, user: { id: "u1", role: "user" } };
      documentService.getDocumentDetail.mockRejectedValue(
        new Error("forbidden"),
      );

      await controller.getDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "forbidden" });
    });

    it("getDocumentPreviewUrl trả về 200 với preview_url", async () => {
      const req = { params: { id: "doc-1" }, user: { id: "u1", role: "user" } };
      documentService.getDocumentPreview.mockResolvedValue({
        document_id: "doc-1",
        preview_url: "https://cdn.test/preview.pdf",
      });

      await controller.getDocumentPreviewUrl(req, res);

      expect(res.json).toHaveBeenCalledWith({
        document_id: "doc-1",
        preview_url: "https://cdn.test/preview.pdf",
      });
    });

    it("getDocumentPreviewUrl trả về 403 khi service lỗi", async () => {
      const req = { params: { id: "doc-1" }, user: { id: "u1", role: "user" } };
      documentService.getDocumentPreview.mockRejectedValue(
        new Error("forbidden"),
      );

      await controller.getDocumentPreviewUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  /* ================= public profile & group ================= */
  describe("getUserPublicDocuments() / getApprovedDocuments() / getGroupApproved() / getGroupPending()", () => {
    it("getUserPublicDocuments trả về 200 với danh sách document công khai", async () => {
      const req = { params: { user_id: "user-2" } };
      documentService.getUserPublicProfileDocuments.mockResolvedValue([]);

      await controller.getUserPublicDocuments(req, res);

      expect(
        documentService.getUserPublicProfileDocuments,
      ).toHaveBeenCalledWith("user-2");
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("getApprovedDocuments trả về 400 khi service lỗi", async () => {
      documentService.getApprovedDocuments.mockRejectedValue(
        new Error("db_error"),
      );
      await controller.getApprovedDocuments({}, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("getGroupApproved trả về 200 với danh sách document đã duyệt", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "user-1" } };
      documentService.getGroupApproved.mockResolvedValue([{ id: "doc-1" }]);

      await controller.getGroupApproved(req, res);

      expect(documentService.getGroupApproved).toHaveBeenCalledWith(
        "g1",
        "user-1",
      );
      expect(res.json).toHaveBeenCalledWith([{ id: "doc-1" }]);
    });

    it("getGroupPending trả về 403 khi service ném lỗi", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "user-1" } };
      documentService.getGroupPending.mockRejectedValue(new Error("forbidden"));

      await controller.getGroupPending(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  /* ================= update/delete ================= */
  describe("updateDocument() / deleteDocument()", () => {
    it("updateDocument trả về 200 với document đã cập nhật", async () => {
      const req = {
        params: { id: "doc-1" },
        user: { id: "user-1" },
        body: { title: "New" },
      };
      documentService.updateDocument.mockResolvedValue({
        id: "doc-1",
        title: "New",
      });

      await controller.updateDocument(req, res);

      expect(documentService.updateDocument).toHaveBeenCalledWith(
        "doc-1",
        "user-1",
        { title: "New" },
      );
      expect(res.json).toHaveBeenCalledWith({ id: "doc-1", title: "New" });
    });

    it("updateDocument trả về 403 khi requester không phải owner", async () => {
      const req = { params: { id: "doc-1" }, user: { id: "user-2" }, body: {} };
      documentService.updateDocument.mockRejectedValue(new Error("forbidden"));

      await controller.updateDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("deleteDocument trả về 200 { deleted: true } khi thành công", async () => {
      const req = { params: { id: "doc-1" }, user: { id: "user-1" } };
      documentService.deleteDocument.mockResolvedValue();

      await controller.deleteDocument(req, res);

      expect(res.json).toHaveBeenCalledWith({ deleted: true });
    });

    it("deleteDocument trả về 403 khi requester không phải owner", async () => {
      const req = { params: { id: "doc-1" }, user: { id: "user-2" } };
      documentService.deleteDocument.mockRejectedValue(new Error("forbidden"));

      await controller.deleteDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  /* ================= search & tags ================= */
  describe("search() / getAllTags()", () => {
    it("trả về mảng rỗng ngay lập tức khi query rỗng", async () => {
      const req = { query: { query: "   " }, user: { id: "user-1" } };

      await controller.search(req, res);

      expect(documentService.searchDocuments).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("gọi searchDocuments với limit/offset tối thiểu là 1 và 0", async () => {
      const req = {
        query: { query: "abc", limit: "-5", offset: "-2" },
        user: { id: "user-1" },
      };
      documentService.searchDocuments.mockResolvedValue([]);

      await controller.search(req, res);

      expect(documentService.searchDocuments).toHaveBeenCalledWith(
        "abc",
        "user-1",
        { limit: 1, offset: 0 },
      );
    });

    it("trả về 400 khi searchDocuments ném lỗi", async () => {
      const req = { query: { query: "abc" }, user: { id: "user-1" } };
      documentService.searchDocuments.mockRejectedValue(
        new Error("search_error"),
      );

      await controller.search(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("getAllTags trả về 200 với danh sách tag", async () => {
      documentService.getAllTags.mockResolvedValue(["math", "ai"]);

      await controller.getAllTags({}, res);

      expect(res.json).toHaveBeenCalledWith(["math", "ai"]);
    });

    it("getAllTags trả về 400 khi service lỗi", async () => {
      documentService.getAllTags.mockRejectedValue(new Error("db_error"));

      await controller.getAllTags({}, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
