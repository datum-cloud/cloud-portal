import { BaseCookie, IBaseCookieData } from './base';

interface ISessionCookieData extends IBaseCookieData {
  sub: string;
  accessToken: string;
  refreshToken: string | null;
  expiredAt: Date;
}

export const SESSION_KEY = '_session';
class SessionCookie extends BaseCookie<ISessionCookieData> {
  protected readonly COOKIE_KEY = SESSION_KEY;
  protected readonly MAX_AGE = 7 * 24 * 60 * 60;
}

export const sessionCookie = SessionCookie.create();
