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

  @Column({ name: 'home_score', type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  homeScore: number | null;

  @Column({ name: 'away_score', type: 'integer', nullable: true })
  @IsOptional()
  @IsInt()
  awayScore: number | null;

  @Column({ name: 'stadium', type: 'varchar', length: 150 })
  @IsString()
  stadium: string;

  @Column({ name: 'city', type: 'varchar', length: 100 })
  @IsString()
  city: string;

  @Column({
    name: 'home_team_badge',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  @IsOptional()
  @IsString()
  homeTeamBadge: string | null;

  @Column({
    name: 'away_team_badge',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  @IsOptional()
  @IsString()
  awayTeamBadge: string | null;

  @Column({
    name: 'stadium_image',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  @IsOptional()
  @IsString()
  stadiumImage: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Pronósticos asociados a este partido (inverso de PredictionEntity.match).
  @OneToMany(() => PredictionEntity, (prediction) => prediction.match)
  predictions: PredictionEntity[];
}
