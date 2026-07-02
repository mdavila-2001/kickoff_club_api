import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IsString, IsUUID } from 'class-validator';

import { UserEntity } from '../../users/entities/user.entity';
import { GroupParticipantEntity } from './group-participant.entity';

@Entity({ name: 'groups' })
export class GroupEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  @IsString()
  name: string;

  @Column({ name: 'invite_code', type: 'varchar', length: 10, unique: true })
  @IsString()
  inviteCode: string;

  // Columna cruda de la llave foránea (espejo de la relación `creator`).
  @Column({ name: 'creator_id', type: 'uuid' })
  @IsUUID()
  creatorId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  // Creador del grupo (fk_groups_creator ... ON DELETE RESTRICT).
  @ManyToOne(() => UserEntity, (user) => user.groups, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creator_id' })
  creator: UserEntity;

  // Miembros del grupo (inverso de GroupParticipantEntity.group).
  @OneToMany(
    () => GroupParticipantEntity,
    (participant) => participant.group,
  )
  participants: GroupParticipantEntity[];
}
