import { HttpRouteRuleSchema, HttpRouteSchema } from '../schemas/http-route.schema'
import { ILabel } from './label.interface'

export interface IHttpRouteControlResponseLite {
  uid?: string
  name?: string
  createdAt?: Date
}

export interface IHttpRouteRuleControlResponse {
  matches?: HttpRouteRuleSchema['matches']
  backendRefs?: HttpRouteRuleSchema['backendRefs']
  filters?: HttpRouteRuleSchema['filters']
}

export interface IHttpRouteControlResponse {
  uid?: string
  resourceVersion?: string
  namespace?: string
  name?: string
  labels?: ILabel
  annotations?: ILabel
  createdAt?: Date

  // Spec Section
  parentRefs?: HttpRouteSchema['parentRefs']
  rules?: IHttpRouteRuleControlResponse[]
}

export enum HTTPPathMatchType {
  EXACT = 'Exact',
  PATH_PREFIX = 'PathPrefix',
  REGULAR_EXPRESSION = 'RegularExpression',
}

export enum HTTPFilterType {
  // REQUEST_HEADER_MODIFIER = 'RequestHeaderModifier',
  // REQUEST_REDIRECT = 'RequestRedirect',
  URL_REWRITE = 'URLRewrite',
}

export enum HTTPPathRewriteType {
  REPLACE_FULL_PATH = 'ReplaceFullPath',
  REPLACE_PREFIX_MATCH = 'ReplacePrefixMatch',
}
