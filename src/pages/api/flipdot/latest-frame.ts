import { NextApiRequest, NextApiResponse } from 'next';
import { getLatestFrame } from '@/lib/flipdot/frameStore';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const frame = getLatestFrame();
  
  if (!frame) {
    return res.status(404).json({ error: 'No frames available yet' });
  }

  // Return the frame data URL
  res.json({
    dataUrl: frame.dataUrl,
    frameNumber: frame.frameNumber,
    timestamp: frame.timestamp,
    size: frame.size
  });
}

