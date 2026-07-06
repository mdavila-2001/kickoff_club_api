import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
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
  intRound?: string;
  idVenue?: string;
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
  private readonly venueCache = new Map<string, string | null>();

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

  private async getWithRetry<T>(
    url: string,
    options?: { headers?: Record<string, string> },
    retries = 5,
    delay = 1000,
  ): Promise<AxiosResponse<T>> {
    try {
      return await firstValueFrom(this.httpService.get<T>(url, options));
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      const status = axiosError?.response?.status;
      if (status === 429 && retries > 0) {
        this.logger.warn(
          `Request to ${url} rate limited (429). Retrying in ${delay}ms... (${retries} retries left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.getWithRetry<T>(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async fetchLiveMatches(): Promise<ExternalMatchDto[]> {
    try {
      if (this.isV2) {
        const url = `${this.baseUrl}/livescore/soccer`;
        const headers = { 'X-API-KEY': this.apiKey };

        this.logger.log(`Fetching live matches from V2 API: ${url}`);
        const response = await this.getWithRetry<TheSportsDbResponse>(url, {
          headers,
        });
        return await this.mapResponse(response.data);
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
      const response = await this.getWithRetry<TheSportsDbResponse>(url, {
        headers,
      });

      const responseData = response.data as Record<string, unknown>;
      if (
        typeof responseData.Message === 'string' &&
        responseData.Message.includes('Premium')
      ) {
        throw new BadGatewayException(
          'Este endpoint requiere una cuenta Premium de TheSportsDB',
        );
      }

      return await this.mapResponse(response.data);
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
      const response = await this.getWithRetry<TheSportsDbResponse>(url);

      if (!response.data?.events) {
        return [];
      }

      return await this.mapResponse(response.data);
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
      const response = await this.getWithRetry<TheSportsDbResponse>(url, {
        headers,
      });

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

      return await this.mapResponse(response.data);
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
      const response = await this.getWithRetry<TheSportsDbResponse>(url, {
        headers,
      });

      if (!response.data?.events) {
        return [];
      }

      return await this.mapResponse(response.data);
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

  private async mapResponse(
    data: TheSportsDbResponse,
  ): Promise<ExternalMatchDto[]> {
    const rawEvents = data.events || data.livescore;
    if (!rawEvents || !Array.isArray(rawEvents)) {
      return [];
    }

    const dtos: ExternalMatchDto[] = [];
    for (const event of rawEvents) {
      dtos.push(await this.mapSingleEvent(event));
    }
    return dtos;
  }

  private async mapSingleEvent(
    event: TheSportsDbEvent,
  ): Promise<ExternalMatchDto> {
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

    const phase = this.determinePhase(event.strLeague, event.intRound);
    const stadium = event.strVenue || 'Unknown Venue';
    const city = event.strCity || 'Unknown City';

    // Obtener imagen del estadio usando el ID de Venue con caché
    const stadiumImage = event.idVenue
      ? await this.fetchVenueImage(event.idVenue)
      : null;

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
    dto.stadiumImage = stadiumImage;
    dto.homeTeamBadge = event.strHomeTeamBadge || null;
    dto.awayTeamBadge = event.strAwayTeamBadge || null;

    return dto;
  }

  private async fetchVenueImage(venueId: string): Promise<string | null> {
    const cached = this.venueCache.get(venueId);
    if (cached !== undefined) {
      return cached;
    }

    try {
      // Delay de 300ms para evitar rate limiting (HTTP 429) de TheSportsDb
      await new Promise((resolve) => setTimeout(resolve, 300));

      let url: string;
      const headers: Record<string, string> = {};

      if (this.isV2) {
        url = `${this.baseUrl}/lookupvenue.php?id=${venueId}`;
        headers['X-API-KEY'] = this.apiKey;
      } else {
        url = `${this.baseUrl}/${this.apiKey}/lookupvenue.php?id=${venueId}`;
      }

      this.logger.debug(
        `Fetching stadium details for venue ID ${venueId} from: ${url}`,
      );
      const response = await this.getWithRetry<{
        venues?: { strThumb?: string }[] | null;
      }>(url, {
        headers,
      });

      const thumb = response.data?.venues?.[0]?.strThumb || null;
      this.venueCache.set(venueId, thumb);
      return thumb;
    } catch (error) {
      this.logger.warn(`Failed to fetch stadium image for venue ID ${venueId}`);
      this.venueCache.set(venueId, null);
      console.error(error);
      return null;
    }
  }

  private determinePhase(league?: string, roundRaw?: string): string {
    const defaultPhase = league || 'Unknown League';
    if (!league && !roundRaw) {
      return defaultPhase;
    }

    const leagueLower = league?.toLowerCase() || '';
    if (
      !leagueLower.includes('world cup') &&
      !leagueLower.includes('copa del mundo') &&
      !roundRaw
    ) {
      return defaultPhase;
    }

    const round = roundRaw?.trim().toLowerCase();
    if (!round) {
      return defaultPhase;
    }

    if (
      round === '1' ||
      round === '2' ||
      round === '3' ||
      round.includes('group')
    ) {
      return 'Fase de Grupos';
    }

    if (round === '32' || round.includes('32')) {
      return 'Dieciseisavos de Final';
    }

    if (round === '16' || round.includes('16') || round.includes('octavos')) {
      return 'Octavos de Final';
    }

    if (
      round === '8' ||
      round.includes('quarter') ||
      round.includes('cuartos')
    ) {
      return 'Cuartos de Final';
    }

    if (round === '4' || round.includes('semi')) {
      return 'Semifinal';
    }

    if (round === '2' || round.includes('third') || round.includes('tercer')) {
      return 'Tercer Puesto';
    }

    if (round === '1' || round.includes('final')) {
      return 'Final';
    }

    return defaultPhase;
  }
}
