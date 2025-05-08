export interface IHttpRouteControlResponseLite {
  uid?: string
  name?: string
  createdAt?: Date
}

export interface IHttpRouteControlResponse {
  uid?: string
  resourceVersion?: string
  namespace?: string
  name?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
  createdAt?: Date
}

export enum HTTPPathMatchType {
  EXACT = 'Exact',
  PATH_PREFIX = 'PathPrefix',
  REGULAR_EXPRESSION = 'RegularExpression',
}

export enum HTTPFilterType {
  REQUEST_HEADER_MODIFIER = 'RequestHeaderModifier',
  REQUEST_REDIRECT = 'RequestRedirect',
  URL_REWRITE = 'URLRewrite',
}

export enum HTTPPathRewriteType {
  REPLACE_FULL_PATH = 'ReplaceFullPath',
  REPLACE_PREFIX_MATCH = 'ReplacePrefixMatch',
}
