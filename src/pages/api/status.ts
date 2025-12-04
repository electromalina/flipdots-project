import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Proxy endpoint for flipdot caster status
 * This routes requests to the flipdot-caster service
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get flipdot-caster service URL from environment or use default
    const flipdotCasterUrl = process.env.FLIPDOT_CASTER_URL || 'http://localhost:4000';
    
    // Proxy the request to the flipdot-caster service
    const response = await fetch(`${flipdotCasterUrl}/api/status`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-store',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return res.status(response.status).json({ 
        error: `Flipdot caster error: ${errorText}` 
      });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[flipdot] status proxy error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get flipdot caster status',
      hint: 'Make sure FLIPDOT_CASTER_URL is set or flipdot-caster service is running'
    });
  }
}

