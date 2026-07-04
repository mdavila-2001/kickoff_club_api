/**
 * Claims firmados dentro del JWT.
 * `sub` (subject) transporta el UUID del usuario según RFC 7519.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}
