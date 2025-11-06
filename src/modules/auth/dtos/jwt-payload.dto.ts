import { Equals, IsIn, IsInt, IsString, Validate } from "class-validator";
import { UserRoleEnum } from "../entities/user.entity";

export const JwtPayloadTypes = {
  AUTH_USER: "auth:user",
} as const;

export class JwtPayloadDto {
  @IsString()
  sub: string;

  @IsInt()
  iat: number;

  @IsInt()
  @Validate((exp: number) => exp > Math.floor(Date.now() / 1000), {
    message: "Token has expired",
  })
  exp: number;
}

export class JwtPayloadUserDto extends JwtPayloadDto {
  @Equals(JwtPayloadTypes.AUTH_USER)
  service: typeof JwtPayloadTypes.AUTH_USER;

  @IsIn(Object.values(UserRoleEnum), { each: true })
  roles: UserRoleEnum[];
}
