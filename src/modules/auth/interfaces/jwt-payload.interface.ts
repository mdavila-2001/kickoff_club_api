/**
 * Claims firmados dentro del JWT.
 * `sub` (subject) transporta el UUID del usuario según RFC 7519.
 * `id` transporta el ID explícito según el contrato del sistema.
 */
export interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  role: string;
}
