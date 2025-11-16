import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base-entity";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

@Entity()
@Index(["email"], { unique: true })
@Index(["username"], { unique: true, where: "username IS NOT NULL" })
export class UserEntity extends BaseEntity {
  @Column({ nullable: true })
  name: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  emailVerifiedAt: Date;

  @Column({ nullable: true })
  image: string;

  @Column({
    type: "enum",
    enum: UserRole,
    nullable: true,
  })
  role?: UserRole;

  @Column({
    type: "enum",
    array: true,
    enum: UserRole,
    nullable: true,
  })
  roles?: UserRole[];

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>; // Additional user data
}
