import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dataUrl, imageBase64, meta } = req.body ?? {};
    
    // Extract base64 from data URL if provided
    let base64Data = imageBase64;
    if (!base64Data && typeof dataUrl === 'string') {
      const parts = dataUrl.split(',');
      base64Data = parts.length > 1 ? parts[1] : parts[0];
    }

    if (!base64Data) {
      return res.status(400).json({ error: 'Missing frame data' });
    }

    // TODO: Process frame with flipdot encoder and send to board
    // For now, just acknowledge receipt
    console.log('[flipdot] Received frame', {
      frameNumber: meta?.frameNumber,
      timestamp: meta?.timestamp,
      dataSize: base64Data.length
    });

    res.json({
      success: true,
      bytes: Math.ceil(base64Data.length * 0.75), // Approximate decoded size
      transport: 'http',
      meta: meta ?? null
    });
  } catch (error) {
    console.error('[flipdot] push-frame failed', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process frame' 
    });
  }
}

