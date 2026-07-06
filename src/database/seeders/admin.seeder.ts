import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../../modules/users/users.service';
import { UserRole } from '../../modules/users/enums/user-role.enum';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn(
        'ADMIN_EMAIL o ADMIN_PASSWORD no configurados: se omite el seeder de administrador',
      );
      return;
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      if (existingUser.role !== UserRole.ADMIN) {
        this.logger.warn(
          `El usuario ${email} ya existe pero con rol ${existingUser.role}: no se modifica`,
        );
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await this.usersService.create({
      username: this.config.get<string>('ADMIN_USERNAME', 'admin'),
      email,
      passwordHash,
      name: this.config.get<string>('ADMIN_NAME', 'Admin'),
      middleName: this.config.get<string>('ADMIN_MIDDLE_NAME', 'De'),
      lastName: this.config.get<string>('ADMIN_LAST_NAME', 'KickOff'),
      motherLastName: this.config.get<string>('ADMIN_MOTHER_LAST_NAME', 'Club'),
      role: UserRole.ADMIN,
    });

    this.logger.log(`Usuario administrador creado: ${email}`);
  }
}
