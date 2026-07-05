import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { ISportsProvider } from '../interfaces/sports-provider.interface';
import { ExternalMatchDto } from '../dto/external-match.dto';

interface TheSportsDbEvent {
  idEvent: string;
  strEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  dateEvent?: string;
  strTime?: string;
  strLeague?: string;
  strVenue?: string;
  strCity?: string;
}

interface TheSportsDbResponse {
  events?: TheSportsDbEvent[] | null;
  livescore?: TheSportsDbEvent[] | null;
}

@Injectable()
export class TheSportsDbAdapter implements ISportsProvider {
  private readonly logger = new Logger(TheSportsDbAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly isV2: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = (
      this.configService.get<string>('THE_SPORTS_DB_BASE_URL') ||
      this.configService.get<string>('SPORTS_API_URL') ||
      'https://www.thesportsdb.com/api/v1/json'
    ).replace(/\/$/, '');

    this.apiKey =
      this.configService.get<string>('THE_SPORTS_DB_API_KEY') ||
      this.configService.get<string>('SPORTS_API_KEY') ||
      '1';

    this.isV2 = this.baseUrl.includes('/v2');
  }

  async fetchLiveMatches(): Promise<ExternalMatchDto[]> {
    try {
      if (this.isV2) {
        const url = `${this.baseUrl}/livescore/soccer`;
        const headers = { 'X-API-KEY': this.apiKey };

        this.logger.log(`Fetching live matches from V2 API: ${url}`);
        const response = await firstValueFrom(
          this.httpService.get<TheSportsDbResponse>(url, { headers }),
        );
        return this.mapResponse(response.data);
      } else {
        const today = new Date().toISOString().split('T')[0];
        this.logger.log(
          `V1 API active. Fallback to fetching today's matches (${today}) for live data.`,
        );
        return this.fetchMatchesByDate(today);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'Failed to fetch live matches from TheSportsDB',
        errorMessage,
      );
      throw new BadGatewayException(
        'Error al comunicarse con el proveedor externo de deportes',
      );
    }
  }

  async fetchMatchesByDate(date: string): Promise<ExternalMatchDto[]> {
    try {
      let url: string;
      const headers: Record<string, string> = {};

      if (this.isV2) {
        url = `${this.baseUrl}/eventsday.php?d=${date}`;
        headers['X-API-KEY'] = this.apiKey;
      } else {
        url = `${this.baseUrl}/${this.apiKey}/eventsday.php?d=${date}`;
      }

      this.logger.log(`Fetching matches for date ${date} from: ${url}`);
      const response = await firstValueFrom(
        this.httpService.get<TheSportsDbResponse>(url, { headers }),
      );
      return this.mapResponse(response.data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        `Failed to fetch matches for date ${date} from TheSportsDB`,
        errorMessage,
      );
      throw new BadGatewayException(
        'Error al comunicarse con el proveedor externo de deportes',
      );
    }
  }

  private mapResponse(data: TheSportsDbResponse): ExternalMatchDto[] {
    const rawEvents = data.events || data.livescore;
    if (!rawEvents || !Array.isArray(rawEvents)) {
      return [];
    }

    return rawEvents.map((event) => {
      const externalApiId = event.idEvent;
      const homeTeam = event.strHomeTeam || 'Unknown Home Team';
      const awayTeam = event.strAwayTeam || 'Unknown Away Team';
      const homeScore =
        event.intHomeScore !== null &&
        event.intHomeScore !== undefined &&
        event.intHomeScore !== ''
          ? Number(event.intHomeScore)
          : null;
      const awayScore =
        event.intAwayScore !== null &&
        event.intAwayScore !== undefined &&
        event.intAwayScore !== ''
          ? Number(event.intAwayScore)
          : null;

      const datePart = event.dateEvent
        ? event.dateEvent.split('T')[0]
        : '1970-01-01';
      const timePart = event.strTime || '00:00:00';
      let combinedIsoStr = `${datePart}T${timePart}`;
      if (!combinedIsoStr.includes('+') && !combinedIsoStr.endsWith('Z')) {
        combinedIsoStr += 'Z';
      }
      const dateTime = new Date(combinedIsoStr);

      const phase = event.strLeague || 'Unknown League';
      const stadium = event.strVenue || 'Unknown Venue';
      const city = event.strCity || 'Unknown City';

      const dto = new ExternalMatchDto();
      dto.externalApiId = externalApiId;
      dto.homeTeam = homeTeam;
      dto.awayTeam = awayTeam;
      dto.homeScore = isNaN(homeScore as number) ? null : homeScore;
      dto.awayScore = isNaN(awayScore as number) ? null : awayScore;
      dto.dateTime = isNaN(dateTime.getTime()) ? new Date() : dateTime;
      dto.phase = phase;
      dto.stadium = stadium;
      dto.city = city;

      return dto;
    });
  }
}
