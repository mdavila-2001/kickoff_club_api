/**
 * Datos mínimos para persistir un usuario. La contraseña llega YA
 * hasheada: este contrato jamás transporta texto plano.
 */
export interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  lastName: string;
  middleName?: string;
  motherLastName?: string;
}
