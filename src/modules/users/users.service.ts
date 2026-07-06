import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { UserEntity } from './entities/user.entity';
import { CreateUserData } from './interfaces/create-user-data.interface';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async getProfile(userId: string): Promise<Omit<UserEntity, 'passwordHash'>> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<Omit<UserEntity, 'passwordHash'>> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.username) {
      const usernameTaken = await this.usersRepository.findOne({
        where: { username: dto.username, id: Not(userId) },
      });

      if (usernameTaken) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
    }

    Object.assign(user, dto);
    const saved = await this.usersRepository.save(user);

    const { passwordHash: _, ...profile } = saved;
    return profile;
  }
}
