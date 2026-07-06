import { UserRole } from '../../users/enums/user-role.enum';
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
export interface AuthResponse {
  accessToken: string;
  user: AuthUserProfile;
}
export type LoginResponse = AuthResponse;
