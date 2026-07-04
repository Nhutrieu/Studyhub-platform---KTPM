/**
 * SH-266: Unit Test cho Middleware xác thực (verifyAccessToken)
 * Mocking: utils/jwt.js -> verifyAccessToken
 * Quy tắc ESM: mock module trước, sau đó import động (theo TESTING_GUIDE.md - mục C)
 */
import { jest } from "@jest/globals";

// 1. Mock module jwt trước khi import middleware
jest.unstable_mockModule("../src/utils/jwt.js", () => ({
  verifyAccessToken: jest.fn(),
}));

// 2. Load động module cần test
const jwtUtils = await import("../src/utils/jwt.js");
const { verifyAccessToken } = await import("../src/middlewares/auth.js");

describe("Middleware verifyAccessToken (SH-266)", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it("trả về 401 khi không có header Authorization", () => {
    req.headers = {};

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    expect(next).not.toHaveBeenCalled();
    expect(jwtUtils.verifyAccessToken).not.toHaveBeenCalled();
  });

  it("trả về 401 khi header không đúng định dạng Bearer", () => {
    req.headers = { authorization: "Basic abc123" };

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("trả về 401 khi tiền tố Bearer viết thường (case-sensitive)", () => {
    req.headers = { authorization: "bearer sometoken" };

    verifyAccessToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("trả về 401 khi token hết hạn hoặc sai chữ ký (verify ném lỗi)", () => {
    req.headers = { authorization: "Bearer expired.token.value" };
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw new Error("jwt expired");
    });

    verifyAccessToken(req, res, next);

    expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith("expired.token.value");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("gán req.user và gọi next() khi token hợp lệ", () => {
    req.headers = { authorization: "Bearer valid.token.value" };
    const payload = { id: "user-1", role: "user" };
    jwtUtils.verifyAccessToken.mockReturnValue(payload);

    verifyAccessToken(req, res, next);

    expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith("valid.token.value");
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("tách đúng token khi header có nhiều khoảng trắng dạng 'Bearer <token>'", () => {
    req.headers = { authorization: "Bearer token-with-dashes.123" };
    jwtUtils.verifyAccessToken.mockReturnValue({ id: "user-2" });

    verifyAccessToken(req, res, next);

    expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith("token-with-dashes.123");
    expect(next).toHaveBeenCalled();
  });

  it("trả về 401 khi header là 'Bearer ' nhưng token rỗng", () => {
    req.headers = { authorization: "Bearer " };
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw new Error("jwt malformed");
    });

    verifyAccessToken(req, res, next);

    expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith("");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("không rò rỉ chi tiết lỗi gốc của JWT ra ngoài response", () => {
    req.headers = { authorization: "Bearer bad.token" };
    jwtUtils.verifyAccessToken.mockImplementation(() => {
      throw new Error("secret internal jwt detail");
    });

    verifyAccessToken(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
    expect(res.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ error: "secret internal jwt detail" })
    );
  });
});
