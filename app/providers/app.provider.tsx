import { IOrganization } from '@/resources/interfaces/organization.interface';
import { IUser } from '@/resources/interfaces/user.interface';
import { ReactNode, createContext, useContext, useEffect, useState, useMemo } from 'react';

interface AppContextType {
  user: IUser | undefined;
  organization: IOrganization | undefined;
  orgId: string | undefined;
  setUser: (user: IUser) => void;
  setOrganization: (organization: IOrganization) => void;
}

const AppContext = createContext<AppContextType>({
  user: undefined,
  organization: undefined,
  orgId: undefined,
  setUser: () => {},
  setOrganization: () => {},
});

interface AppProviderProps {
  children: ReactNode;
  initialUser?: IUser;
  initialOrganization?: IOrganization;
}

export function AppProvider({ children, initialUser, initialOrganization }: AppProviderProps) {
  const [user, setUser] = useState<IUser>(initialUser!);
  const [organization, setOrganization] = useState<IOrganization | undefined>(initialOrganization!);

  const updateUserData = (userData: IUser) => {
    setUser(userData);
  };

  const updateOrganizationData = (orgData: IOrganization) => {
    setOrganization(orgData);
  };

  const currentOrgId = useMemo(() => organization?.name, [organization]);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser]);

  return (
    <AppContext.Provider
      value={{
        user,
        organization,
        orgId: currentOrgId,
        setUser: updateUserData,
        setOrganization: updateOrganizationData,
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
