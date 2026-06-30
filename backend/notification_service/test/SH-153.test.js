import { jest } from "@jest/globals";

// Mock jsonwebtoken
jest.unstable_mockModule("jsonwebtoken", () => ({
    default: {
        verify: jest.fn(),
    },
}));

const jwt = (await import("jsonwebtoken")).default;
const { verifyAccessToken } = await import("../src/middlewares/auth.js");

describe("StudyHub - SH-153 - Kiểm thử đơn vị Middleware xác thực (White Box)", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = {
            headers: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it("should return 401 if no Authorization header is provided", () => {
        verifyAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if Authorization header does not start with Bearer", () => {
        req.headers.authorization = "Basic credentials";

        verifyAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is empty after Bearer", () => {
        req.headers.authorization = "Bearer ";

        verifyAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token validation fails", () => {
        req.headers.authorization = "Bearer invalid-token";
        jwt.verify.mockImplementation(() => {
            throw new Error("Invalid signature");
        });

        verifyAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
        expect(next).not.toHaveBeenCalled();
    });

    it("should call next and set req.user if token is valid", () => {
        req.headers.authorization = "Bearer valid-token";
        const mockPayload = { id: "user123", role: "admin" };
        jwt.verify.mockReturnValue(mockPayload);

        verifyAccessToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalled();
        expect(req.user).toEqual(mockPayload);
        expect(next).toHaveBeenCalled();
    });
});
