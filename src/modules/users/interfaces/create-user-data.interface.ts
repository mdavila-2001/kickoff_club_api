import { UserRole } from '../enums/user-role.enum';
export interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  lastName: string;
  middleName?: string;
  motherLastName?: string;
  role?: UserRole;
}
