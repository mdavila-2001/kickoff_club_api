import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { GroupEntity } from './group.entity';
import { UserEntity } from '../../users/entities/user.entity';
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
  @Column({ name: 'previous_position', type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  previousPosition: number | null;
  @Column({ name: 'rank_delta', type: 'integer', default: 0 })
  @IsInt()
  rankDelta: number;
  @CreateDateColumn({ name: 'joined_at', type: 'timestamp with time zone' })
  joinedAt: Date;
  @ManyToOne(() => GroupEntity, (group) => group.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'group_id' })
  group: GroupEntity;
  @ManyToOne(() => UserEntity, (user) => user.groupParticipations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
