import { jest } from "@jest/globals";

jest.unstable_mockModule("jsonwebtoken", () => ({
    default: {
        verify: jest.fn(),
    },
}));

jest.unstable_mockModule("../src/config/env.js", () => ({
    env: {
        JWT_ACCESS_SECRET: "test-secret",
    },
}));

const jwt = (await import("jsonwebtoken")).default;
const { verifyAccessToken } = await import("../src/middlewares/auth.js");

describe("SH-189 - Chat auth middleware unit tests", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it("returns 401 when Authorization header is missing", () => {
        verifyAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when Authorization header is not Bearer", () => {
        req.headers.authorization = "Basic credentials";

        verifyAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when Bearer token is empty", () => {
        req.headers.authorization = "Bearer ";

        verifyAccessToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when token verification fails", () => {
        req.headers.authorization = "Bearer invalid-token";
        jwt.verify.mockImplementation(() => {
            throw new Error("invalid token");
        });

        verifyAccessToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith("invalid-token", "test-secret");
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
        expect(next).not.toHaveBeenCalled();
    });

    it("attaches the decoded payload and calls next for a valid token", () => {
        req.headers.authorization = "Bearer valid-token";
        const payload = { id: "user-1", role: "user" };
        jwt.verify.mockReturnValue(payload);

        verifyAccessToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test-secret");
        expect(req.user).toEqual(payload);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});
