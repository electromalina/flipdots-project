/**
 * Minimal Node helper for consuming a raw flipdot byte stream from
 * a Next.js `/api/stream`-style endpoint and turning it into per-frame buffers.
 *
 * This file is written as an ES module so it works inside the
 * `flipdot-caster` package, which is `"type": "module"`.
 *
 * You can:
 *   - import { connectToStream } from './flipdot-connector.js';
 *   - or run it directly with `node src/flipdot-connector.js` to see frames.
 *
 * NOTE: This helper is transport‑agnostic; it does not know about your
 * specific flipdot protocol. Implement `sendFrameToFlipdot(frameBytes)`
 * to actually drive your hardware.
 */

import http from 'node:http';

/**
 * Connect to the streaming endpoint and receive frames.
 *
 * @param {Object} options
 * @param {string} [options.host="localhost"] - Host where your Next app runs.
 * @param {number} [options.port=3000] - Port where your Next app runs.
 * @param {string} [options.path="/api/stream"] - Path to the streaming endpoint.
 * @param {string} [options.animationType="logo"] - Animation query param.
 * @param {number} [options.width=84] - Display width in pixels.
 * @param {number} [options.height=28] - Display height in pixels.
 * @param {(frame: Uint8Array) => void} options.onFrame - Called for each frame.
 * @returns {() => void} A function you can call to close the connection.
 */
export function connectToStream(options = {}) {
  const {
    host = 'localhost',
    port = 3000,
    path = '/api/stream',
    animationType = 'logo',
    width = 84,
    height = 28,
    onFrame
  } = options;

  if (typeof onFrame !== 'function') {
    throw new Error('connectToStream: `onFrame` callback is required');
  }

  const frameSize = width * height; // 1 byte per pixel
  let bufferAccumulator = Buffer.alloc(0);

  const streamPath =
    animationType != null
      ? `${path}?animationType=${encodeURIComponent(animationType)}`
      : path;

  const req = http.get(
    {
      host,
      port,
      path: streamPath,
      method: 'GET',
      headers: {
        Accept: 'application/octet-stream'
      }
    },
    (res) => {
      if (res.statusCode !== 200) {
        console.error(
          `Stream request failed with status ${res.statusCode}: ${res.statusMessage}`
        );
        res.resume();
        return;
      }

      res.on('data', (chunk) => {
        // Append new data to accumulator
        bufferAccumulator = Buffer.concat([bufferAccumulator, chunk]);

        // Process complete frames
        while (bufferAccumulator.length >= frameSize) {
          const frame = bufferAccumulator.subarray(0, frameSize);
          bufferAccumulator = bufferAccumulator.subarray(frameSize);

          // Expose as Uint8Array for consumers
          onFrame(new Uint8Array(frame));
        }
      });

      res.on('end', () => {
        console.log('Stream ended');
      });
    }
  );

  req.on('error', (err) => {
    console.error('Error connecting to stream:', err);
  });

  // Return a function to close the connection from the outside
  return () => {
    req.destroy();
  };
}

/**
 * Example placeholder: adapt this to your flipdot hardware.
 *
 * This function is called with a Uint8Array of length width*height,
 * where each value is 0 (black) or 255 (white).
 *
 * Here you can:
 *   - pack bits into bytes if your controller expects bitmaps,
 *   - map rows/columns,
 *   - and send bytes via serial/TCP/whatever your controller uses.
 *
 * @param {Uint8Array} frameBytes
 */
export function sendFrameToFlipdot(frameBytes) {
  // TODO: Replace this with your actual flipdot protocol implementation.
  // For now, we just log the first few pixels so you can see it's working.
  const preview = Array.from(frameBytes.slice(0, 32));
  console.log('Received frame, first 32 pixels:', preview);
}

// If this file is run directly (`node src/flipdot-connector.js`),
// start a demo connection that logs frames.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    'Connecting to http://localhost:3000/api/stream?animationType=logo ...'
  );

  const stop = connectToStream({
    onFrame: (frame) => {
      sendFrameToFlipdot(frame);
    }
  });

  // Graceful shutdown on Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nStopping stream...');
    stop();
    process.exit(0);
  });
}


