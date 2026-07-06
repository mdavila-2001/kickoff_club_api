import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
export class ExternalMatchDto {
  @IsString()
  @IsNotEmpty()
  externalApiId: string;
  @IsString()
  @IsNotEmpty()
  homeTeam: string;
  @IsString()
  @IsNotEmpty()
  awayTeam: string;
  @IsOptional()
  @IsInt()
  @Min(0)
  homeScore: number | null;
  @IsOptional()
  @IsInt()
  @Min(0)
  awayScore: number | null;
  @IsDate()
  dateTime: Date;
  @IsString()
  @IsNotEmpty()
  phase: string;
  @IsString()
  stadium: string;
  @IsString()
  city: string;
  @IsOptional()
  @IsString()
  homeTeamBadge: string | null;
  @IsOptional()
  @IsString()
  awayTeamBadge: string | null;
  @IsOptional()
  @IsString()
  stadiumImage: string | null = null;
}
