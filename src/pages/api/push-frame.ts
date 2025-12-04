import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Proxy endpoint for flipdot frame pushing
 * This routes requests to the flipdot-caster service
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get flipdot-caster service URL from environment or use default
    const flipdotCasterUrl = process.env.FLIPDOT_CASTER_URL || 'http://localhost:4000';
    
    const { dataUrl, imageBase64, meta } = req.body ?? {};
    
    if (!dataUrl && !imageBase64) {
      return res.status(400).json({ error: 'Missing frame data (dataUrl or imageBase64 required)' });
    }

    // Proxy the request to the flipdot-caster service
    const response = await fetch(`${flipdotCasterUrl}/api/push-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dataUrl, imageBase64, meta }),
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
    console.error('[flipdot] push-frame proxy error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to proxy frame to flipdot caster',
      hint: 'Make sure FLIPDOT_CASTER_URL is set or flipdot-caster service is running'
    });
  }
}

