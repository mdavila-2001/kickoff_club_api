import { IsInt, IsUUID, Min } from 'class-validator';

export class CreatePredictionDto {
  @IsUUID()
  matchId: string;

  @IsInt()
  @Min(0)
  predictedHome: number;

  @IsInt()
  @Min(0)
  predictedAway: number;
}
