import { Reflector } from "@nestjs/core";
import { UserRoleEnum } from "../entities/user.entity";

export const Roles = Reflector.createDecorator<UserRoleEnum[]>();
