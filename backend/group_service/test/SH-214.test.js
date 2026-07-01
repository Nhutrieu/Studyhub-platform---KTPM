import { jest } from "@jest/globals";
 
// ============================================================
// 1. Mock các module/dependency bên ngoài TRƯỚC khi import module cần test
//    (ESM read-only bindings -> phải mock trước, load động bằng await import)
// ============================================================
jest.unstable_mockModule("uuid", () => ({
  v4: jest.fn(),
}));
 
jest.unstable_mockModule("../src/utils/cloudinary.js", () => ({
  uploadToCloudinary: jest.fn(),
}));
 
jest.unstable_mockModule("../src/core/events/publish.js", () => ({
  publishEvent: jest.fn(),
}));
 
jest.unstable_mockModule("file-type", () => ({
  fileTypeFromBuffer: jest.fn(),
}));
 
// 2. Load động các module đã mock + module cần test
const { v4: uuidv4 } = await import("uuid");
const { uploadToCloudinary } = await import("../src/utils/cloudinary.js");
const { publishEvent } = await import("../src/core/events/publish.js");
const { fileTypeFromBuffer } = await import("file-type");
const { GroupService } = await import("../src/services/GroupService.js");
 
describe("SH-214: Unit Test - GroupService", () => {
  let groupRepo, memberRepo, joinRepo, activityRepo, groupService;
 
  const FAKE_GROUP_ID = "group-uuid-0001";
  const FAKE_ACTIVITY_ID = "activity-uuid-0001";
 
  beforeEach(() => {
    jest.clearAllMocks();
 
    groupRepo = {
      createGroup: jest.fn(),
      getGroupById: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      findByNameLike: jest.fn(),
      findAllGroups: jest.fn(),
      findGroupsNotJoined: jest.fn(),
      countGroups: jest.fn(),
      getAllGroups: jest.fn(),
    };
 
    memberRepo = {
      addMember: jest.fn(),
      getMember: jest.fn(),
      listGroupsByUser: jest.fn(),
      listOwnedGroups: jest.fn(),
    };
 
    joinRepo = {
      listPending: jest.fn(),
      countPending: jest.fn(),
      listInvitesByUser: jest.fn(),
      countInvitesByUser: jest.fn(),
      createRequest: jest.fn(),
      getById: jest.fn(),
      updateStatus: jest.fn(),
      get: jest.fn(),
      deleteRequest: jest.fn(),
    };
 
    activityRepo = {
      logActivity: jest.fn(),
      list: jest.fn(),
    };
 
    groupService = new GroupService({ groupRepo, memberRepo, joinRepo, activityRepo });
 
    // uuid luôn trả về id giả lập theo thứ tự gọi
    uuidv4.mockReturnValueOnce(FAKE_GROUP_ID).mockReturnValue(FAKE_ACTIVITY_ID);
  });
 
  // ============================================================
  // createGroup()
  // ============================================================
  describe("createGroup()", () => {
    it("tạo group thành công khi không có avatar upload", async () => {
      groupRepo.createGroup.mockResolvedValue({ id: FAKE_GROUP_ID, name: "SE Study Group" });
      memberRepo.addMember.mockResolvedValue({ group_id: FAKE_GROUP_ID, role: "OWNER" });
      activityRepo.logActivity.mockResolvedValue(true);
      publishEvent.mockResolvedValue(true);
 
      const result = await groupService.createGroup({
        name: "SE Study Group",
        user_id: "user-01",
      });
 
      expect(groupRepo.createGroup).toHaveBeenCalledWith(
        expect.objectContaining({ id: FAKE_GROUP_ID, name: "SE Study Group", avatar_url: null })
      );
      expect(memberRepo.addMember).toHaveBeenCalledWith({
        group_id: FAKE_GROUP_ID,
        user_id: "user-01",
        role: "OWNER",
      });
      expect(activityRepo.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ group_id: FAKE_GROUP_ID, actor_id: "user-01", action: "CREATE_GROUP" })
      );
      expect(publishEvent).toHaveBeenCalledWith("group.created", {
        group_id: FAKE_GROUP_ID,
        user_id: "user-01",
      });
      expect(result).toEqual({ id: FAKE_GROUP_ID, name: "SE Study Group" });
    });
 
    it("upload avatar hợp lệ và gán avatar_url cho group khi tạo", async () => {
      fileTypeFromBuffer.mockResolvedValue({ ext: "png" });
      uploadToCloudinary.mockResolvedValue({ secure_url: "https://cdn/avatar.png" });
      groupRepo.createGroup.mockResolvedValue({ id: FAKE_GROUP_ID });
      memberRepo.addMember.mockResolvedValue({});
      activityRepo.logActivity.mockResolvedValue(true);
      publishEvent.mockResolvedValue(true);
 
      await groupService.createGroup({
        name: "Group Avatar",
        user_id: "user-01",
        file: { buffer: Buffer.from("fake-image") },
      });
 
      expect(fileTypeFromBuffer).toHaveBeenCalled();
      expect(uploadToCloudinary).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({ folder: "avatars", public_id: `group_${FAKE_GROUP_ID}` })
      );
      expect(groupRepo.createGroup).toHaveBeenCalledWith(
        expect.objectContaining({ avatar_url: "https://cdn/avatar.png" })
      );
    });
 
    it("ném lỗi khi định dạng file avatar không hợp lệ", async () => {
      fileTypeFromBuffer.mockResolvedValue({ ext: "exe" });
 
      await expect(
        groupService.createGroup({
          name: "Group X",
          user_id: "user-01",
          file: { buffer: Buffer.from("fake") },
        })
      ).rejects.toThrow("Invalid image type");
 
      expect(groupRepo.createGroup).not.toHaveBeenCalled();
    });
  });
 
  // ============================================================
  // checkMembership() / checkAccess()
  // ============================================================
  describe("checkMembership()", () => {
    it("trả về group khi tìm thấy", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, role: "MEMBER" });
 
      const result = await groupService.checkMembership(FAKE_GROUP_ID, "user-01");
 
      expect(groupRepo.getGroupById).toHaveBeenCalledWith(FAKE_GROUP_ID, "user-01");
      expect(result).toEqual({ group: { id: FAKE_GROUP_ID, role: "MEMBER" } });
    });
 
    it("ném lỗi 404 khi không tìm thấy group", async () => {
      groupRepo.getGroupById.mockResolvedValue(null);
 
      await expect(groupService.checkMembership(FAKE_GROUP_ID, "user-01")).rejects.toMatchObject({
        message: "Group not found",
        status: 404,
      });
    });
  });
 
  describe("checkAccess()", () => {
    it("trả về role khi user là thành viên", async () => {
      memberRepo.getMember.mockResolvedValue({ role: "MODERATOR" });
 
      const role = await groupService.checkAccess(FAKE_GROUP_ID, "user-01");
 
      expect(role).toBe("MODERATOR");
    });
 
    it("ném lỗi 403 khi user không phải thành viên", async () => {
      memberRepo.getMember.mockResolvedValue(null);
 
      await expect(groupService.checkAccess(FAKE_GROUP_ID, "user-01")).rejects.toMatchObject({
        message: "Not a member",
        status: 403,
      });
    });
  });
 
  // ============================================================
  // updateGroup() / updateAvatar()
  // ============================================================
  describe("updateGroup()", () => {
    it("gọi groupRepo.updateGroup với đúng tham số", async () => {
      groupRepo.updateGroup.mockResolvedValue({ id: FAKE_GROUP_ID, name: "New Name" });
 
      const result = await groupService.updateGroup(FAKE_GROUP_ID, { name: "New Name" });
 
      expect(groupRepo.updateGroup).toHaveBeenCalledWith(FAKE_GROUP_ID, { name: "New Name" });
      expect(result).toEqual({ id: FAKE_GROUP_ID, name: "New Name" });
    });
  });
 
  describe("updateAvatar()", () => {
    it("ném lỗi khi không có file upload", async () => {
      await expect(groupService.updateAvatar(FAKE_GROUP_ID, null)).rejects.toThrow("No avatar uploaded");
    });
 
    it("ném lỗi khi định dạng file không hợp lệ", async () => {
      fileTypeFromBuffer.mockResolvedValue({ ext: "gif" });
 
      await expect(
        groupService.updateAvatar(FAKE_GROUP_ID, { buffer: Buffer.from("x") })
      ).rejects.toThrow("Invalid image type");
    });
 
    it("cập nhật avatar thành công khi file hợp lệ", async () => {
      fileTypeFromBuffer.mockResolvedValue({ ext: "jpeg" });
      uploadToCloudinary.mockResolvedValue({ secure_url: "https://cdn/new-avatar.jpg" });
      groupRepo.updateGroup.mockResolvedValue({ id: FAKE_GROUP_ID, avatar_url: "https://cdn/new-avatar.jpg" });
 
      const result = await groupService.updateAvatar(FAKE_GROUP_ID, { buffer: Buffer.from("img") });
 
      expect(groupRepo.updateGroup).toHaveBeenCalledWith(FAKE_GROUP_ID, {
        avatar_url: "https://cdn/new-avatar.jpg",
      });
      expect(result.avatar_url).toBe("https://cdn/new-avatar.jpg");
    });
  });
 
  // ============================================================
  // deleteGroup()
  // ============================================================
  describe("deleteGroup()", () => {
    it("ném lỗi 403 khi actor không phải OWNER", async () => {
      memberRepo.getMember.mockResolvedValue({ role: "MEMBER" });
 
      await expect(groupService.deleteGroup(FAKE_GROUP_ID, "user-01")).rejects.toMatchObject({
        message: "Only owner can delete group",
        status: 403,
      });
      expect(groupRepo.deleteGroup).not.toHaveBeenCalled();
    });
 
    it("xóa group thành công và publish event khi actor là OWNER", async () => {
      memberRepo.getMember.mockResolvedValue({ role: "OWNER" });
      groupRepo.deleteGroup.mockResolvedValue(true);
      publishEvent.mockResolvedValue(true);
 
      const result = await groupService.deleteGroup(FAKE_GROUP_ID, "user-01");
 
      expect(groupRepo.deleteGroup).toHaveBeenCalledWith(FAKE_GROUP_ID);
      expect(publishEvent).toHaveBeenCalledWith("group.deleted", { group_id: FAKE_GROUP_ID });
      expect(result).toBe(true);
    });
  });
 
  // ============================================================
  // getGroupDetail() / listGroupsByUser() / listOwnedGroups()
  // ============================================================
  describe("getGroupDetail()", () => {
    it("ủy quyền đúng tham số cho groupRepo.getGroupById", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, name: "SE Group" });
 
      const result = await groupService.getGroupDetail(FAKE_GROUP_ID, "user-01");
 
      expect(groupRepo.getGroupById).toHaveBeenCalledWith(FAKE_GROUP_ID, "user-01");
      expect(result).toEqual({ id: FAKE_GROUP_ID, name: "SE Group" });
    });
  });
 
  describe("listGroupsByUser()", () => {
    it("ủy quyền đúng tham số (kể cả options mặc định) cho memberRepo.listGroupsByUser", async () => {
      memberRepo.listGroupsByUser.mockResolvedValue([{ id: "g1" }]);
 
      const result = await groupService.listGroupsByUser("user-01");
 
      expect(memberRepo.listGroupsByUser).toHaveBeenCalledWith("user-01", {});
      expect(result).toEqual([{ id: "g1" }]);
    });
 
    it("truyền đúng option publicOnly khi được chỉ định", async () => {
      memberRepo.listGroupsByUser.mockResolvedValue([]);
 
      await groupService.listGroupsByUser("user-02", { publicOnly: true });
 
      expect(memberRepo.listGroupsByUser).toHaveBeenCalledWith("user-02", { publicOnly: true });
    });
  });
 
  describe("listOwnedGroups()", () => {
    it("ủy quyền đúng tham số cho memberRepo.listOwnedGroups", async () => {
      memberRepo.listOwnedGroups.mockResolvedValue([{ id: "g1", role: "OWNER" }]);
 
      const result = await groupService.listOwnedGroups("user-01");
 
      expect(memberRepo.listOwnedGroups).toHaveBeenCalledWith("user-01");
      expect(result).toEqual([{ id: "g1", role: "OWNER" }]);
    });
  });
 
  // ============================================================
  // Truy vấn danh sách nhóm (findGroups, listGroupsNotJoined, ...)
  // ============================================================
  describe("findGroups()", () => {
    it("gọi findByNameLike khi có tham số name", async () => {
      groupRepo.findByNameLike.mockResolvedValue([{ id: "g1" }]);
 
      const result = await groupService.findGroups(
        { name: "SE", limit: 10, offset: 0 },
        "user-01"
      );
 
      expect(groupRepo.findByNameLike).toHaveBeenCalledWith(
        "SE",
        { limit: 10, offset: 0 },
        "user-01"
      );
      expect(groupRepo.findAllGroups).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: "g1" }]);
    });
 
    it("gọi findAllGroups khi không có tham số name", async () => {
      groupRepo.findAllGroups.mockResolvedValue([{ id: "g2" }]);
 
      await groupService.findGroups({ access: "PUBLIC", limit: 10, offset: 0 }, "user-01");
 
      expect(groupRepo.findAllGroups).toHaveBeenCalledWith(
        { access: "PUBLIC", limit: 10, offset: 0 },
        "user-01"
      );
    });
  });
 
  describe("listGroupsNotJoined() / countGroups() / getAllGroups()", () => {
    it("listGroupsNotJoined ủy quyền đúng tham số cho groupRepo.findGroupsNotJoined", async () => {
      groupRepo.findGroupsNotJoined.mockResolvedValue([{ id: "g3" }]);
 
      const result = await groupService.listGroupsNotJoined("user-01", { limit: 10, offset: 0 });
 
      expect(groupRepo.findGroupsNotJoined).toHaveBeenCalledWith("user-01", { limit: 10, offset: 0 });
      expect(result).toEqual([{ id: "g3" }]);
    });
 
    it("countGroups trả về tổng số group từ groupRepo.countGroups", async () => {
      groupRepo.countGroups.mockResolvedValue(15);
 
      const result = await groupService.countGroups();
 
      expect(groupRepo.countGroups).toHaveBeenCalled();
      expect(result).toBe(15);
    });
 
    it("getAllGroups ủy quyền đúng tham số phân trang cho groupRepo.getAllGroups", async () => {
      groupRepo.getAllGroups.mockResolvedValue([{ id: "g1" }, { id: "g2" }]);
 
      const result = await groupService.getAllGroups({ limit: 50, offset: 0 });
 
      expect(groupRepo.getAllGroups).toHaveBeenCalledWith({ limit: 50, offset: 0 });
      expect(result).toEqual([{ id: "g1" }, { id: "g2" }]);
    });
  });
 
  describe("listJoinRequests() / listMyInvites()", () => {
    it("phân trang mặc định (limit=50, offset=0) và trả về total đúng", async () => {
      joinRepo.listPending.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
      joinRepo.countPending.mockResolvedValue(2);
 
      const result = await groupService.listJoinRequests(FAKE_GROUP_ID);
 
      expect(joinRepo.listPending).toHaveBeenCalledWith(FAKE_GROUP_ID, { limit: 50, offset: 0 });
      expect(result).toEqual({ items: [{ id: "r1" }, { id: "r2" }], total: 2, limit: 50, offset: 0 });
    });
 
    it("listMyInvites phân trang và trả về đúng cấu trúc", async () => {
      joinRepo.listInvitesByUser.mockResolvedValue([{ id: "inv1" }]);
      joinRepo.countInvitesByUser.mockResolvedValue(1);
 
      const result = await groupService.listMyInvites("user-01", { limit: 5, offset: 5 });
 
      expect(joinRepo.listInvitesByUser).toHaveBeenCalledWith("user-01", { limit: 5, offset: 5 });
      expect(result).toEqual({ items: [{ id: "inv1" }], total: 1, limit: 5, offset: 5 });
    });
  });
 
  // ============================================================
  // joinGroup()
  // ============================================================
  describe("joinGroup()", () => {
    it("ném lỗi khi group không tồn tại", async () => {
      groupRepo.getGroupById.mockResolvedValue(null);
 
      await expect(groupService.joinGroup(FAKE_GROUP_ID, "user-01")).rejects.toThrow("Group not found");
    });
 
    it("trả về member hiện có nếu user đã là thành viên (không tạo duplicate)", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, access: "PUBLIC" });
      memberRepo.getMember.mockResolvedValue({ group_id: FAKE_GROUP_ID, role: "MEMBER" });
 
      const result = await groupService.joinGroup(FAKE_GROUP_ID, "user-01");
 
      expect(memberRepo.addMember).not.toHaveBeenCalled();
      expect(joinRepo.createRequest).not.toHaveBeenCalled();
      expect(result).toEqual({ group_id: FAKE_GROUP_ID, role: "MEMBER" });
    });
 
    it("tự động thêm thành viên khi group PUBLIC", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, access: "PUBLIC" });
      memberRepo.getMember.mockResolvedValue(null);
      memberRepo.addMember.mockResolvedValue({ group_id: FAKE_GROUP_ID, role: "MEMBER" });
      activityRepo.logActivity.mockResolvedValue(true);
 
      const result = await groupService.joinGroup(FAKE_GROUP_ID, "user-01");
 
      expect(memberRepo.addMember).toHaveBeenCalledWith({
        group_id: FAKE_GROUP_ID,
        user_id: "user-01",
        role: "MEMBER",
      });
      expect(activityRepo.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: "JOIN_GROUP" })
      );
      expect(result.role).toBe("MEMBER");
    });
 
    it("tạo join request khi group PRIVATE", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, access: "PRIVATE" });
      memberRepo.getMember.mockResolvedValue(null);
      joinRepo.createRequest.mockResolvedValue({ id: "req-01", status: "PENDING" });
 
      const result = await groupService.joinGroup(FAKE_GROUP_ID, "user-01");
 
      expect(memberRepo.addMember).not.toHaveBeenCalled();
      expect(joinRepo.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({ group_id: FAKE_GROUP_ID, user_id: "user-01" })
      );
      expect(result).toEqual({ id: "req-01", status: "PENDING" });
    });
  });
 
  // ============================================================
  // approveJoinRequest() / rejectJoinRequest()
  // ============================================================
  describe("approveJoinRequest()", () => {
    it("ném lỗi khi request không tồn tại", async () => {
      joinRepo.getById.mockResolvedValue(null);
 
      await expect(groupService.approveJoinRequest("req-01", "owner-01")).rejects.toThrow(
        "Request not found"
      );
    });
 
    it("duyệt yêu cầu thành công: cập nhật status, thêm member, ghi log", async () => {
      joinRepo.getById.mockResolvedValue({ id: "req-01", group_id: FAKE_GROUP_ID, user_id: "user-02" });
      joinRepo.updateStatus.mockResolvedValue(true);
      memberRepo.addMember.mockResolvedValue({ group_id: FAKE_GROUP_ID, user_id: "user-02", role: "MEMBER" });
      activityRepo.logActivity.mockResolvedValue(true);
 
      const result = await groupService.approveJoinRequest("req-01", "owner-01");
 
      expect(joinRepo.updateStatus).toHaveBeenCalledWith("req-01", "APPROVED");
      expect(memberRepo.addMember).toHaveBeenCalledWith({
        group_id: FAKE_GROUP_ID,
        user_id: "user-02",
        role: "MEMBER",
      });
      expect(activityRepo.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: "APPROVE_JOIN", target_id: "user-02" })
      );
      expect(result.role).toBe("MEMBER");
    });
  });
 
  describe("rejectJoinRequest()", () => {
    it("ném lỗi khi request không tồn tại", async () => {
      joinRepo.getById.mockResolvedValue(null);
 
      await expect(groupService.rejectJoinRequest("req-01", "owner-01")).rejects.toThrow(
        "Request not found"
      );
    });
 
    it("từ chối yêu cầu thành công", async () => {
      joinRepo.getById.mockResolvedValue({ id: "req-01", group_id: FAKE_GROUP_ID, user_id: "user-02" });
      joinRepo.updateStatus.mockResolvedValue(true);
      activityRepo.logActivity.mockResolvedValue(true);
 
      const result = await groupService.rejectJoinRequest("req-01", "owner-01");
 
      expect(joinRepo.updateStatus).toHaveBeenCalledWith("req-01", "REJECTED");
      expect(result).toBe(true);
    });
  });
 
  // ============================================================
  // cancelJoinRequest()
  // ============================================================
  describe("cancelJoinRequest()", () => {
    it("ném lỗi khi không tìm thấy request", async () => {
      joinRepo.get.mockResolvedValue(null);
 
      await expect(groupService.cancelJoinRequest(FAKE_GROUP_ID, "user-01")).rejects.toThrow(
        "Request not found"
      );
    });
 
    it("ném lỗi khi request đã được xử lý (không còn PENDING)", async () => {
      joinRepo.get.mockResolvedValue({ id: "req-01", status: "APPROVED" });
 
      await expect(groupService.cancelJoinRequest(FAKE_GROUP_ID, "user-01")).rejects.toThrow(
        "Cannot cancel processed request"
      );
      expect(joinRepo.deleteRequest).not.toHaveBeenCalled();
    });
 
    it("hủy request thành công khi đang PENDING", async () => {
      joinRepo.get.mockResolvedValue({ id: "req-01", status: "PENDING" });
      joinRepo.deleteRequest.mockResolvedValue(true);
      activityRepo.logActivity.mockResolvedValue(true);
 
      const result = await groupService.cancelJoinRequest(FAKE_GROUP_ID, "user-01");
 
      expect(joinRepo.deleteRequest).toHaveBeenCalledWith("req-01");
      expect(result).toBe(true);
    });
  });
 
  // ============================================================
  // inviteMember()
  // ============================================================
  describe("inviteMember()", () => {
    it("ném lỗi khi group không tồn tại", async () => {
      groupRepo.getGroupById.mockResolvedValue(null);
 
      await expect(groupService.inviteMember(FAKE_GROUP_ID, "user-02", "user-01")).rejects.toThrow(
        "Group not found"
      );
    });
 
    it("ném lỗi 403 khi actor không có quyền mời (không phải OWNER/MODERATOR)", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, access: "PUBLIC" });
      memberRepo.getMember.mockResolvedValue({ role: "MEMBER" });
 
      await expect(groupService.inviteMember(FAKE_GROUP_ID, "user-02", "user-01")).rejects.toMatchObject({
        message: "No permission to invite",
        status: 403,
      });
    });
 
    it("trả về member hiện có nếu target đã là thành viên", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, access: "PUBLIC" });
      memberRepo.getMember
        .mockResolvedValueOnce({ role: "OWNER" }) // actor
        .mockResolvedValueOnce({ role: "MEMBER", user_id: "user-02" }); // target đã tồn tại
 
      const result = await groupService.inviteMember(FAKE_GROUP_ID, "user-02", "user-01");
 
      expect(memberRepo.addMember).not.toHaveBeenCalled();
      expect(result).toEqual({ role: "MEMBER", user_id: "user-02" });
    });
 
    it("thêm thành viên trực tiếp khi group PUBLIC", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, access: "PUBLIC" });
      memberRepo.getMember
        .mockResolvedValueOnce({ role: "MODERATOR" }) // actor
        .mockResolvedValueOnce(null); // target chưa là thành viên
      memberRepo.addMember.mockResolvedValue({ group_id: FAKE_GROUP_ID, user_id: "user-02", role: "MEMBER" });
      activityRepo.logActivity.mockResolvedValue(true);
 
      const result = await groupService.inviteMember(FAKE_GROUP_ID, "user-02", "user-01");
 
      expect(memberRepo.addMember).toHaveBeenCalledWith({
        group_id: FAKE_GROUP_ID,
        user_id: "user-02",
        role: "MEMBER",
      });
      expect(result.user_id).toBe("user-02");
    });
 
    it("tạo join request khi group PRIVATE", async () => {
      groupRepo.getGroupById.mockResolvedValue({ id: FAKE_GROUP_ID, access: "PRIVATE" });
      memberRepo.getMember.mockResolvedValueOnce({ role: "OWNER" }).mockResolvedValueOnce(null);
      joinRepo.createRequest.mockResolvedValue({ id: "req-02", status: "PENDING" });
      activityRepo.logActivity.mockResolvedValue(true);
 
      const result = await groupService.inviteMember(FAKE_GROUP_ID, "user-02", "user-01");
 
      expect(memberRepo.addMember).not.toHaveBeenCalled();
      expect(joinRepo.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({ group_id: FAKE_GROUP_ID, user_id: "user-02" })
      );
      expect(result).toEqual({ id: "req-02", status: "PENDING" });
    });
  });
 
  // ============================================================
  // isJoinPending() / getActivityLogs() / emitEvent()
  // ============================================================
  describe("isJoinPending()", () => {
    it("trả về true khi có request đang PENDING", async () => {
      joinRepo.get.mockResolvedValue({ status: "PENDING" });
 
      const result = await groupService.isJoinPending(FAKE_GROUP_ID, "user-01");
 
      expect(result).toBe(true);
    });
 
    it("trả về false khi không có request hoặc không PENDING", async () => {
      joinRepo.get.mockResolvedValue(null);
 
      const result = await groupService.isJoinPending(FAKE_GROUP_ID, "user-01");
 
      expect(result).toBe(false);
    });
  });
 
  describe("getActivityLogs()", () => {
    it("ủy quyền đúng tham số cho activityRepo.list", async () => {
      activityRepo.list.mockResolvedValue([{ action: "CREATE_GROUP" }]);
 
      const result = await groupService.getActivityLogs(FAKE_GROUP_ID, "CREATE_GROUP", {
        limit: 20,
        offset: 0,
      });
 
      expect(activityRepo.list).toHaveBeenCalledWith(FAKE_GROUP_ID, "CREATE_GROUP", {
        limit: 20,
        offset: 0,
      });
      expect(result).toEqual([{ action: "CREATE_GROUP" }]);
    });
  });
 
  describe("emitEvent()", () => {
    it("gọi publishEvent với đúng routing key và payload", async () => {
      publishEvent.mockResolvedValue(true);
 
      await groupService.emitEvent("group.created", { group_id: FAKE_GROUP_ID });
 
      expect(publishEvent).toHaveBeenCalledWith("group.created", { group_id: FAKE_GROUP_ID });
    });
  });
});
 