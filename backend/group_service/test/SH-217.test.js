import { jest } from "@jest/globals";
import express from "express";

// ============================================================
// 1. Mock các middleware xác thực/phân quyền TRƯỚC khi import router
//    Mục tiêu của Integration Test này là xác minh TÍNH LIÊN KẾT ĐỊNH TUYẾN
//    (method + path -> đúng controller -> đúng response), không lặp lại
//    logic xác thực JWT (đã được kiểm thử riêng ở SH-216).
// ============================================================
jest.unstable_mockModule("../src/middlewares/auth.js", () => ({
  verifyAccessToken: jest.fn((req, res, next) => {
    req.user = { id: "user-01", role: ["member"] };
    next();
  }),
}));

jest.unstable_mockModule("../src/middlewares/role.js", () => ({
  requireRole: jest.fn(() => (req, res, next) => next()),
}));

jest.unstable_mockModule("../src/middlewares/groupRole.js", () => ({
  createGroupRoleMiddleware: jest.fn(() => ({
    requireMember: (req, res, next) => next(),
    requireManager: (req, res, next) => next(),
    requireOwner: (req, res, next) => next(),
  })),
}));

// 2. Load động supertest + router cần test (sau khi mock)
const request = (await import("supertest")).default;
const { createGroupRouter } = await import("../src/routes/groupRoutes.js");

/**
 * Dựng app Express tối giản chỉ để mount router Group, tiêm groupService giả lập.
 */
function buildApp(groupService) {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/group", createGroupRouter({ groupService }));
  return app;
}

