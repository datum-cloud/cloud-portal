import { createContextGenerator } from '../context';
import { Hono } from 'hono';
import { SecureHeadersVariables } from 'hono/secure-headers';
import { createGetLoadContext, createHonoServer } from 'react-router-hono-server/bun';

export const bunAdapter = async (app: Hono<{ Variables: SecureHeadersVariables }>) => {
  const getLoadContext = createContextGenerator(createGetLoadContext as any);

  return createHonoServer({
    app,
    getLoadContext,
  });
};
