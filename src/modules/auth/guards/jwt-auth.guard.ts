import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthService } from "../services/jwt-auth.service";
import { AccountService } from "../services/account.service";

/**
 * JWT Authentication Guard (without Passport)
 * Validates JWT token from Bearer header or Cookie
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtAuthService: JwtAuthService,
    private accountService: AccountService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract token from request
    const token = this.jwtAuthService.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException("No authentication token provided");
    }

    try {
      // Verify token
      const payload = await this.jwtAuthService.verifyToken(token);

      // Optionally fetch user to ensure they still exist
      const user = await this.accountService.getUser(payload.sub);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Attach user info to request
      (request as any).user = {
        id: payload.sub,
        roles: payload.roles,
      };

      return true;
    }
    catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid authentication token");
    }
  }
}
