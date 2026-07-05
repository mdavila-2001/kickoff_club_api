import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { TheSportsDbAdapter } from './adapters/the-sports-db.adapter';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    {
      provide: 'SPORTS_PROVIDER_TOKEN',
      useClass: TheSportsDbAdapter,
    },
  ],
  exports: ['SPORTS_PROVIDER_TOKEN', HttpModule],
})
export class SportsClientModule {}
