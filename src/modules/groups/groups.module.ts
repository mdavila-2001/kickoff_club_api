import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { GroupEntity } from './entities/group.entity';
import { GroupParticipantEntity } from './entities/group-participant.entity';
@Module({
  imports: [TypeOrmModule.forFeature([GroupEntity, GroupParticipantEntity])],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [TypeOrmModule],
})
export class GroupsModule {}
