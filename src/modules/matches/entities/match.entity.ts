import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { MatchStatus } from '../enums/match-status.enum';
import { PredictionEntity } from '../../predictions/entities/prediction.entity';

@Entity({ name: 'matches' })
export class MatchEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({
    name: 'external_api_id',
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  externalApiId: string | null;

  @Column({ name: 'home_team', type: 'varchar', length: 100 })
  @IsString()
  homeTeam: string;

  @Column({ name: 'away_team', type: 'varchar', length: 100 })
  @IsString()
  awayTeam: string;

  @Column({ name: 'date_time', type: 'timestamp with time zone' })
  @IsDate()
  dateTime: Date;

  @Column({ name: 'phase', type: 'varchar', length: 50 })
  @IsString()
  phase: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  @IsEnum(MatchStatus)
  status: MatchStatus;

  @Column({ name: 'home_score', type: 'int', nullable: true })
  @IsOptional()
  @IsInt()
  homeScore: number | null;

  @Column({ name: 'away_score', type: 'int', nullable: true })
  @IsOptional()
  @IsInt()
  awayScore: number | null;

  @Column({ name: 'stadium', type: 'varchar', length: 150 })
  @IsString()
  stadium: string;

  @Column({ name: 'city', type: 'varchar', length: 100 })
  @IsString()
  city: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Pronósticos asociados a este partido (inverso de PredictionEntity.match).
  @OneToMany(() => PredictionEntity, (prediction) => prediction.match)
  predictions: PredictionEntity[];
}
