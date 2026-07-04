import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  async create(createGroupDto: CreateGroupDto) {
    // TODO: Implement create group logic
  }

  async findAll() {
    // TODO: Implement find all groups logic
  }

  async joinGroup(inviteCode: string) {
    // TODO: Implement join group logic
  }
}
