import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreatePredictionDto {
  @IsUUID()
  @IsNotEmpty()
  matchId: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  predictedHome: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  predictedAway: number;
}
