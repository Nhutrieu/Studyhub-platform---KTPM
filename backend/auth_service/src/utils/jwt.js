import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";

export function signAccessToken(payload, expiresIn = "15m") {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn });
}

export function signRefreshToken(payload, expiresIn = "7d") {
  const tokenPayload = payload?.jti ? payload : { ...payload, jti: randomUUID() };
  return jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, { expiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
