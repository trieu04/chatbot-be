import { Exclude } from "class-transformer";
import { DeleteDateColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

export class SoftDeleteEntity extends BaseEntity {
  @Exclude()
  @DeleteDateColumn({ type: "timestamp", default: null, nullable: true })
  deletedAt: Date;
}
