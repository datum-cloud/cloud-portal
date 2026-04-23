import { TableClient } from './table-client'
import { TableServer } from './table-server'
import type { TableClientProps } from './table-client'
import type { TableServerProps } from './table-server'

export const Table = {
  Client: TableClient,
  Server: TableServer,
}

export type { TableClientProps, TableServerProps }
