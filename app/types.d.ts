// Enable absolute imports from the root directory
declare module '@/*'

// Import required types
import 'react-router'
import { APIFactory } from '@/resources/api/api-factory'
import { ControlPlaneFactory } from '@/resources/control-plane/control-factory'
import { GqlFactory } from '@/resources/gql/gql-factory'

/**
 * Extend the React Router AppLoadContext interface to include our custom factories
 */
declare module 'react-router' {
  interface AppLoadContext extends APIFactory, ControlPlaneFactory, GqlFactory {
    // Add any additional context properties here
  }
}
