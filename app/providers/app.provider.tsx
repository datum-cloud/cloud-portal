import { IOrganization } from '@/resources/interfaces/organization.inteface';
import { IUser } from '@/resources/interfaces/user.interface';
import { ReactNode, createContext, useContext, useState } from 'react';

interface AppContextType {
  isAuthenticated: boolean;
  user: IUser | null;
  organization: IOrganization | null;
  token: string | null;
  setUser: (user: IUser | null) => void;
  setOrganization: (organization: IOrganization | null) => void;
  setToken: (token: string | null) => void;
}

const AppContext = createContext<AppContextType>({
  isAuthenticated: false,
  user: null,
  organization: null,
  token: null,
  setUser: () => {},
  setOrganization: () => {},
  setToken: () => {},
});

interface AppProviderProps {
  children: ReactNode;
  user?: IUser;
  token?: string;
  organization?: IOrganization;
}

export function AppProvider({ children, user, token, organization }: AppProviderProps) {
  const [userState, setUserState] = useState<IUser | null>(user ?? null);
  const [organizationState, setOrganizationState] = useState<IOrganization | null>(
    organization ?? null
  );
  const [tokenState, setTokenState] = useState<string | null>(token ?? null);

  return (
    <AppContext.Provider
      value={{
        isAuthenticated: !!tokenState,
        user: userState,
        token: tokenState,
        organization: organizationState,
        setUser: setUserState,
        setToken: setTokenState,
        setOrganization: setOrganizationState,
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
