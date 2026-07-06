import { ExternalMatchDto } from '../dto/external-match.dto';

export abstract class ISportsProvider {
  abstract fetchLiveMatches(): Promise<ExternalMatchDto[]>;
  abstract fetchMatchesByDate(date: string): Promise<ExternalMatchDto[]>;

  abstract fetchMatchesBySeason(
    leagueId: string,
    season: string,
  ): Promise<ExternalMatchDto[]>;

  /**
   * Fetches matches for a specific day and optional league
   * @param date The date in YYYY-MM-DD format
   * @param leagueId The optional ID of the league
   */
  abstract fetchMatchesByDay(
    date: string,
    leagueId?: string,
  ): Promise<ExternalMatchDto[]>;

  /**
   * Fetches matches for a specific league, round and season
   */
  abstract fetchMatchesByRound(
    leagueId: string,
    round: string,
    season: string,
  ): Promise<ExternalMatchDto[]>;
}
