import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';

import { MatchEntity } from './entities/match.entity';
import { FilterMatchesDto } from './dto/filter-matches.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchRepository: Repository<MatchEntity>,
  ) {}

  async findAll(filters: FilterMatchesDto): Promise<MatchEntity[]> {
    const where: FindOptionsWhere<MatchEntity> = {};

    if (filters.phase) {
      where.phase = filters.phase;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.date) {
      const dayStart = new Date(`${filters.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${filters.date}T23:59:59.999Z`);
      where.dateTime = Between(dayStart, dayEnd);
    }

    return this.matchRepository.find({
      where,
      order: { dateTime: 'ASC' },
    });
  }

  async findById(id: string): Promise<MatchEntity> {
    const match = await this.matchRepository.findOne({ where: { id } });

    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }

    return match;
  }

  async createMatch(dto: CreateMatchDto): Promise<MatchEntity> {
    const match = this.matchRepository.create({
      homeTeam: dto.homeTeam,
      awayTeam: dto.awayTeam,
      dateTime: new Date(dto.dateTime),
      phase: dto.phase,
      stadium: dto.stadium,
      city: dto.city,
    });

    return this.matchRepository.save(match);
  }

  async updateMatch(id: string, dto: UpdateMatchDto): Promise<MatchEntity> {
    const match = await this.findById(id);

    const updates: Partial<Pick<MatchEntity, 'dateTime' | 'phase' | 'stadium' | 'city'>> = {};

    if (dto.dateTime !== undefined) {
      updates.dateTime = new Date(dto.dateTime);
    }
    if (dto.phase !== undefined) {
      updates.phase = dto.phase;
    }
    if (dto.stadium !== undefined) {
      updates.stadium = dto.stadium;
    }
    if (dto.city !== undefined) {
      updates.city = dto.city;
    }

    Object.assign(match, updates);

    return this.matchRepository.save(match);
  }
}
