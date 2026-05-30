import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "furnimart-secret-key-2024",
    });
  }

  validate(payload: any) {
    return {
      userId: payload.sub || payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      branchId: payload.branchId,
    };
  }
}
