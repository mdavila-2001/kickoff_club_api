import { ExternalMatchDto } from '../dto/external-match.dto';

export abstract class ISportsProvider {
  abstract fetchLiveMatches(): Promise<ExternalMatchDto[]>;
  abstract fetchMatchesByDate(date: string): Promise<ExternalMatchDto[]>;
}
