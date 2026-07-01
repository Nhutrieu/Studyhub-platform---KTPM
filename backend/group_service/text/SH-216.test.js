import { jest } from "@jest/globals";

// ============================================================
// 1. Mock module jwt.js TRƯỚC khi import middleware auth.js
//    (tuân thủ quy tắc mocking ES Modules của dự án)
// ============================================================
jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyAccessToken: jest.fn(),
}));

// 2. Load động module đã mock + middleware cần test
const jwtUtils = await import("../src/utils/jwt.js");
const { verifyAccessToken } = await import("../src/middlewares/auth.js");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("SH-216: Unit Test - Middleware xác thực (verifyAccessToken)", () => {
  let res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    next = jest.fn();
  });

  it("chặn request khi không có header Authorization", () => {
    const req = { headers: {} };

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    expect(next).not.toHaveBeenCalled();
    expect(jwtUtils.verifyAccessToken).not.toHaveBeenCalled();
  });

  it("chặn request khi header Authorization sai định dạng (không phải Bearer)", () => {
    const req = { headers: { authorization: "Basic abc123" } };

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("chặn request khi token rỗng sau chuỗi 'Bearer '", () => {
    // authorization = "Bearer " -> vẫn thỏa startsWith, nhưng verify sẽ ném lỗi vì token rỗng/không hợp lệ
    const req = { headers: { authorization: "Bearer " } };
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw new Error("jwt must be provided");
    });

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("chặn request khi token hết hạn (verify ném lỗi TokenExpiredError)", () => {
    const req = { headers: { authorization: "Bearer expired.token.value" } };
    const expiredErr = new Error("jwt expired");
    expiredErr.name = "TokenExpiredError";
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw expiredErr;
    });

    verifyAccessToken(req, res, next);

    expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith("expired.token.value");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("chặn request khi token sai chữ ký (verify ném lỗi JsonWebTokenError)", () => {
    const req = { headers: { authorization: "Bearer tampered.token.value" } };
    const invalidSignatureErr = new Error("invalid signature");
    invalidSignatureErr.name = "JsonWebTokenError";
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw invalidSignatureErr;
    });

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("cho phép đi tiếp (next) và gán req.user khi token hợp lệ", () => {
    const req = { headers: { authorization: "Bearer valid.token.value" } };
    const payload = { id: "user-01", role: "member" };
    jwtUtils.verifyAccessToken.mockReturnValue(payload);

    verifyAccessToken(req, res, next);

    expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith("valid.token.value");
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("chỉ lấy đúng phần token, bỏ qua phần thừa nếu header có nhiều khoảng trắng", () => {
    // authHeader.split(" ")[1] chỉ lấy token, bỏ mọi ký tự phía sau
    const req = { headers: { authorization: "Bearer token123 extra-garbage" } };
    jwtUtils.verifyAccessToken.mockReturnValue({ id: "user-02" });

    verifyAccessToken(req, res, next);

    expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith("token123");
    expect(next).toHaveBeenCalledTimes(1);
  });
});