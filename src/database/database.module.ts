import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const useSsl = config.get<string>('DB_SSL') === 'true';
        const ssl = useSsl ? { rejectUnauthorized: false } : false;

        return {
          type: 'postgres',
          host: config.getOrThrow<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
          ssl,
          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
