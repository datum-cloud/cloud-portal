export class CustomError extends Error {
  code: number
  statusText: string

  constructor(message: string, code: number, cause?: Error) {
    super(message)
    this.name = 'CustomError'
    this.code = code
    this.statusText = message
    this.cause = cause

    if (process.env.NODE_ENV === 'development') {
      console.error(cause)
    }
  }
}
