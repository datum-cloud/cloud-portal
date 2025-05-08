import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { UserModel } from '@/resources/gql/models/user.model'
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'

interface AppContextType {
  user: UserModel | undefined
  organization: OrganizationModel | undefined
  orgId: string | undefined
  setUser: (user: UserModel) => void
  setOrganization: (organization: OrganizationModel) => void
}

const AppContext = createContext<AppContextType>({
  user: undefined,
  organization: undefined,
  orgId: undefined,
  setUser: () => {},
  setOrganization: () => {},
})

interface AppProviderProps {
  children: ReactNode
  initialUser?: UserModel
  initialOrganization?: OrganizationModel
}

export function AppProvider({
  children,
  initialUser,
  initialOrganization,
}: AppProviderProps) {
  const [user, setUser] = useState<UserModel | undefined>(initialUser)
  const [organization, setOrganization] = useState<OrganizationModel | undefined>(
    initialOrganization,
  )

  const updateUserData = (userData: UserModel) => {
    setUser(userData)
  }

  const updateOrganizationData = (orgData: OrganizationModel) => {
    setOrganization(orgData)
  }

  const orgId = useMemo(() => organization?.id, [organization])

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
    }
  }, [initialUser])

  return (
    <AppContext.Provider
      value={{
        user,
        organization,
        orgId,
        setUser: updateUserData,
        setOrganization: updateOrganizationData,
      }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
