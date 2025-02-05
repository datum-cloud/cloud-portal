import { Authenticator } from 'remix-auth'
import { IUser } from '@/resources/interfaces/user.interface'
import { GitHubStrategy } from 'remix-auth-github'
import { OAuth2Strategy } from 'remix-auth-oauth2'

export let authenticator = new Authenticator<IUser>()

authenticator
  .use(
    new GitHubStrategy(
      {
        clientId: process.env.AUTH_GITHUB_ID ?? '',
        clientSecret: process.env.AUTH_GITHUB_SECRET ?? '',
        redirectURI: `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/github/callback`,
        scopes: ['user:email'], // optional
      },
      async ({ tokens, request }) => {
        // here you can use the params above to get the user and return it
        // what you do inside this and how you find the user is up to you
        return {
          id: '1',
          email: 'test@test.com',
          name: 'Test User',
        }
      },
    ),
    // this is optional, but if you setup more than one GitHub instance you will
    // need to set a custom name to each one, by default is "github"
    'github',
  )
  .use(
    new OAuth2Strategy(
      {
        clientId: process.env.AUTH_GOOGLE_ID ?? '',
        clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
        redirectURI: `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/google/callback`,
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        scopes: ['email', 'profile', 'openid'],
      },
      async (params) => {
        console.log(params)
        // here you can use the params above to get the user and return it
        // what you do inside this and how you find the user is up to you
        return {
          id: '1',
          email: 'test@test.com',
          name: 'Test User',
        }
      },
    ),
    'google',
  )
