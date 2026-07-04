import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { PostgresExceptionFilter } from './common/filters/postgres-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Versionado del perímetro: todas las rutas cuelgan de /api/v1.
  app.setGlobalPrefix('api/v1');

  // whitelist + forbidNonWhitelisted: toda propiedad intrusa que no esté
  // declarada en el DTO rechaza la petición con 400 antes de tocar la BD.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Traduce errores de PostgreSQL (23505, 45000) a respuestas HTTP.
  app.useGlobalFilters(new PostgresExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
