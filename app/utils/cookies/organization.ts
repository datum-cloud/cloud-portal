import { BaseCookie, IBaseCookieData } from './base';

interface IOrganizationCookieData extends IBaseCookieData {
  id: string | null;
}

class OrganizationCookie extends BaseCookie<IOrganizationCookieData> {
  protected readonly COOKIE_KEY = '_organization';
  protected readonly MAX_AGE = 7 * 24 * 60 * 60;
}

export const organizationCookie = OrganizationCookie.create();
