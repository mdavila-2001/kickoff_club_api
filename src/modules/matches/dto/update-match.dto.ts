import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MatchStatus } from '../enums/match-status.enum';

export class UpdateMatchDto {
  @IsDateString()
  @IsOptional()
  dateTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phase?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  stadium?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsEnum(MatchStatus)
  @IsOptional()
  status?: MatchStatus;

  @IsInt()
  @Min(0)
  @IsOptional()
  homeScore?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  awayScore?: number;
}
