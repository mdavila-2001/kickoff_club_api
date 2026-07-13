import { IsInt, IsOptional, Min } from 'class-validator';
export class UpdatePredictionDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  predictedHome?: number;
  @IsInt()
  @Min(0)
  @IsOptional()
  predictedAway?: number;
}
