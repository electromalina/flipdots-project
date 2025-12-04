// Simple in-memory frame store for preview
// In production, you might want to use Redis or a database

interface FrameData {
  dataUrl: string;
  frameNumber: number;
  timestamp: number;
  size: number;
}

let latestFrame: FrameData | null = null;
let frameStats = {
  totalFrames: 0,
  oldestFrame: null as number | null,
  latestFrameTimestamp: null as number | null
};

export function storeFrame(dataUrl: string, meta?: { frameNumber?: number; timestamp?: number }) {
  const frameNumber = meta?.frameNumber ?? frameStats.totalFrames + 1;
  const timestamp = meta?.timestamp ?? Date.now();
  
  latestFrame = {
    dataUrl,
    frameNumber,
    timestamp,
    size: dataUrl.length
  };

  frameStats.totalFrames += 1;
  if (!frameStats.oldestFrame) {
    frameStats.oldestFrame = timestamp;
  }
  frameStats.latestFrameTimestamp = timestamp;
}

export function getLatestFrame(): FrameData | null {
  return latestFrame;
}

export function getStats() {
  return {
    totalFrames: frameStats.totalFrames,
    oldestFrame: frameStats.oldestFrame,
    latestFrame: latestFrame ? {
      frameNumber: latestFrame.frameNumber,
      timestamp: latestFrame.timestamp,
      size: latestFrame.size
    } : null
  };
}

export function clearFrames() {
  latestFrame = null;
  frameStats = {
    totalFrames: 0,
    oldestFrame: null,
    latestFrameTimestamp: null
  };
}

