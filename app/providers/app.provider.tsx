import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { IUser, IUserPreferences } from '@/resources/interfaces/user.interface';
import { getBrowserTimezone } from '@/utils/helpers/timezone.helper';
import { clearSentryUser, setSentryUser } from '@/utils/logger';
import { ReactNode, createContext, useContext, useEffect, useState, useMemo } from 'react';

interface AppContextType {
  user: IUser | undefined;
  userPreferences: IUserPreferences | undefined;
  organization: IOrganization | undefined;
  project: IProjectControlResponse | undefined;
  orgId: string | undefined;
  setUser: (user: IUser) => void;
  setOrganization: (organization: IOrganization) => void;
  setProject: (project: IProjectControlResponse) => void;
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
  initialUser?: IUser;
  initialOrganization?: IOrganization;
}

export function AppProvider({ children, initialUser, initialOrganization }: AppProviderProps) {
  const [user, setUser] = useState<IUser>(initialUser!);
  const [organization, setOrganization] = useState<IOrganization | undefined>(initialOrganization!);
  const [project, setProject] = useState<IProjectControlResponse | undefined>();

  const currentOrgId = useMemo(() => organization?.name, [organization]);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setSentryUser(initialUser);
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
