import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { IsInt, IsOptional, IsUUID } from 'class-validator';
import { UserEntity } from '../../users/entities/user.entity';
import { MatchEntity } from '../../matches/entities/match.entity';
@Entity({ name: 'predictions' })
@Unique('uq_user_match', ['userId', 'matchId'])
export class PredictionEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;
  @Column({ name: 'user_id', type: 'uuid' })
  @IsUUID()
  userId: string;
  @Column({ name: 'match_id', type: 'uuid' })
  @IsUUID()
  matchId: string;
  @Column({ name: 'predicted_home', type: 'integer' })
  @IsInt()
  predictedHome: number;
  @Column({ name: 'predicted_away', type: 'integer' })
  @IsInt()
  predictedAway: number;
  @Column({ name: 'points_earned', type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  pointsEarned: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
  @ManyToOne(() => UserEntity, (user) => user.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
  @ManyToOne(() => MatchEntity, (match) => match.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'match_id' })
  match: MatchEntity;
}