describe("SH-217: Integration Test - Router Group (Supertest)", () => {
  let groupService, app;

  beforeEach(() => {
    jest.clearAllMocks();
    groupService = {
      createGroup: jest.fn(),
      checkMembership: jest.fn(),
      updateGroup: jest.fn(),
      updateAvatar: jest.fn(),
      deleteGroup: jest.fn(),
      getGroupDetail: jest.fn(),
      listGroupsByUser: jest.fn(),
      listOwnedGroups: jest.fn(),
      findGroups: jest.fn(),
      listGroupsNotJoined: jest.fn(),
      listJoinRequests: jest.fn(),
      listMyInvites: jest.fn(),
      countGroups: jest.fn(),
      getAllGroups: jest.fn(),
      joinGroup: jest.fn(),
      cancelJoinRequest: jest.fn(),
      approveJoinRequest: jest.fn(),
      rejectJoinRequest: jest.fn(),
      inviteMember: jest.fn(),
      isJoinPending: jest.fn(),
      getActivityLogs: jest.fn(),
    };
    app = buildApp(groupService);
  });

  // ============================================================
  // GET /:group_id/membership  -> route công khai, KHÔNG cần xác thực
  // ============================================================
  it("GET /:group_id/membership không yêu cầu xác thực và trả về 200", async () => {
    groupService.checkMembership.mockResolvedValue({ group: { id: "g1", role: "MEMBER" } });

    const res = await request(app).get("/api/v1/group/g1/membership");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { group: { id: "g1", role: "MEMBER" } } });
    expect(groupService.checkMembership).toHaveBeenCalledWith("g1", undefined);
  });

  // ============================================================
  // POST /  -> tạo group, có middleware upload.single("avatar")
  // ============================================================
  it("POST / định tuyến đúng tới GroupController.createGroup và trả về 201", async () => {
    groupService.createGroup.mockResolvedValue({ id: "g1", name: "SE Group" });

    const res = await request(app)
      .post("/api/v1/group")
      .field("name", "SE Group")
      .field("access", "PUBLIC");

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { id: "g1", name: "SE Group" } });
    expect(groupService.createGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: "SE Group", access: "PUBLIC", user_id: "user-01" })
    );
  });

  it("POST / trả về 400 khi thiếu tên group (controller validation)", async () => {
    const res = await request(app).post("/api/v1/group").send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Group name is required" });
    expect(groupService.createGroup).not.toHaveBeenCalled();
  });

  // ============================================================
  // GET /  -> tìm kiếm group (query params)
  // ============================================================
  it("GET / chuyển tiếp đúng query params xuống GroupService.findGroups", async () => {
    groupService.findGroups.mockResolvedValue([{ id: "g1" }]);

    const res = await request(app).get("/api/v1/group").query({ name: "SE", limit: 10, offset: 0 });

    expect(res.status).toBe(200);
    expect(groupService.findGroups).toHaveBeenCalledWith(
      { name: "SE", access: undefined, limit: 10, offset: 0 },
      "user-01"
    );
    expect(res.body).toEqual({ success: true, data: [{ id: "g1" }] });
  });

  // ============================================================
  // GET /user/owned  -> route tĩnh phải khớp TRƯỚC /:group_id (thứ tự route)
  // ============================================================
  it("GET /user/owned định tuyến tới listOwnedGroups, không bị route /:group_id nuốt mất", async () => {
    groupService.listOwnedGroups.mockResolvedValue([{ id: "g1" }]);

    const res = await request(app).get("/api/v1/group/user/owned");

    expect(res.status).toBe(200);
    expect(groupService.listOwnedGroups).toHaveBeenCalledWith("user-01");
    expect(groupService.getGroupDetail).not.toHaveBeenCalled();
  });

  // ============================================================
  // GET /:group_id  -> route động lấy chi tiết group
  // ============================================================
  it("GET /:group_id định tuyến đúng tới getGroupDetail và trả về data group", async () => {
    groupService.getGroupDetail.mockResolvedValue({ id: "g99", name: "Group 99" });

    const res = await request(app).get("/api/v1/group/g99");

    expect(res.status).toBe(200);
    expect(groupService.getGroupDetail).toHaveBeenCalledWith("g99", "user-01");
    expect(res.body).toEqual({ success: true, data: { id: "g99", name: "Group 99" } });
  });

  // ============================================================
  // POST /:group_id/join  -> tham gia group
  // ============================================================
  it("POST /:group_id/join định tuyến đúng tới joinGroup", async () => {
    groupService.joinGroup.mockResolvedValue({ group_id: "g1", role: "MEMBER" });

    const res = await request(app).post("/api/v1/group/g1/join");

    expect(res.status).toBe(200);
    expect(groupService.joinGroup).toHaveBeenCalledWith("g1", "user-01");
    expect(res.body).toEqual({ success: true, data: { group_id: "g1", role: "MEMBER" } });
  });

  // ============================================================
  // DELETE /:group_id/join -> hủy yêu cầu tham gia
  // ============================================================
  it("DELETE /:group_id/join định tuyến đúng tới cancelJoinRequest", async () => {
    groupService.cancelJoinRequest.mockResolvedValue(true);

    const res = await request(app).delete("/api/v1/group/g1/join");

    expect(res.status).toBe(200);
    expect(groupService.cancelJoinRequest).toHaveBeenCalledWith("g1", "user-01");
    expect(res.body).toEqual({ success: true });
  });

  // ============================================================
  // PATCH /:group_id  -> cập nhật group (đi qua role.requireManager)
  // ============================================================
  it("PATCH /:group_id định tuyến đúng tới updateGroup", async () => {
    groupService.updateGroup.mockResolvedValue({ id: "g1", name: "Updated" });

    const res = await request(app).patch("/api/v1/group/g1").send({ name: "Updated" });

    expect(res.status).toBe(200);
    expect(groupService.updateGroup).toHaveBeenCalledWith("g1", { name: "Updated" });
    expect(res.body).toEqual({ success: true, data: { id: "g1", name: "Updated" } });
  });

  // ============================================================
  // DELETE /:group_id  -> xóa group (đi qua role.requireOwner)
  // ============================================================
  it("DELETE /:group_id định tuyến đúng tới deleteGroup", async () => {
    groupService.deleteGroup.mockResolvedValue(true);

    const res = await request(app).delete("/api/v1/group/g1");

    expect(res.status).toBe(200);
    expect(groupService.deleteGroup).toHaveBeenCalledWith("g1", "user-01");
    expect(res.body).toEqual({ success: true });
  });

  // ============================================================
  // PATCH /requests/:group_id/:request_id/approve|reject
  // ============================================================
  it("PATCH /requests/:group_id/:request_id/approve định tuyến đúng tới approveJoinRequest", async () => {
    groupService.approveJoinRequest.mockResolvedValue({ id: "req-01" });

    const res = await request(app).patch("/api/v1/group/requests/g1/req-01/approve");

    expect(res.status).toBe(200);
    expect(groupService.approveJoinRequest).toHaveBeenCalledWith("req-01", "user-01");
  });

  it("PATCH /requests/:group_id/:request_id/reject định tuyến đúng tới rejectJoinRequest", async () => {
    groupService.rejectJoinRequest.mockResolvedValue(true);

    const res = await request(app).patch("/api/v1/group/requests/g1/req-01/reject");

    expect(res.status).toBe(200);
    expect(groupService.rejectJoinRequest).toHaveBeenCalledWith("req-01", "user-01");
  });

  // ============================================================
  // Xử lý lỗi: service ném lỗi có status -> router/controller trả đúng mã lỗi
  // ============================================================
  it("trả về đúng status lỗi (403) khi GroupService ném lỗi có status tùy chỉnh", async () => {
    const err = new Error("Only owner can delete group");
    err.status = 403;
    groupService.deleteGroup.mockRejectedValue(err);

    const res = await request(app).delete("/api/v1/group/g1");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, message: "Only owner can delete group" });
  });

  it("trả về 404 cho route không tồn tại trong Group Router", async () => {
    const res = await request(app).get("/api/v1/group/g1/non-existent-action/extra/path/x");

    // Route /:group_id/non-existent-action/... không khớp bất kỳ định nghĩa nào -> Express tự trả 404
    expect(res.status).toBe(404);
  });
});