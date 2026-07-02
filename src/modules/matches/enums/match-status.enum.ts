/**
 * Estados del ciclo de vida de un partido.
 * Espeja el tipo PostgreSQL `match_status` definido en schema.sql.
 */
export enum MatchStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
}
