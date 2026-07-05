import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { MatchesModule } from './modules/matches/matches.module';
import { GroupsModule } from './modules/groups/groups.module';
import { AuthModule } from './modules/auth/auth.module';
import { SportsClientModule } from './modules/sports-client/sports-client.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UsersModule,
    GroupsModule,
    MatchesModule,
    PredictionsModule,
    AuthModule,
    SportsClientModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
