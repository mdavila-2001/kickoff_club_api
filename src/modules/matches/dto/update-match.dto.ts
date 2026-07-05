import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
