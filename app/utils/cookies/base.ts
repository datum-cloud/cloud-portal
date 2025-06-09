import { env } from '@/utils/config/env.server';
import { createCookie, createCookieSessionStorage } from 'react-router';

export interface IBaseCookieData {}

type CookieResponse<T> = {
  data?: T;
  headers: Headers;
};

export abstract class BaseCookie<T extends IBaseCookieData> {
  protected abstract readonly COOKIE_KEY: string;
  protected abstract readonly MAX_AGE: number;

  private cookie!: ReturnType<typeof createCookie>;
  private storage!: ReturnType<typeof createCookieSessionStorage<Record<string, T>>>;

  static create<T extends IBaseCookieData>(this: new () => BaseCookie<T>): BaseCookie<T> {
    const instance = new this();
    instance.initialize();
    return instance;
  }

  private initialize() {
    this.cookie = createCookie(this.COOKIE_KEY, {
      path: '/',
      domain: new URL(env.APP_URL).hostname,
      sameSite: 'lax',
      httpOnly: true,
      maxAge: this.MAX_AGE,
      secrets: [env.SESSION_SECRET],
    });
    this.storage = createCookieSessionStorage({ cookie: this.cookie });
  }

  private createHeaders(cookieHeader: string): Headers {
    return new Headers({ 'Set-Cookie': cookieHeader });
  }

  async set(request: Request, data: T): Promise<CookieResponse<T>> {
    const session = await this.storage.getSession(request.headers.get('Cookie'));
    session.set(this.COOKIE_KEY, data);
    const cookieHeader = await this.storage.commitSession(session);

    return { data, headers: this.createHeaders(cookieHeader) };
  }

  async get(request: Request): Promise<CookieResponse<T>> {
    const session = await this.storage.getSession(request.headers.get('Cookie'));
    const data = session.get(this.COOKIE_KEY) as T | undefined;
    const cookieHeader = await this.storage.commitSession(session);

    return { data, headers: this.createHeaders(cookieHeader) };
  }

  async destroy(request: Request): Promise<CookieResponse<T>> {
    const session = await this.storage.getSession(request.headers.get('Cookie'));
    const cookieHeader = await this.storage.destroySession(session);

    return { headers: this.createHeaders(cookieHeader) };
  }

  async serialize(data: T): Promise<string> {
    const session = await this.storage.getSession();
    session.set(this.COOKIE_KEY, data);
    return await this.storage.commitSession(session);
  }
}
