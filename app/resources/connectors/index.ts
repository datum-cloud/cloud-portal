export {
  connectorResourceSchema,
  type Connector,
  connectorListSchema,
  type ConnectorList,
} from './connector.schema';

export { toConnector, toConnectorList } from './connector.adapter';

export {
  createConnectorService,
  connectorKeys,
  CONNECTOR_SYNC_KIND,
  type ConnectorService,
} from './connector.service';

export { useConnector, useConnectors, useDeleteConnector } from './connector.queries';

export { useConnectorWatch, useConnectorsWatch } from './connector.watch';
