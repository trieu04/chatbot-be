import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedUser } from "../models/authenticated-user.model";

declare module "express" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export const GetUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const { user } = request;
    return user?.id;
  },
);
