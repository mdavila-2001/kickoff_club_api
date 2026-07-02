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
// Restricción compuesta uq_user_match: un pronóstico por usuario y partido.
@Unique('uq_user_match', ['userId', 'matchId'])
export class PredictionEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  // Columna cruda de la llave foránea (espejo de la relación `user`).
  @Column({ name: 'user_id', type: 'uuid' })
  @IsUUID()
  userId: string;

  // Columna cruda de la llave foránea (espejo de la relación `match`).
  @Column({ name: 'match_id', type: 'uuid' })
  @IsUUID()
  matchId: string;

  @Column({ name: 'predicted_home', type: 'int' })
  @IsInt()
  predictedHome: number;

  @Column({ name: 'predicted_away', type: 'int' })
  @IsInt()
  predictedAway: number;

  @Column({ name: 'points_earned', type: 'int', nullable: true })
  @IsOptional()
  @IsInt()
  pointsEarned: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // fk_predictions_user ... ON DELETE CASCADE
  @ManyToOne(() => UserEntity, (user) => user.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  // fk_predictions_match ... ON DELETE CASCADE
  @ManyToOne(() => MatchEntity, (match) => match.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'match_id' })
  match: MatchEntity;
}
