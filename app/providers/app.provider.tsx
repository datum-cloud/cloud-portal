import { OrganizationModel } from '@/resources/gql/models/organization.model'
import { IOidcUser } from '@/resources/interfaces/auth.interface'
import { ReactNode, createContext, useContext, useEffect, useState, useMemo } from 'react'

interface AppContextType {
  user: IOidcUser | undefined
  organization: OrganizationModel | undefined
  orgId: string | undefined
  setUser: (user: IOidcUser) => void
  setOrganization: (organization: OrganizationModel) => void
}

const AppContext = createContext<AppContextType>({
  user: undefined,
  organization: undefined,
  orgId: undefined,
  setUser: () => { },
  setOrganization: () => { },
})

interface AppProviderProps {
  children: ReactNode
  initialUser?: IOidcUser
  initialOrganization?: OrganizationModel
}

export function AppProvider({
  children,
  initialUser,
  initialOrganization,
}: AppProviderProps) {
  const [user, setUser] = useState<IOidcUser | undefined>(initialUser)
  const [organization, setOrganization] = useState<OrganizationModel | undefined>(
    initialOrganization,
  )

  const updateUserData = (userData: IOidcUser) => {
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
