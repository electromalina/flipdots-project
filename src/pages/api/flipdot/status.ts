import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return status for flipdot caster
  // TODO: Track actual stats if needed
  res.json({
    live: {
      framesCaptured: 0,
      framesDispatched: 0,
      errors: 0,
      startedAt: null,
      lastError: null,
      frameIntervalMs: Math.round(1000 / 15), // 15 FPS
      uptimeMs: 0
    },
    latestFrame: null
  });
}

