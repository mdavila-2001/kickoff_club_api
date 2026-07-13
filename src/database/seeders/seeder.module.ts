import { Module } from '@nestjs/common';
import { UsersModule } from '../../modules/users/users.module';
import { AdminSeeder } from './admin.seeder';
@Module({
  imports: [UsersModule],
  providers: [AdminSeeder],
})
export class SeederModule {}
