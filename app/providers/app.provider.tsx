import { createContext, useContext, ReactNode, useState } from 'react'
import { UserModel } from '@/resources/gql/models/user.model'
import { OrganizationModel } from '@/resources/gql/models/organization.model'

interface AppContextType {
  user: UserModel | undefined
  organization: OrganizationModel | undefined
  setUser: (user: UserModel) => void
  setOrganization: (organization: OrganizationModel) => void
}

const AppContext = createContext<AppContextType>({
  user: undefined,
  organization: undefined,
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
    setUser((currentUser) => {
      if (!currentUser) return undefined
      return { ...currentUser, ...userData }
    })
  }

  const updateOrganizationData = (orgData: OrganizationModel) => {
    setOrganization((currentOrg) => {
      if (!currentOrg) return undefined
      return { ...currentOrg, ...orgData }
    })
  }

  return (
    <AppContext.Provider
      value={{
        user,
        organization,
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
