import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomInt } from 'crypto';

import { CreateGroupDto } from './dto/create-group.dto';

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
const INVITE_CODE_LENGTH = 8;

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}
import { GroupEntity } from './entities/group.entity';
import { GroupParticipantEntity } from './entities/group-participant.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(GroupEntity)
    private readonly groupsRepository: Repository<GroupEntity>,
    @InjectRepository(GroupParticipantEntity)
    private readonly participantsRepository: Repository<GroupParticipantEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateGroupDto, creatorId: string): Promise<GroupEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const inviteCode = generateInviteCode();

      const group = queryRunner.manager.create(GroupEntity, {
        name: dto.name,
        inviteCode,
        creatorId,
      });
      const savedGroup = await queryRunner.manager.save(group);

      const participant = queryRunner.manager.create(GroupParticipantEntity, {
        groupId: savedGroup.id,
        userId: creatorId,
        accumulatedPoints: 0,
      });
      await queryRunner.manager.save(participant);

      await queryRunner.commitTransaction();
      return savedGroup;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async joinGroup(
    inviteCode: string,
    userId: string,
  ): Promise<GroupParticipantEntity> {
    const group = await this.groupsRepository.findOne({
      where: { inviteCode },
    });

    if (!group) {
      throw new NotFoundException('Código de invitación inválido');
    }

    const existing = await this.participantsRepository.findOne({
      where: { groupId: group.id, userId },
    });

    if (existing) {
      throw new ConflictException('Ya perteneces a este grupo');
    }

    const participant = this.participantsRepository.create({
      groupId: group.id,
      userId,
      accumulatedPoints: 0,
    });

    return this.participantsRepository.save(participant);
  }

  async findMyGroups(userId: string): Promise<GroupEntity[]> {
    const participations = await this.participantsRepository.find({
      where: { userId },
      relations: { group: { participants: true } },
    });

    return participations.map((p) => p.group);
  }

  async findParticipants(groupId: string): Promise<GroupParticipantEntity[]> {
    return this.participantsRepository.find({
      where: { groupId },
      relations: { user: true },
    });
  }

  async getLeaderboard(groupId: string): Promise<GroupParticipantEntity[]> {
    return this.participantsRepository.find({
      where: { groupId },
      relations: { user: true },
      order: { accumulatedPoints: 'DESC' },
    });
  }
}
