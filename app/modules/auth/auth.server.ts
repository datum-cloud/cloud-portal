import { zitadelStrategy } from './strategies/zitadel.server'
import { IAuthSession } from '@/resources/interfaces/auth.interface'
import { Authenticator } from 'remix-auth'

export const authenticator = new Authenticator<IAuthSession>()

// Register the OAuth2 strategy with the authenticator
authenticator.use(zitadelStrategy, 'zitadel')
