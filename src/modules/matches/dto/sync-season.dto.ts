import { IsNotEmpty, IsString } from 'class-validator';

export class SyncSeasonDto {
  @IsString()
  @IsNotEmpty()
  leagueId: string;

  @IsString()
  @IsNotEmpty()
  season: string;
}
