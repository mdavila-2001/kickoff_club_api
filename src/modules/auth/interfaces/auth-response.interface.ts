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

export interface LoginResponse {
  accessToken: string;
  user: AuthUserProfile;
}
