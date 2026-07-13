import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MatchStatus } from '../enums/match-status.enum';
export class FilterMatchesDto {
  @IsString()
  @IsOptional()
  phase?: string;
  @IsString()
  @IsOptional()
  date?: string;
  @IsEnum(MatchStatus)
  @IsOptional()
  status?: MatchStatus;
}
