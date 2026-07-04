import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { IsInt, IsUUID, Min } from 'class-validator';

import { GroupEntity } from './group.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Relación M:N enriquecida entre `groups` y `users`.
 * Al portar el atributo `accumulated_points` se modela como entidad
 * explícita con llave primaria compuesta (group_id, user_id) en lugar
 * de usar @ManyToMany.
 */
@Entity({ name: 'group_participants' })
export class GroupParticipantEntity {
  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  @IsUUID()
  groupId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  @IsUUID()
  userId: string;

  @Column({ name: 'accumulated_points', type: 'integer', default: 0 })
  @IsInt()
  @Min(0)
  accumulatedPoints: number;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamp with time zone' })
  joinedAt: Date;

  // fk_participants_group ... ON DELETE CASCADE
  @ManyToOne(() => GroupEntity, (group) => group.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'group_id' })
  group: GroupEntity;

  // fk_participants_user ... ON DELETE CASCADE
  @ManyToOne(() => UserEntity, (user) => user.groupParticipations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
