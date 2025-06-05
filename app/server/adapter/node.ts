import { createContextGenerator } from '../context';
import { Hono } from 'hono';
import { SecureHeadersVariables } from 'hono/secure-headers';
import {
  createHonoServer as createNodeHonoServer,
  createGetLoadContext as createNodeGetLoadContext,
} from 'react-router-hono-server/node';

export const nodeAdapter = async (app: Hono<{ Variables: SecureHeadersVariables }>) => {
  const getLoadContext = createContextGenerator(createNodeGetLoadContext as any);

  return createNodeHonoServer({
    app,
    getLoadContext,
  });
};
