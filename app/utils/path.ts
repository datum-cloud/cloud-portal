type Param = string | number | boolean | string[] | null | undefined

type QueryParams = Record<string, Param>

function toString(val: Param): string {
  if (val === null || typeof val === 'undefined') {
    return ''
  }

  return Array.isArray(val) ? val.join(',') : val?.toString()
}

export function getPathWithParams(path: string, params: QueryParams = {}) {
  return Object.entries(params).reduce((prev, [key, value]) => {
    return (
      prev
        // /my/[dynamic]/path
        .replace(`[${key}]`, encodeURIComponent(toString(value)))
        // /my/:dynamic/path
        .replace(`:${key}`, encodeURIComponent(toString(value)))
    )
  }, path)
}
