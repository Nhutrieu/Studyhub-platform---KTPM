import { jest } from "@jest/globals";
 
// GroupController không import trực tiếp module ngoài nào cần mock ở cấp module,
// nên chỉ cần load động để đồng nhất theo quy ước ESM của dự án.
const { GroupController } = await import("../src/controllers/GroupController.js");
 
/**
 * Helper tạo mock Response object của Express (status/json có thể chain)
 */
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
 
describe("SH-215: Unit Test - GroupController", () => {
  let groupService, controller, res;
 
  beforeEach(() => {
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
    controller = new GroupController({ groupService });
    res = mockResponse();
  });
 
  // ============================================================
  // createGroup - validation input + status code
  // ============================================================
  describe("createGroup()", () => {
    it("trả về 400 khi thiếu tên group", async () => {
      const req = { body: {}, user: { id: "user-01" }, file: null };
 
      await controller.createGroup(req, res);
 
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Group name is required",
      });
      expect(groupService.createGroup).not.toHaveBeenCalled();
    });
 
    it("trả về 401 khi không xác thực được user_id", async () => {
      const req = { body: { name: "Group A" }, user: undefined, file: null };
 
      await controller.createGroup(req, res);
 
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
      });
    });
 
    it("trả về 201 và data khi tạo group thành công", async () => {
      const req = {
        body: { name: "SE Group", description: "desc", access: "PUBLIC", auto_approve_docs: "true" },
        user: { id: "user-01" },
        file: null,
      };
      groupService.createGroup.mockResolvedValue({ id: "g1", name: "SE Group" });
 
      await controller.createGroup(req, res);
 
      expect(groupService.createGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "SE Group",
          user_id: "user-01",
          auto_approve_docs: 1,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: "g1", name: "SE Group" } });
    });
 
    it("trả về mã lỗi tương ứng khi service ném lỗi (500 mặc định)", async () => {
      const req = { body: { name: "SE Group" }, user: { id: "user-01" }, file: null };
      groupService.createGroup.mockRejectedValue(new Error("DB down"));
 
      await controller.createGroup(req, res);
 
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "DB down" });
    });
  });
 
  // ============================================================
  // checkMembership
  // ============================================================
  describe("checkMembership()", () => {
    it("trả về 200 kèm dữ liệu membership", async () => {
      const req = { params: { group_id: "g1" }, header: jest.fn().mockReturnValue("user-01") };
      groupService.checkMembership.mockResolvedValue({ group: { id: "g1", role: "MEMBER" } });
 
      await controller.checkMembership(req, res);
 
      expect(groupService.checkMembership).toHaveBeenCalledWith("g1", "user-01");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { group: { id: "g1", role: "MEMBER" } },
      });
    });
 
    it("trả về status lỗi từ service (404 group not found)", async () => {
      const req = { params: { group_id: "g1" }, header: jest.fn().mockReturnValue("user-01") };
      const err = new Error("Group not found");
      err.status = 404;
      groupService.checkMembership.mockRejectedValue(err);
 
      await controller.checkMembership(req, res);
 
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "Group not found" });
    });
  });
 
  // ============================================================
  // updateAvatar
  // ============================================================
  describe("updateAvatar()", () => {
    it("trả về lỗi khi không có file upload", async () => {
      const req = { params: { group_id: "g1" }, file: undefined };
 
      await controller.updateAvatar(req, res);
 
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "No avatar file uploaded" })
      );
      expect(groupService.updateAvatar).not.toHaveBeenCalled();
    });
 
    it("trả về 200 khi cập nhật avatar thành công", async () => {
      const req = { params: { group_id: "g1" }, file: { buffer: Buffer.from("x") } };
      groupService.updateAvatar.mockResolvedValue({ id: "g1", avatar_url: "url" });
 
      await controller.updateAvatar(req, res);
 
      expect(groupService.updateAvatar).toHaveBeenCalledWith("g1", req.file);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: "g1", avatar_url: "url" } });
    });
  });
 
  // ============================================================
  // deleteGroup
  // ============================================================
  describe("deleteGroup()", () => {
    it("trả về 200 khi xóa group thành công", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "owner-01" } };
      groupService.deleteGroup.mockResolvedValue(true);
 
      await controller.deleteGroup(req, res);
 
      expect(groupService.deleteGroup).toHaveBeenCalledWith("g1", "owner-01");
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
 
    it("trả về 403 khi không có quyền xóa", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "user-02" } };
      const err = new Error("Only owner can delete group");
      err.status = 403;
      groupService.deleteGroup.mockRejectedValue(err);
 
      await controller.deleteGroup(req, res);
 
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Only owner can delete group",
      });
    });
  });
 
  // ============================================================
  // getGroupDetail (sử dụng next thay vì try/catch trả JSON)
  // ============================================================
  describe("getGroupDetail()", () => {
    it("trả về 200 kèm dữ liệu group", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "user-01" } };
      const next = jest.fn();
      groupService.getGroupDetail.mockResolvedValue({ id: "g1", name: "SE Group" });
 
      await controller.getGroupDetail(req, res, next);
 
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: "g1", name: "SE Group" } });
      expect(next).not.toHaveBeenCalled();
    });
 
    it("gọi next(err) khi service ném lỗi", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "user-01" } };
      const next = jest.fn();
      const err = new Error("Not found");
      groupService.getGroupDetail.mockRejectedValue(err);
 
      await controller.getGroupDetail(req, res, next);
 
      expect(next).toHaveBeenCalledWith(err);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
 
  // ============================================================
  // listGroupsByUser - phân biệt viewer trùng/khác targetUserId
  // ============================================================
  describe("listGroupsByUser()", () => {
    it("gọi listGroupsByUser không giới hạn khi viewer xem chính mình", async () => {
      const req = { user: { id: "user-01" }, params: { user_id: "user-01" } };
      groupService.listGroupsByUser.mockResolvedValue([{ id: "g1" }]);
 
      await controller.listGroupsByUser(req, res);
 
      expect(groupService.listGroupsByUser).toHaveBeenCalledWith("user-01");
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: "g1" }] });
    });
 
    it("chỉ trả về group PUBLIC khi viewer xem người khác", async () => {
      const req = { user: { id: "user-01" }, params: { user_id: "user-02" } };
      groupService.listGroupsByUser.mockResolvedValue([{ id: "g2", access: "PUBLIC" }]);
 
      await controller.listGroupsByUser(req, res);
 
      expect(groupService.listGroupsByUser).toHaveBeenCalledWith("user-02", { publicOnly: true });
    });
  });
 
  // ============================================================
  // findGroups - validate query params -> number parsing
  // ============================================================
  describe("findGroups()", () => {
    it("parse đúng limit/offset mặc định khi query thiếu", async () => {
      const req = { query: {}, user: { id: "user-01" } };
      groupService.findGroups.mockResolvedValue([]);
 
      await controller.findGroups(req, res);
 
      expect(groupService.findGroups).toHaveBeenCalledWith(
        { name: undefined, access: undefined, limit: 50, offset: 0 },
        "user-01"
      );
    });
 
    it("parse đúng limit/offset khi có query", async () => {
      const req = { query: { name: "SE", limit: "20", offset: "10" }, user: { id: "user-01" } };
      groupService.findGroups.mockResolvedValue([{ id: "g1" }]);
 
      await controller.findGroups(req, res);
 
      expect(groupService.findGroups).toHaveBeenCalledWith(
        { name: "SE", access: undefined, limit: 20, offset: 10 },
        "user-01"
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: "g1" }] });
    });
  });
 
  // ============================================================
  // joinGroup / inviteMember / isJoinPending
  // ============================================================
  describe("joinGroup()", () => {
    it("trả về 200 kèm data member khi join thành công", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "user-01" } };
      groupService.joinGroup.mockResolvedValue({ group_id: "g1", role: "MEMBER" });
 
      await controller.joinGroup(req, res);
 
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { group_id: "g1", role: "MEMBER" },
      });
    });
  });
 
  describe("inviteMember()", () => {
    it("trả về 403 khi actor không có quyền mời", async () => {
      const req = {
        params: { group_id: "g1" },
        body: { user_id: "user-02" },
        user: { id: "user-03" },
      };
      const err = new Error("No permission to invite");
      err.status = 403;
      groupService.inviteMember.mockRejectedValue(err);
 
      await controller.inviteMember(req, res);
 
      expect(groupService.inviteMember).toHaveBeenCalledWith("g1", "user-02", "user-03");
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "No permission to invite" });
    });
  });
 
  describe("isJoinPending()", () => {
    it("trả về is_pending true/false theo kết quả service", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "user-01" } };
      groupService.isJoinPending.mockResolvedValue(true);
 
      await controller.isJoinPending(req, res);
 
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { is_pending: true } });
    });
  });
 
  // ============================================================
  // getActivityLogs
  // ============================================================
  describe("getActivityLogs()", () => {
    it("truyền đúng filter action và phân trang cho service", async () => {
      const req = {
        params: { group_id: "g1" },
        query: { action: "CREATE_GROUP", limit: "10", offset: "0" },
      };
      groupService.getActivityLogs.mockResolvedValue([{ action: "CREATE_GROUP" }]);
 
      await controller.getActivityLogs(req, res);
 
      expect(groupService.getActivityLogs).toHaveBeenCalledWith("g1", "CREATE_GROUP", {
        limit: 10,
        offset: 0,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ action: "CREATE_GROUP" }],
      });
    });
  });
 
  // ============================================================
  // updateGroup - branch lỗi
  // ============================================================
  describe("updateGroup()", () => {
    it("trả về 500 khi groupService.updateGroup ném lỗi", async () => {
      const req = { params: { group_id: "g1" }, body: { name: "X" } };
      groupService.updateGroup.mockRejectedValue(new Error("DB error"));
 
      await controller.updateGroup(req, res);
 
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "DB error" });
    });
  });
 
  // ============================================================
  // listOwnedGroups / listGroupsNotJoined / listJoinRequests / listMyInvites
  // ============================================================
  describe("listOwnedGroups()", () => {
    it("trả về 200 kèm danh sách group sở hữu", async () => {
      const req = { user: { id: "user-01" } };
      groupService.listOwnedGroups.mockResolvedValue([{ id: "g1", role: "OWNER" }]);
 
      await controller.listOwnedGroups(req, res);
 
      expect(groupService.listOwnedGroups).toHaveBeenCalledWith("user-01");
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: "g1", role: "OWNER" }] });
    });
  });
 
  describe("listGroupsNotJoined()", () => {
    it("parse đúng limit/offset và trả về danh sách group chưa tham gia", async () => {
      const req = { user: { id: "user-01" }, query: { limit: "5", offset: "0" } };
      groupService.listGroupsNotJoined.mockResolvedValue([{ id: "g2" }]);
 
      await controller.listGroupsNotJoined(req, res);
 
      expect(groupService.listGroupsNotJoined).toHaveBeenCalledWith("user-01", { limit: 5, offset: 0 });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: "g2" }] });
    });
  });
 
  describe("listJoinRequests()", () => {
    it("trả về 200 kèm danh sách yêu cầu tham gia của group", async () => {
      const req = { params: { group_id: "g1" }, query: {} };
      groupService.listJoinRequests.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
 
      await controller.listJoinRequests(req, res);
 
      expect(groupService.listJoinRequests).toHaveBeenCalledWith("g1", { limit: 50, offset: 0 });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { items: [], total: 0, limit: 50, offset: 0 },
      });
    });
  });
 
  describe("listMyInvites()", () => {
    it("trả về 200 kèm danh sách lời mời của user hiện tại", async () => {
      const req = { user: { id: "user-01" }, query: {} };
      groupService.listMyInvites.mockResolvedValue({ items: [{ id: "inv1" }], total: 1, limit: 50, offset: 0 });
 
      await controller.listMyInvites(req, res);
 
      expect(groupService.listMyInvites).toHaveBeenCalledWith("user-01", { limit: 50, offset: 0 });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { items: [{ id: "inv1" }], total: 1, limit: 50, offset: 0 },
      });
    });
  });
 
  // ============================================================
  // cancelJoinRequest / approveJoin / rejectJoin
  // ============================================================
  describe("cancelJoinRequest()", () => {
    it("trả về 200 khi hủy yêu cầu thành công", async () => {
      const req = { params: { group_id: "g1" }, user: { id: "user-01" } };
      groupService.cancelJoinRequest.mockResolvedValue(true);
 
      await controller.cancelJoinRequest(req, res);
 
      expect(groupService.cancelJoinRequest).toHaveBeenCalledWith("g1", "user-01");
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
 
  describe("approveJoin()", () => {
    it("trả về 200 kèm data member khi duyệt thành công", async () => {
      const req = { params: { request_id: "req-01" }, user: { id: "owner-01" } };
      groupService.approveJoinRequest.mockResolvedValue({ user_id: "user-02", role: "MEMBER" });
 
      await controller.approveJoin(req, res);
 
      expect(groupService.approveJoinRequest).toHaveBeenCalledWith("req-01", "owner-01");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { user_id: "user-02", role: "MEMBER" },
      });
    });
  });
 
  describe("rejectJoin()", () => {
    it("trả về 200 khi từ chối yêu cầu thành công", async () => {
      const req = { params: { request_id: "req-01" }, user: { id: "owner-01" } };
      groupService.rejectJoinRequest.mockResolvedValue(true);
 
      await controller.rejectJoin(req, res);
 
      expect(groupService.rejectJoinRequest).toHaveBeenCalledWith("req-01", "owner-01");
      expect(res.json).toHaveBeenCalledWith({ success: true, data: true });
    });
  });
 
  // ============================================================
  // inviteMember - nhánh thành công
  // ============================================================
  describe("inviteMember() - thành công", () => {
    it("trả về 200 kèm data khi mời thành viên thành công", async () => {
      const req = {
        params: { group_id: "g1" },
        body: { user_id: "user-02" },
        user: { id: "owner-01" },
      };
      groupService.inviteMember.mockResolvedValue({ user_id: "user-02", role: "MEMBER" });
 
      await controller.inviteMember(req, res);
 
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { user_id: "user-02", role: "MEMBER" },
      });
    });
  });
 
  // ============================================================
  // getActivityLogs - branch lỗi
  // ============================================================
  describe("getActivityLogs() - lỗi", () => {
    it("trả về 500 khi service ném lỗi không rõ status", async () => {
      const req = { params: { group_id: "g1" }, query: {} };
      groupService.getActivityLogs.mockRejectedValue(new Error("Query failed"));
 
      await controller.getActivityLogs(req, res);
 
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "Query failed" });
    });
  });
 
  // ============================================================
  // countGroups / getAllGroups (admin)
  // ============================================================
  describe("countGroups() / getAllGroups()", () => {
    it("countGroups trả về 200 kèm tổng số lượng", async () => {
      const req = {};
      groupService.countGroups.mockResolvedValue(42);
 
      await controller.countGroups(req, res);
 
      expect(res.json).toHaveBeenCalledWith({ success: true, data: 42 });
    });
 
    it("getAllGroups trả về 500 khi service lỗi không rõ status", async () => {
      const req = { query: {} };
      groupService.getAllGroups.mockRejectedValue(new Error("Unexpected"));
 
      await controller.getAllGroups(req, res);
 
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "Unexpected" });
    });
  });
});
 