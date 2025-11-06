import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Roles } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../models/authenticated-user.model";

declare module "express" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get(Roles, context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { user } = request;
    if (!user) {
      return false;
    }

    return this.matchRoles(roles, user.roles);
  }

  private matchRoles(allowedRoles: string[], userRoles: string[]): boolean {
    return allowedRoles.every(role => userRoles.includes(role));
  }
}
