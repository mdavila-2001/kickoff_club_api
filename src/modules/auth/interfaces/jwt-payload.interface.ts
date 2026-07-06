export interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  name: string;
  middleName: string | null;
  lastName: string;
  motherLastName: string | null;
  role: string;
}
