export interface IWorkloadControlResponse {
  name?: string
  namespace?: string
  createdAt?: Date
  uid?: string
  resourceVersion?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec?: any
}
