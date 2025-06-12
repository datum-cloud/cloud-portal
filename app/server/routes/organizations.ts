import { isAuthenticatedMiddleware, apiClientMiddleware } from './middleware';
import { Variables } from './middleware';
import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api';
import { Hono } from 'hono';

const ORGANIZATIONS_BASENAME = '/organizations';

// Create organizations Hono app
const organizations = new Hono<{
  Variables: Variables;
}>();

// Apply authentication middleware to all routes
organizations.use('*', isAuthenticatedMiddleware);

// Apply API client middleware to all routes
organizations.use('*', apiClientMiddleware);

// Get all organizations
organizations.get('/', async (c) => {
  try {
    // Use the API client from the context
    const apiClient = c.get('apiClient');
    const orgs = await iamOrganizationsAPI(apiClient).list();

    return c.json({
      success: true,
      data: orgs,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch organizations',
      },
      500
    );
  }
});

// Get organization by ID
organizations.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    // Use the API client from the context
    const apiClient = c.get('apiClient');
    const org = await iamOrganizationsAPI(apiClient).detail(id);

    return c.json({
      success: true,
      data: org,
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch organization',
      },
      500
    );
  }
});

// Create organization
organizations.post('/', async (c) => {
  try {
    const body = await c.req.json();
    // Here you would create a new organization in your data source
    // For example: const newOrg = await organizationsService.create(body);

    return c.json(
      {
        organization: { id: '3', name: body.name },
      },
      201
    );
  } catch (error) {
    console.error('Error creating organization:', error);
    return c.json({ error: 'Failed to create organization' }, 500);
  }
});

// Update organization
organizations.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    // Here you would update the organization in your data source
    // For example: const updatedOrg = await organizationsService.update(id, body);

    return c.json({
      organization: { id, name: body.name },
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return c.json({ error: 'Failed to update organization' }, 500);
  }
});

// Delete organization
organizations.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    // Here you would delete the organization from your data source
    // For example: await organizationsService.delete(id);

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Error deleting organization:', error);
    return c.json({ error: 'Failed to delete organization' }, 500);
  }
});

export { organizations, ORGANIZATIONS_BASENAME };
