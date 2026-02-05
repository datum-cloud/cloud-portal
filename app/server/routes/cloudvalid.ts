// app/server/routes/cloudvalid.ts
import type { Variables } from '../types';
import { CloudValidService } from '@/modules/cloudvalid';
import { CloudValidError } from '@/modules/cloudvalid/client';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

const cloudvalid = new Hono<{ Variables: Variables }>();

// DNS setup endpoint
cloudvalid.post('/dns', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { domain, dnsName, dnsContent, redirectUri } = body;

    if (!domain || !dnsName || !dnsContent) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const cloudValidService = new CloudValidService(env.server.cloudvalidApiKey);

    const dnsSetup = await cloudValidService.createDNSSetup({
      domain,
      template_id: env.server.cloudvalidTemplateId,
      variables: {
        dnsRecordName: dnsName,
        dnsRecordContent: dnsContent,
      },
      redirect_url: redirectUri ?? '',
    });

    return c.json({ success: true, data: dnsSetup.result });
  } catch (error) {
    console.error('CloudValid API error:', error);

    if (error instanceof CloudValidError) {
      return c.json(
        { success: false, error: error.message, errors: error.errors },
        (error.statusCode ?? 500) as 400 | 401 | 500
      );
    }
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export { cloudvalid as cloudvalidRoutes };
