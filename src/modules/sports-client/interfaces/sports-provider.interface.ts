import { ExternalMatchDto } from '../dto/external-match.dto';
export abstract class ISportsProvider {
  abstract fetchLiveMatches(): Promise<ExternalMatchDto[]>;
  abstract fetchMatchesByDate(date: string): Promise<ExternalMatchDto[]>;
  abstract fetchMatchesBySeason(
    leagueId: string,
    season: string,
  ): Promise<ExternalMatchDto[]>;
  abstract fetchMatchesByDay(
    date: string,
    leagueId?: string,
  ): Promise<ExternalMatchDto[]>;
  abstract fetchMatchesByRound(
    leagueId: string,
    round: string,
    season: string,
  ): Promise<ExternalMatchDto[]>;
}
