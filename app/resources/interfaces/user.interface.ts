export type ThemeValue = 'dark' | 'light' | 'system';

export interface IUserPreferences {
  theme: ThemeValue;
  timezone: string;
  newsletter: boolean;
}

export interface IUser {
  sub?: string;
  email?: string;
  familyName?: string;
  givenName?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  fullName?: string;
  preferences?: IUserPreferences;
}
