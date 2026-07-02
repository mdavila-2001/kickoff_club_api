import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        // SSL es obligatorio en proveedores gestionados como Neon.
        const useSsl = config.get<string>('DB_SSL') === 'true';
        const ssl = useSsl ? { rejectUnauthorized: false } : false;

        // Se prioriza DATABASE_URL (recomendado para el pooler de Neon);
        // si no existe, se arma la conexión con parámetros individuales.
        const url = config.get<string>('DATABASE_URL');
        const connection: TypeOrmModuleOptions = url
          ? { type: 'postgres', url }
          : {
              type: 'postgres',
              host: config.get<string>('DB_HOST'),
              port: config.get<number>('DB_PORT', 5432),
              username: config.get<string>('DB_USER'),
              password: config.get<string>('DB_PASSWORD'),
              database: config.get<string>('DB_NAME'),
            };

        return {
          ...connection,
          ssl,
          // Las entidades se cargan solas desde cada TypeOrmModule.forFeature().
          autoLoadEntities: true,
          // El esquema lo gobierna schema.sql (triggers, funciones, índices):
          // TypeORM NUNCA debe alterarlo.
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
