/**
 * Identidad que NestJS inyecta en `req.user` tras validar el JWT.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}
