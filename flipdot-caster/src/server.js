import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  captureConfig,
  boardConfig,
  transportConfig,
  liveConfig
} from './config.js';
import { captureRoomFrames } from './captureRoom.js';
import { encodeForFlipdot } from './flipdotEncoder.js';
import { dispatchFrame } from './flipdotTransport.js';
import { LiveCaptureService } from './liveCaptureService.js';

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(enableCors);

const framesDir = resolveFromProject(liveConfig.outputDir);
const publicDir = resolveFromProject('public');

const liveService = new LiveCaptureService({
  roomUrl: liveConfig.roomUrl,
  viewport: liveConfig.viewport,
  selector: liveConfig.selector,
  frameRate: liveConfig.frameRate,
  outputDir: framesDir,
  retainFrames: liveConfig.retainFrames,
  boardConfig,
  transportConfig
});

liveService.start().catch((error) => {
  console.error('[flipdot] failed to start live capture loop', error);
  process.exit(1);
});

app.use('/frames', express.static(framesDir, { cacheControl: false, etag: false }));
app.use(express.static(publicDir));

app.post('/api/push-frame', async (req, res) => {
  try {
    const { dataUrl, imageBase64, meta } = req.body ?? {};
    const base64Payload = extractBase64(dataUrl, imageBase64);

    if (!base64Payload) {
      return res.status(400).json({ error: 'Missing frame data' });
    }

    const frameBuffer = Buffer.from(base64Payload, 'base64');
    const payload = await encodeForFlipdot(frameBuffer, boardConfig);
    await dispatchFrame(payload, { transport: boardConfig.transport, transportConfig });

    res.json({
      success: true,
      bytes: payload.length,
      transport: boardConfig.transport,
      meta: meta ?? null
    });
  } catch (error) {
    console.error('[flipdot] push-frame failed', error);
    res.status(500).json({ error: error.message ?? 'Failed to dispatch frame' });
  }
});
app.post('/api/push-room', async (req, res) => {
  const overrides = req.body ?? {};
  const captureOptions = {
    ...captureConfig,
    ...pick(overrides, ['frames', 'frameDelayMs', 'viewport', 'roomUrl', 'selector']),
    outputDir: overrides.saveFramesTo
      ? resolveFromProject(overrides.saveFramesTo)
      : undefined
  };

  try {
    const captured = await captureRoomFrames(captureOptions);

    for (const frame of captured) {
      const payload = await encodeForFlipdot(frame.buffer, boardConfig);
      await dispatchFrame(payload, { transport: boardConfig.transport, transportConfig });
    }

    res.json({
      framesSent: captured.length,
      savedFrames: captured.map((frame) => frame.filePath).filter(Boolean)
    });
  } catch (error) {
    console.error('[flipdot] capture pipeline failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    live: liveService.getStats(),
    latestFrame: liveService.getLatestFrame()
      ? {
          capturedAt: liveService.getLatestFrame().capturedAt,
          filePath: liveService.getLatestFrame().filePath
        }
      : null
  });
});

app.get('/frames/latest.png', (req, res) => {
  const latest = liveService.getLatestFrame();
  if (!latest) {
    return res.status(404).json({ error: 'No frames captured yet' });
  }
  res.set('content-type', 'image/png');
  res.set('cache-control', 'no-store');
  return res.send(latest.buffer);
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Flipdot room streamer listening on http://localhost:${port}`);
});

function enableCors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
}
function pick(source, keys) {
  return keys.reduce((acc, key) => {
    if (source[key] !== undefined) {
      acc[key] = source[key];
    }
    return acc;
  }, {});
}

function resolveFromProject(relativePath) {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dirname, '..', relativePath);
}

function extractBase64(dataUrl, imageBase64) {
  if (typeof imageBase64 === 'string' && imageBase64.trim().length > 0) {
    return imageBase64.trim();
  }
  if (typeof dataUrl === 'string') {
    const parts = dataUrl.split(',');
    return parts.length > 1 ? parts[1] : parts[0];
  }
  return null;
}
async function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  await liveService.stop().catch((error) => {
    console.error('[flipdot] failed to stop live capture', error);
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

