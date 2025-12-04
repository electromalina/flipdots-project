import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function FlipdotPreview() {
  const [frame, setFrame] = useState<string | null>(null);
  const [frameNumber, setFrameNumber] = useState<number>(0);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const TARGET_FPS = 15;
  const FRAME_INTERVAL_MS = 1000 / TARGET_FPS; // 66.666...ms for exact 15 FPS

  const fetchLatestFrame = async () => {
    try {
      // Add timeout to prevent hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch('/api/flipdot/latest-frame', {
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setFrame(data.dataUrl);
        setFrameNumber(data.frameNumber);
        setError(null);
      } else if (response.status === 404) {
        setError('No frames available yet. Start casting from the gallery room!');
        setFrame(null);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Timeout - don't show error, just skip this fetch
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch frame');
      setFrame(null);
    }
  };

  const fetchStats = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch('/api/flipdot/status', {
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch stats', err);
      }
    }
  };

  useEffect(() => {
    fetchLatestFrame();
    fetchStats();

    if (!autoRefresh) {
      return;
    }

    // Simple setTimeout loop for exact 15 FPS - no intervals, no requestAnimationFrame
    let timeoutId: NodeJS.Timeout;
    let nextFetchTime = performance.now();

    const scheduleNext = () => {
      if (!autoRefresh) {
        return;
      }

      fetchLatestFrame();
      fetchStats();

      // Calculate next fetch time
      nextFetchTime += FRAME_INTERVAL_MS;
      const waitTime = nextFetchTime - performance.now();
      
      if (waitTime > 0) {
        timeoutId = setTimeout(scheduleNext, waitTime);
      } else {
        // If behind schedule, catch up
        nextFetchTime = performance.now() + FRAME_INTERVAL_MS;
        timeoutId = setTimeout(scheduleNext, FRAME_INTERVAL_MS);
      }
    };

    timeoutId = setTimeout(scheduleNext, FRAME_INTERVAL_MS);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [autoRefresh]);

  return (
    <>
      <Head>
        <title>Flipdot Preview - Live Cast Frames</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        background: '#000',
        color: '#fff',
        fontFamily: 'monospace',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <h1 style={{ margin: 0, textAlign: 'center' }}>🎨 Flipdot Live Preview</h1>
        
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Auto-refresh (15 FPS)</span>
          </label>
          
          <button
            onClick={fetchLatestFrame}
            style={{
              padding: '8px 16px',
              background: '#fff',
              color: '#000',
              border: '2px solid #fff',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}
          >
            Refresh Now
          </button>
        </div>

        {stats && (
          <div style={{
            background: '#111',
            border: '1px solid #333',
            padding: '12px 20px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <div>Frames: {stats.live.framesCaptured} | Uptime: {Math.round(stats.live.uptimeMs / 1000)}s</div>
            {frameNumber > 0 && <div>Current Frame: #{frameNumber}</div>}
          </div>
        )}

        {error && (
          <div style={{
            background: '#330000',
            border: '1px solid #ff0000',
            padding: '12px 20px',
            borderRadius: '4px',
            color: '#ff6666'
          }}>
            {error}
          </div>
        )}

        {frame ? (
          <div style={{
            border: '2px solid #fff',
            padding: '10px',
            background: '#111',
            display: 'inline-block'
          }}>
            <img
              src={frame}
              alt={`Flipdot frame #${frameNumber}`}
              style={{
                imageRendering: 'pixelated',
                display: 'block',
                maxWidth: '100%',
                height: 'auto'
              }}
            />
            <div style={{
              marginTop: '10px',
              textAlign: 'center',
              fontSize: '0.9em',
              color: '#999'
            }}>
              Frame #{frameNumber} | 84×28 pixels
            </div>
          </div>
        ) : !error && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666'
          }}>
            Loading frame...
          </div>
        )}

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '0.85em',
          color: '#666'
        }}>
          <p>Start casting from <a href="/gallery/room.html" style={{ color: '#fff' }}>the gallery room</a> to see frames here!</p>
          <p>This preview updates automatically at 15 FPS when casting is active.</p>
        </div>
      </div>
    </>
  );
}

