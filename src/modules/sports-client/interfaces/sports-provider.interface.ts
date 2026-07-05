import { ExternalMatchDto } from '../dto/external-match.dto';

export interface ISportsProvider {
  fetchLiveMatches(): Promise<ExternalMatchDto[]>;
  fetchMatchesByDate(date: string): Promise<ExternalMatchDto[]>;
}
