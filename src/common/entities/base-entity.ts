import { CreateDateColumn, PrimaryGeneratedColumn, BaseEntity as TypeOrmBaseEntity, UpdateDateColumn } from "typeorm";

export class BaseEntity extends TypeOrmBaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
