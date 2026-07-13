import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { MatchEntity } from './entities/match.entity';
import { IngestionService } from './services/ingestion.service';
import { MatchesCronService } from './services/matches-cron.service';
import { SportsClientModule } from '../sports-client/sports-client.module';
@Module({
  imports: [TypeOrmModule.forFeature([MatchEntity]), SportsClientModule],
  controllers: [MatchesController],
  providers: [MatchesService, IngestionService, MatchesCronService],
  exports: [TypeOrmModule, IngestionService],
})
export class MatchesModule {}
