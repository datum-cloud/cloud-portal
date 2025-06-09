import { BaseCookie, IBaseCookieData } from './base';

interface ITokenCookieData extends IBaseCookieData {
  idToken: string;
}

class TokenCookie extends BaseCookie<ITokenCookieData> {
  protected readonly COOKIE_KEY = '_token';
  protected readonly MAX_AGE = 7 * 24 * 60 * 60;
}

export const tokenCookie = TokenCookie.create();
