import { NextApiRequest, NextApiResponse } from 'next';
import { getStats } from '@/lib/flipdot/frameStore';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stats = getStats();

  res.json({
    live: {
      framesCaptured: stats.totalFrames,
      framesDispatched: stats.totalFrames,
      errors: 0,
      startedAt: stats.oldestFrame,
      lastError: null,
      frameIntervalMs: Math.round(1000 / 15), // 15 FPS
      uptimeMs: stats.oldestFrame ? Date.now() - stats.oldestFrame : 0
    },
    latestFrame: stats.latestFrame ? {
      frameNumber: stats.latestFrame.frameNumber,
      timestamp: stats.latestFrame.timestamp,
      size: stats.latestFrame.size
    } : null
  });
}

