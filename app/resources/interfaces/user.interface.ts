export type ThemeValue = 'dark' | 'light' | 'system';

export enum RegistrationApproval {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Pending = 'Pending',
}

export enum LastLoginProvider {
  Google = 'google',
  Github = 'github',
}

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
  onboardedAt?: string;
  registrationApproval?: RegistrationApproval;
  state?: string;
  lastLoginProvider?: LastLoginProvider;
  avatarUrl?: string;
}
