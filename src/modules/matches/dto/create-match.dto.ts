import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class CreateMatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  homeTeam: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  awayTeam: string;
  @IsDateString()
  @IsNotEmpty()
  dateTime: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phase: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  stadium: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;
}
