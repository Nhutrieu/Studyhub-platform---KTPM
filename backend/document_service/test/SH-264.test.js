/**
 * SH-264: Unit Test cho DocumentService
 * Mocking: DocumentRepository, DocumentTagRepository, DocumentCommentRepository,
 *          DocumentBookmarkRepository, DocumentDownloadRepository, GroupDocumentRepository,
 *          GroupServiceClient, utils/cloudinary.js
 *
 * Quy tắc ESM: mock module trước, sau đó import động (theo TESTING_GUIDE.md - mục C)
 */
import { jest } from "@jest/globals";

// 1. Mock cloudinary util trước khi import DocumentService
jest.unstable_mockModule("../src/utils/cloudinary.js", () => ({
  uploadToCloudinary: jest.fn(),
  buildPreviewUrl: jest.fn(),
  getExtensionFromUrl: jest.fn(),
}));

// 2. Load động các module cần test
const { uploadToCloudinary, buildPreviewUrl } = await import(
  "../src/utils/cloudinary.js"
);
const { default: DocumentService } = await import(
  "../src/services/DocumentService.js"
);

describe("DocumentService (SH-264)", () => {
  let documentRepo;
  let tagRepo;
  let commentRepo;
  let bookmarkRepo;
  let downloadRepo;
  let groupDocRepo;
  let groupClient;
  let outboxRepo;
  let logger;
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    documentRepo = {
      create: jest.fn(),
      countAllDocuments: jest.fn(),
      findPublicFeed: jest.fn(),
      findHomeFeed: jest.fn(),
      findAllOfOwner: jest.fn(),
      findPublicOfUser: jest.fn(),
      findById: jest.fn(),
      findAllDocuments: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
      searchByKeyword: jest.fn(),
    };

    tagRepo = {
      findByDocument: jest.fn().mockResolvedValue([]),
      attachTags: jest.fn(),
      deleteAllTags: jest.fn(),
      getAllTags: jest.fn(),
    };

    commentRepo = {
      countComments: jest.fn().mockResolvedValue(0),
      countAllComments: jest.fn(),
      findByDocumentPaginated: jest.fn(),
      findById: jest.fn(),
      findAllPaginated: jest.fn(),
    };

    bookmarkRepo = { countBookmarks: jest.fn().mockResolvedValue(0) };
    downloadRepo = { countDownloads: jest.fn().mockResolvedValue(0) };

    groupDocRepo = {
      createRecord: jest.fn(),
      findGroupsByDocument: jest.fn(),
      findApprovedInGroup: jest.fn(),
      findPendingInGroup: jest.fn(),
    };

    groupClient = {
      canViewGroupDocuments: jest.fn(),
      evaluateDocumentApproval: jest.fn(),
      validateReviewer: jest.fn(),
      getUserGroups: jest.fn(),
    };

    outboxRepo = {};
    logger = { error: jest.fn() };

    service = new DocumentService({
      documentRepo,
      tagRepo,
      commentRepo,
      bookmarkRepo,
      downloadRepo,
      groupDocRepo,
      groupClient,
      outboxRepo,
      logger,
    });
  });

  const buildDoc = (overrides = {}) => ({
    id: "doc-1",
    owner_id: "user-1",
    title: "Sample Title",
    description: "Sample description",
    visibility: "PUBLIC",
    group_id: null,
    file_name: "file.pdf",
    storage_path: "https://cdn.test/file.pdf",
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    ...overrides,
  });

  /* ================= createDocument ================= */
  describe("createDocument()", () => {
    it("ném lỗi file_required nếu không có file đính kèm", async () => {
      await expect(
        service.createDocument({ owner_id: "user-1", title: "No file" })
      ).rejects.toThrow("file_required");
      expect(uploadToCloudinary).not.toHaveBeenCalled();
    });

    it("upload lên cloudinary và tạo document PUBLIC thành công (không tag)", async () => {
      uploadToCloudinary.mockResolvedValue({
        secure_url: "https://cdn.test/document_abc.pdf",
      });
      documentRepo.create.mockResolvedValue(buildDoc());

      const result = await service.createDocument({
        owner_id: "user-1",
        title: "Sample Title",
        description: "Sample description",
        visibility: "PUBLIC",
        file: { originalname: "note.pdf", buffer: Buffer.from("abc") },
      });

      expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
      expect(documentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: "user-1",
          title: "Sample Title",
          storage_path: "https://cdn.test/document_abc.pdf",
        })
      );
      expect(tagRepo.attachTags).not.toHaveBeenCalled();
      expect(result.id).toBe("doc-1");
      expect(result.tag).toEqual([]);
    });

    it("gắn tags cho document khi tags được truyền vào", async () => {
      uploadToCloudinary.mockResolvedValue({ secure_url: "https://cdn.test/x" });
      documentRepo.create.mockResolvedValue(buildDoc());

      await service.createDocument({
        owner_id: "user-1",
        title: "Has tags",
        tags: ["math", "ai"],
        file: { originalname: "a.pdf", buffer: Buffer.from("x") },
      });

      expect(tagRepo.attachTags).toHaveBeenCalledWith("doc-1", ["math", "ai"]);
    });

    it("ném lỗi group_id_required khi visibility=GROUP mà không có group_id", async () => {
      uploadToCloudinary.mockResolvedValue({ secure_url: "https://cdn.test/x" });
      documentRepo.create.mockResolvedValue(buildDoc({ visibility: "GROUP" }));

      await expect(
        service.createDocument({
          owner_id: "user-1",
          title: "Group doc",
          visibility: "GROUP",
          file: { originalname: "a.pdf", buffer: Buffer.from("x") },
        })
      ).rejects.toThrow("group_id_required");
    });

    it("tạo record GROUP với status APPROVED khi autoApprove=true", async () => {
      uploadToCloudinary.mockResolvedValue({ secure_url: "https://cdn.test/x" });
      documentRepo.create.mockResolvedValue(
        buildDoc({ visibility: "GROUP", group_id: "group-1" })
      );
      groupClient.evaluateDocumentApproval.mockResolvedValue({ autoApprove: true });

      await service.createDocument({
        owner_id: "user-1",
        title: "Group doc",
        visibility: "GROUP",
        group_id: "group-1",
        file: { originalname: "a.pdf", buffer: Buffer.from("x") },
      });

      expect(groupDocRepo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: "group-1",
          status: "APPROVED",
          reviewed_by: "user-1",
        })
      );
    });

    it("tạo record GROUP với status PENDING khi autoApprove=false", async () => {
      uploadToCloudinary.mockResolvedValue({ secure_url: "https://cdn.test/x" });
      documentRepo.create.mockResolvedValue(
        buildDoc({ visibility: "GROUP", group_id: "group-1" })
      );
      groupClient.evaluateDocumentApproval.mockResolvedValue({ autoApprove: false });

      await service.createDocument({
        owner_id: "user-1",
        title: "Group doc",
        visibility: "GROUP",
        group_id: "group-1",
        file: { originalname: "a.pdf", buffer: Buffer.from("x") },
      });

      expect(groupDocRepo.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({ status: "PENDING", reviewed_by: null })
      );
    });
  });

  /* ================= counts ================= */
  describe("countDocuments() / countComments()", () => {
    it("trả về tổng số document", async () => {
      documentRepo.countAllDocuments.mockResolvedValue(42);
      const result = await service.countDocuments();
      expect(result).toEqual({ countDocuments: 42 });
    });

    it("trả về tổng số comment", async () => {
      commentRepo.countAllComments.mockResolvedValue(7);
      const result = await service.countComments();
      expect(result).toEqual({ countComments: 7 });
    });
  });

  /* ================= feeds ================= */
  describe("getPublicFeed() / getMyDocuments() / getUserPublicProfileDocuments()", () => {
    it("getPublicFeed trả về danh sách document đã gắn tag", async () => {
      documentRepo.findPublicFeed.mockResolvedValue([buildDoc()]);
      const result = await service.getPublicFeed({ limit: 10, offset: 0 });
      expect(documentRepo.findPublicFeed).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
      expect(result).toHaveLength(1);
      expect(result[0].tag).toEqual([]);
    });

    it("getMyDocuments gọi đúng repo với owner_id", async () => {
      documentRepo.findAllOfOwner.mockResolvedValue([buildDoc()]);
      await service.getMyDocuments("user-1", { limit: 5, offset: 0 });
      expect(documentRepo.findAllOfOwner).toHaveBeenCalledWith("user-1", {
        limit: 5,
        offset: 0,
      });
    });

    it("getUserPublicProfileDocuments gọi đúng repo với user_id", async () => {
      documentRepo.findPublicOfUser.mockResolvedValue([]);
      const result = await service.getUserPublicProfileDocuments("user-2");
      expect(documentRepo.findPublicOfUser).toHaveBeenCalledWith("user-2", {
        limit: 50,
        offset: 0,
      });
      expect(result).toEqual([]);
    });
  });

  describe("getHomeFeed()", () => {
    it("trả về public feed khi không có user_id", async () => {
      documentRepo.findPublicFeed.mockResolvedValue([buildDoc()]);
      const result = await service.getHomeFeed(null, null, {});
      expect(documentRepo.findPublicFeed).toHaveBeenCalled();
      expect(groupClient.getUserGroups).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("lấy groupIds từ groupClient rồi truy vấn home feed khi có user_id", async () => {
      groupClient.getUserGroups.mockResolvedValue([
        { group_id: "g1" },
        { group_id: "g2" },
      ]);
      documentRepo.findHomeFeed.mockResolvedValue([buildDoc()]);

      await service.getHomeFeed("user-1", "token-abc", { limit: 20, offset: 0 });

      expect(groupClient.getUserGroups).toHaveBeenCalledWith("token-abc", "user-1");
      expect(documentRepo.findHomeFeed).toHaveBeenCalledWith({
        user_id: "user-1",
        groupIds: ["g1", "g2"],
        limit: 20,
        offset: 0,
      });
    });

    it("dùng mảng groupIds rỗng nếu groupClient.getUserGroups ném lỗi", async () => {
      groupClient.getUserGroups.mockRejectedValue(new Error("network_error"));
      documentRepo.findHomeFeed.mockResolvedValue([]);

      await service.getHomeFeed("user-1", "token-abc", {});

      expect(documentRepo.findHomeFeed).toHaveBeenCalledWith(
        expect.objectContaining({ groupIds: [] })
      );
    });
  });

  /* ================= getDocumentDetail ================= */
  describe("getDocumentDetail()", () => {
    it("ném lỗi document_not_found khi document không tồn tại", async () => {
      documentRepo.findById.mockResolvedValue(null);
      await expect(
        service.getDocumentDetail("doc-x", "user-1", false)
      ).rejects.toThrow("document_not_found");
    });

    it("admin luôn xem được document bất kể visibility", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ visibility: "PRIVATE" }));
      const result = await service.getDocumentDetail("doc-1", "someone-else", true);
      expect(result.id).toBe("doc-1");
    });

    it("cho phép xem document PUBLIC với bất kỳ requester nào", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ visibility: "PUBLIC" }));
      const result = await service.getDocumentDetail("doc-1", "user-2", false);
      expect(result.id).toBe("doc-1");
    });

    it("ném forbidden khi requester không phải owner của document PRIVATE", async () => {
      documentRepo.findById.mockResolvedValue(
        buildDoc({ visibility: "PRIVATE", owner_id: "user-1" })
      );
      await expect(
        service.getDocumentDetail("doc-1", "user-2", false)
      ).rejects.toThrow("forbidden");
    });

    it("cho phép owner xem document PRIVATE của chính mình", async () => {
      documentRepo.findById.mockResolvedValue(
        buildDoc({ visibility: "PRIVATE", owner_id: "user-1" })
      );
      const result = await service.getDocumentDetail("doc-1", "user-1", false);
      expect(result.id).toBe("doc-1");
    });

    it("cho phép xem document GROUP khi _canAccessGroupDocument trả về true", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ visibility: "GROUP" }));
      groupDocRepo.findGroupsByDocument.mockResolvedValue([
        { group_id: "g1", status: "APPROVED" },
      ]);
      groupClient.canViewGroupDocuments.mockResolvedValue({ allowed: true });

      const result = await service.getDocumentDetail("doc-1", "user-2", false);
      expect(result.id).toBe("doc-1");
    });

    it("ném forbidden khi document GROUP mà requester không có quyền truy cập", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ visibility: "GROUP" }));
      groupDocRepo.findGroupsByDocument.mockResolvedValue([
        { group_id: "g1", status: "APPROVED" },
      ]);
      groupClient.canViewGroupDocuments.mockResolvedValue({ allowed: false });

      await expect(
        service.getDocumentDetail("doc-1", "user-2", false)
      ).rejects.toThrow("forbidden");
    });
  });

  /* ================= getDocumentPreview ================= */
  describe("getDocumentPreview()", () => {
    it("ném lỗi document_not_found khi document không tồn tại", async () => {
      documentRepo.findById.mockResolvedValue(null);
      await expect(
        service.getDocumentPreview("doc-x", "user-1", false)
      ).rejects.toThrow("document_not_found");
    });

    it("trả về preview_url cho document PUBLIC", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ visibility: "PUBLIC" }));
      buildPreviewUrl.mockReturnValue("https://cdn.test/preview.pdf");

      const result = await service.getDocumentPreview("doc-1", "user-2", false);
      expect(result).toEqual({
        document_id: "doc-1",
        preview_url: "https://cdn.test/preview.pdf",
      });
    });

    it("ném forbidden khi document PRIVATE không thuộc về requester", async () => {
      documentRepo.findById.mockResolvedValue(
        buildDoc({ visibility: "PRIVATE", owner_id: "owner-a" })
      );
      await expect(
        service.getDocumentPreview("doc-1", "user-b", false)
      ).rejects.toThrow("forbidden");
    });

    it("trả về preview cho document GROUP khi có quyền truy cập", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ visibility: "GROUP" }));
      groupDocRepo.findGroupsByDocument.mockResolvedValue([
        { group_id: "g1", status: "APPROVED" },
      ]);
      groupClient.canViewGroupDocuments.mockResolvedValue({ allowed: true });
      buildPreviewUrl.mockReturnValue("https://cdn.test/preview.pdf");

      const result = await service.getDocumentPreview("doc-1", "user-2", false);
      expect(result.preview_url).toBe("https://cdn.test/preview.pdf");
    });
  });

  /* ================= group listing ================= */
  describe("getApprovedDocuments() / getGroupApproved() / getGroupPending()", () => {
    it("getApprovedDocuments trả về danh sách document đã gắn tag", async () => {
      documentRepo.findAllDocuments.mockResolvedValue([buildDoc()]);
      const result = await service.getApprovedDocuments();
      expect(result).toHaveLength(1);
    });

    it("getGroupApproved ném lỗi khi requester không có quyền xem group", async () => {
      groupClient.canViewGroupDocuments.mockResolvedValue({
        allowed: false,
        reason: "not_a_member",
      });
      await expect(
        service.getGroupApproved("group-1", "user-1")
      ).rejects.toThrow("not_a_member");
    });

    it("getGroupApproved trả về danh sách document khi được phép", async () => {
      groupClient.canViewGroupDocuments.mockResolvedValue({ allowed: true });
      groupDocRepo.findApprovedInGroup.mockResolvedValue([buildDoc()]);

      const result = await service.getGroupApproved("group-1", "user-1");
      expect(groupDocRepo.findApprovedInGroup).toHaveBeenCalledWith("group-1", {
        limit: 50,
        offset: 0,
      });
      expect(result).toHaveLength(1);
    });

    it("getGroupPending ném lỗi forbidden mặc định khi không có reason", async () => {
      groupClient.canViewGroupDocuments.mockResolvedValue({ allowed: false });
      await expect(
        service.getGroupPending("group-1", "user-1")
      ).rejects.toThrow("forbidden");
    });

    it("getGroupPending trả về danh sách document đang chờ duyệt khi được phép", async () => {
      groupClient.canViewGroupDocuments.mockResolvedValue({ allowed: true });
      groupDocRepo.findPendingInGroup.mockResolvedValue([buildDoc()]);

      const result = await service.getGroupPending("group-1", "user-1");
      expect(result).toHaveLength(1);
    });
  });

  /* ================= updateDocument ================= */
  describe("updateDocument()", () => {
    it("ném lỗi document_not_found khi document không tồn tại", async () => {
      documentRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateDocument("doc-x", "user-1", { title: "new" })
      ).rejects.toThrow("document_not_found");
    });

    it("ném forbidden khi requester không phải owner", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ owner_id: "user-1" }));
      await expect(
        service.updateDocument("doc-1", "user-2", { title: "new" })
      ).rejects.toThrow("forbidden");
    });

    it("cập nhật document thành công khi requester là owner (không đổi tags)", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ owner_id: "user-1" }));
      documentRepo.update.mockResolvedValue(buildDoc({ title: "Updated" }));

      const result = await service.updateDocument("doc-1", "user-1", {
        title: "Updated",
      });

      expect(documentRepo.update).toHaveBeenCalledWith(
        "doc-1",
        expect.objectContaining({ title: "Updated" })
      );
      expect(tagRepo.deleteAllTags).not.toHaveBeenCalled();
      expect(result.title).toBe("Updated");
    });

    it("thay thế toàn bộ tags khi updates.tags được truyền vào", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ owner_id: "user-1" }));
      documentRepo.update.mockResolvedValue(buildDoc());

      await service.updateDocument("doc-1", "user-1", { tags: ["new-tag"] });

      expect(tagRepo.deleteAllTags).toHaveBeenCalledWith("doc-1");
      expect(tagRepo.attachTags).toHaveBeenCalledWith("doc-1", ["new-tag"]);
    });
  });

  /* ================= deleteDocument ================= */
  describe("deleteDocument()", () => {
    it("ném lỗi document_not_found khi document không tồn tại", async () => {
      documentRepo.findById.mockResolvedValue(null);
      await expect(service.deleteDocument("doc-x", "user-1")).rejects.toThrow(
        "document_not_found"
      );
    });

    it("ném forbidden khi requester không phải owner", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ owner_id: "user-1" }));
      await expect(service.deleteDocument("doc-1", "user-2")).rejects.toThrow(
        "forbidden"
      );
    });

    it("xóa document và toàn bộ tags liên quan khi requester là owner", async () => {
      documentRepo.findById.mockResolvedValue(buildDoc({ owner_id: "user-1" }));

      await service.deleteDocument("doc-1", "user-1");

      expect(tagRepo.deleteAllTags).toHaveBeenCalledWith("doc-1");
      expect(documentRepo.deleteById).toHaveBeenCalledWith("doc-1");
    });
  });

  /* ================= searchDocuments ================= */
  describe("searchDocuments()", () => {
    it("trả về mảng rỗng khi không có keyword", async () => {
      const result = await service.searchDocuments("", "user-1");
      expect(result).toEqual([]);
      expect(documentRepo.searchByKeyword).not.toHaveBeenCalled();
    });

    it("trả về mảng rỗng khi repo không tìm thấy kết quả", async () => {
      documentRepo.searchByKeyword.mockResolvedValue([]);
      const result = await service.searchDocuments("keyword", "user-1");
      expect(result).toEqual([]);
    });

    it("luôn giữ lại document PUBLIC trong kết quả tìm kiếm", async () => {
      documentRepo.searchByKeyword.mockResolvedValue([
        buildDoc({ id: "doc-pub", visibility: "PUBLIC" }),
      ]);
      const result = await service.searchDocuments("keyword", "user-1");
      expect(result.map((d) => d.id)).toEqual(["doc-pub"]);
    });

    it("chỉ giữ lại document PRIVATE nếu requester là owner", async () => {
      documentRepo.searchByKeyword.mockResolvedValue([
        buildDoc({ id: "doc-mine", visibility: "PRIVATE", owner_id: "user-1" }),
        buildDoc({ id: "doc-other", visibility: "PRIVATE", owner_id: "user-2" }),
      ]);
      const result = await service.searchDocuments("keyword", "user-1");
      expect(result.map((d) => d.id)).toEqual(["doc-mine"]);
    });

    it("giữ lại document GROUP khi requester có quyền xem group APPROVED", async () => {
      documentRepo.searchByKeyword.mockResolvedValue([
        buildDoc({ id: "doc-g", visibility: "GROUP" }),
      ]);
      groupDocRepo.findGroupsByDocument.mockResolvedValue([
        { group_id: "g1", status: "APPROVED" },
      ]);
      groupClient.canViewGroupDocuments.mockResolvedValue({ allowed: true });

      const result = await service.searchDocuments("keyword", "user-1");
      expect(result.map((d) => d.id)).toEqual(["doc-g"]);
    });

    it("giữ lại document GROUP đang PENDING khi requester được xác thực là reviewer", async () => {
      documentRepo.searchByKeyword.mockResolvedValue([
        buildDoc({ id: "doc-g", visibility: "GROUP" }),
      ]);
      groupDocRepo.findGroupsByDocument.mockResolvedValue([
        { group_id: "g1", status: "PENDING" },
      ]);
      groupClient.validateReviewer.mockResolvedValue({ ok: true });

      const result = await service.searchDocuments("keyword", "user-1");
      expect(result.map((d) => d.id)).toEqual(["doc-g"]);
    });

    it("loại bỏ document GROUP khỏi kết quả khi kiểm tra quyền group bị lỗi", async () => {
      documentRepo.searchByKeyword.mockResolvedValue([
        buildDoc({ id: "doc-g", visibility: "GROUP" }),
      ]);
      groupDocRepo.findGroupsByDocument.mockResolvedValue([
        { group_id: "g1", status: "PENDING" },
      ]);
      groupClient.validateReviewer.mockRejectedValue(new Error("not_reviewer"));

      const result = await service.searchDocuments("keyword", "user-1");
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  /* ================= tags & comments ================= */
  describe("getAllTags()", () => {
    it("trả về danh sách tag từ tagRepo", async () => {
      tagRepo.getAllTags.mockResolvedValue(["ai", "math"]);
      const result = await service.getAllTags();
      expect(result).toEqual(["ai", "math"]);
    });
  });

  describe("getCommentsByDocument()", () => {
    it("trả về danh sách comment mới nhất khi không có comment cha", async () => {
      commentRepo.findByDocumentPaginated.mockResolvedValue([
        { id: "c1", parent_comment_id: null },
      ]);

      const result = await service.getCommentsByDocument("doc-1", {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual([{ id: "c1", parent_comment_id: null }]);
      expect(commentRepo.findById).not.toHaveBeenCalled();
    });

    it("truy vết và gộp chuỗi comment cha trước comment con, loại bỏ trùng lặp", async () => {
      const parent = { id: "c-parent", parent_comment_id: null };
      const child = { id: "c-child", parent_comment_id: "c-parent" };

      commentRepo.findByDocumentPaginated.mockResolvedValue([child]);
      commentRepo.findById.mockResolvedValue(parent);

      const result = await service.getCommentsByDocument("doc-1", {
        limit: 10,
        offset: 0,
      });

      expect(result.map((c) => c.id)).toEqual(["c-parent", "c-child"]);
    });
  });

  describe("getAllComments()", () => {
    it("dùng limit/offset mặc định khi tham số không hợp lệ", async () => {
      commentRepo.findAllPaginated.mockResolvedValue([]);
      commentRepo.countAllComments.mockResolvedValue(0);

      const result = await service.getAllComments({ limit: "abc", offset: "xyz" });

      expect(commentRepo.findAllPaginated).toHaveBeenCalledWith({
        limit: 50,
        offset: 0,
      });
      expect(result.pagination).toEqual({ limit: 50, offset: 0, total: 0 });
    });

    it("map từng comment qua toJSON() và trả về pagination chính xác", async () => {
      const toJSON = jest.fn().mockReturnValue({ id: "c1", content: "hi" });
      commentRepo.findAllPaginated.mockResolvedValue([{ toJSON }]);
      commentRepo.countAllComments.mockResolvedValue(1);

      const result = await service.getAllComments({ limit: 20, offset: 0 });

      expect(toJSON).toHaveBeenCalled();
      expect(result.data).toEqual([{ id: "c1", content: "hi" }]);
      expect(result.pagination).toEqual({ limit: 20, offset: 0, total: 1 });
    });
  });
});
