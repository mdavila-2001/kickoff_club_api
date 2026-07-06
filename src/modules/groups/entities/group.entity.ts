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
  @Column({ name: 'creator_id', type: 'uuid' })
  @IsUUID()
  creatorId: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
  @ManyToOne(() => UserEntity, (user) => user.groups, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creator_id' })
  creator: UserEntity;
  @OneToMany(() => GroupParticipantEntity, (participant) => participant.group)
  participants: GroupParticipantEntity[];
}
