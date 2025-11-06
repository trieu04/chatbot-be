import { ApiProperty } from "@nestjs/swagger";
import { BaseEntityDto } from "../../../common/dtos/base-entity.dto";
import { UserRoleEnum } from "../entities/user.entity";

export class UserDto extends BaseEntityDto {
  @ApiProperty({ nullable: true })
  name: string;

  @ApiProperty({ nullable: true })
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  image: string;

  @ApiProperty({ enum: UserRoleEnum, isArray: true })
  roles: UserRoleEnum[];
}
