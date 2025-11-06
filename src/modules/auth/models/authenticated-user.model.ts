import { UserRoleEnum } from "../entities/user.entity";

export class AuthenticatedUser {
  id: string;
  roles: UserRoleEnum[];

  constructor(data: AuthenticatedUser) {
    Object.assign(this, data);
  }
}
