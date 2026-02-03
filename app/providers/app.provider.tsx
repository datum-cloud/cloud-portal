import { useTheme } from '@/modules/datum-themes';
import { clearSentryUser, setSentryUser } from '@/modules/sentry';
import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import type { User, UserPreferences } from '@/resources/users';
import { getBrowserTimezone } from '@/utils/helpers/timezone.helper';
import { ReactNode, createContext, useContext, useEffect, useState, useMemo } from 'react';

interface AppContextType {
  user: User | undefined;
  userPreferences: UserPreferences | undefined;
  organization: Organization | undefined;
  project: Project | undefined;
  orgId: string | undefined;
  setUser: (user: User) => void;
  setOrganization: (organization: Organization) => void;
  setProject: (project: Project) => void;
}

const AppContext = createContext<AppContextType>({
  user: undefined,
  userPreferences: undefined,
  organization: undefined,
  project: undefined,
  orgId: undefined,
  setUser: () => {},
  setOrganization: () => {},
  setProject: () => {},
});

interface AppProviderProps {
  children: ReactNode;
  initialUser?: User;
  initialOrganization?: Organization;
}

export function AppProvider({ children, initialUser, initialOrganization }: AppProviderProps) {
  const [user, setUser] = useState<User>(initialUser!);
  const [organization, setOrganization] = useState<Organization | undefined>(initialOrganization!);
  const [project, setProject] = useState<Project | undefined>();
  const { setTheme } = useTheme();

  const currentOrgId = useMemo(() => organization?.name, [organization]);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setSentryUser({
        id: initialUser.uid || '',
        email: initialUser.email,
        sub: initialUser.sub,
        name:
          initialUser.givenName && initialUser.familyName
            ? `${initialUser.givenName} ${initialUser.familyName}`
            : undefined,
      });
    } else {
      clearSentryUser();
    }
  }, [initialUser]);

  const userPreferences = useMemo(() => {
    return {
      theme: user?.preferences?.theme ?? 'system',
      timezone: user?.preferences?.timezone ?? getBrowserTimezone(),
      newsletter: user?.preferences?.newsletter ?? true,
    };
  }, [user]);

  // Update theme when settings change
  useEffect(() => {
    setTheme(userPreferences.theme ?? 'system');
  }, [userPreferences.theme, setTheme]);

  return (
    <AppContext.Provider
      value={{
        user,
        userPreferences,
        organization,
        project,
        orgId: currentOrgId,
        setUser,
        setOrganization,
        setProject,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
