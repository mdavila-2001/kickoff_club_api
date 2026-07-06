import { UserRole } from '../../users/enums/user-role.enum';

/**
 * Perfil público del usuario: espejo de UserEntity SIN `passwordHash`.
 * Es el único contrato de salida permitido hacia el cliente.
 */
export interface AuthUserProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  middleName: string | null;
  lastName: string;
  motherLastName: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Formato universal de respuesta para flujos exitosos de autenticación.
 */
export interface AuthResponse {
  accessToken: string;
  user: AuthUserProfile;
}

/**
 * Alias de compatibilidad hacia atrás.
 */
export type LoginResponse = AuthResponse;
