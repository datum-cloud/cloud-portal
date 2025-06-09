import { organizations } from './organizations';
import { APIFactory } from '@/resources/api/api-factory.server';
import { apiClientMiddleware } from './middleware';
import { Hono } from 'hono';

// Define our app with the Variables type
type Variables = {
  apiClient: APIFactory;
};

const API_BASENAME = '/api';

// Create an API Hono app
const api = new Hono<{
  Variables: Variables;
}>();

// Apply API client middleware to all routes
api.use('*', apiClientMiddleware);

api.get('/', async (c) => {
  return c.json({ message: 'Hello from the API' });
});

api.route('/organizations', organizations);

export { api, API_BASENAME };
