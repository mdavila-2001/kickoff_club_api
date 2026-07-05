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
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
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
      '123';

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

      const responseData = response.data as Record<string, unknown>;
      if (
        typeof responseData.Message === 'string' &&
        responseData.Message.includes('Premium')
      ) {
        throw new BadGatewayException(
          'Este endpoint requiere una cuenta Premium de TheSportsDB',
        );
      }

      return this.mapResponse(response.data);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 400) {
        throw new BadGatewayException(
          'La API devolvió un error 400 (posible restricción Premium o parámetro inválido)',
        );
      }

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

  async fetchMatchesByDay(
    date: string,
    leagueId?: string,
  ): Promise<ExternalMatchDto[]> {
    let url = `${this.baseUrl}/${this.apiKey}/eventsday.php?d=${date}`;
    if (leagueId) {
      url += `&l=${leagueId}`;
    } else {
      url += `&s=Soccer`;
    }

    this.logger.debug(`Fetching day matches: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<TheSportsDbResponse>(url),
      );

      if (!response.data?.events) {
        return [];
      }

      return this.mapResponse(response.data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error trayendo partidos del día: ${errorMessage}`,
        errorStack,
      );
      throw new BadGatewayException(
        'Error al comunicarse con el proveedor externo de deportes',
      );
    }
  }

  async fetchMatchesBySeason(
    leagueId: string,
    season: string,
  ): Promise<ExternalMatchDto[]> {
    try {
      let url: string;
      const headers: Record<string, string> = {};

      if (this.isV2) {
        url = `${this.baseUrl}/eventsseason.php?id=${leagueId}&s=${season}`;
        headers['X-API-KEY'] = this.apiKey;
      } else {
        url = `${this.baseUrl}/${this.apiKey}/eventsseason.php?id=${leagueId}&s=${season}`;
      }

      this.logger.log(
        `Fetching matches for league ${leagueId} season ${season} from: ${url}`,
      );
      const response = await firstValueFrom(
        this.httpService.get<TheSportsDbResponse>(url, { headers }),
      );

      const responseData = response.data as Record<string, unknown>;
      if (
        responseData &&
        typeof responseData.Message === 'string' &&
        responseData.Message.includes('Premium')
      ) {
        throw new BadGatewayException(
          'Este endpoint requiere una cuenta Premium de TheSportsDB',
        );
      }

      return this.mapResponse(response.data);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 400) {
        throw new BadGatewayException(
          'La API devolvió un error 400 (posible restricción Premium o parámetro inválido)',
        );
      }

      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        `Failed to fetch matches for league ${leagueId} season ${season} from TheSportsDB`,
        errorMessage,
      );
      throw new BadGatewayException(
        'Error al comunicarse con el proveedor externo de deportes',
      );
    }
  }

  async fetchMatchesByRound(
    leagueId: string,
    round: string,
    season: string,
  ): Promise<ExternalMatchDto[]> {
    let url: string;
    const headers: Record<string, string> = {};

    if (this.isV2) {
      url = `${this.baseUrl}/eventsround.php?id=${leagueId}&r=${round}&s=${season}`;
      headers['X-API-KEY'] = this.apiKey;
    } else {
      url = `${this.baseUrl}/${this.apiKey}/eventsround.php?id=${leagueId}&r=${round}&s=${season}`;
    }

    this.logger.debug(`Fetching round matches: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<TheSportsDbResponse>(url, { headers }),
      );

      if (!response.data?.events) {
        return [];
      }

      return this.mapResponse(response.data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error fetching round matches: ${errorMessage}`,
        errorStack,
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
      dto.homeScore =
        homeScore !== null && Number.isNaN(homeScore) ? null : homeScore;
      dto.awayScore =
        awayScore !== null && Number.isNaN(awayScore) ? null : awayScore;
      dto.dateTime = Number.isNaN(dateTime.getTime()) ? new Date() : dateTime;
      dto.phase = phase;
      dto.stadium = stadium;
      dto.city = city;
      dto.homeTeamBadge = event.strHomeTeamBadge || null;
      dto.awayTeamBadge = event.strAwayTeamBadge || null;

      return dto;
    });
  }
}
