import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { UserRole } from '../enums/user-role.enum';
import { GroupEntity } from '../../groups/entities/group.entity';
import { GroupParticipantEntity } from '../../groups/entities/group-participant.entity';
import { PredictionEntity } from '../../predictions/entities/prediction.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'username', type: 'varchar', length: 50, unique: true })
  @IsString()
  username: string;

  @Column({ name: 'email', type: 'varchar', length: 150, unique: true })
  @IsEmail()
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  @IsString()
  passwordHash: string;

  @Column({ name: 'name', type: 'varchar', length: 50 })
  @IsString()
  name: string;

  @Column({ name: 'middle_name', type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString()
  middleName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 50 })
  @IsString()
  lastName: string;

  @Column({
    name: 'mother_last_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  motherLastName: string | null;

  @Column({ name: 'role', type: 'enum', enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Grupos creados por este usuario (inverso de GroupEntity.creator).
  @OneToMany(() => GroupEntity, (group) => group.creator)
  groups: GroupEntity[];

  // Grupos en los que participa (inverso de GroupParticipantEntity.user).
  @OneToMany(
    () => GroupParticipantEntity,
    (participation) => participation.user,
  )
  groupParticipations: GroupParticipantEntity[];

  // Pronósticos emitidos por este usuario (inverso de PredictionEntity.user).
  @OneToMany(() => PredictionEntity, (prediction) => prediction.user)
  predictions: PredictionEntity[];
}
