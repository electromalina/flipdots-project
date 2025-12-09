import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>Flipboard Slack API</title>
        <meta name="description" content="Slack app for uploading flipboard GitHub links" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <div className="logo-container">
          <img src="/gallery/logo.png" alt="ROOM" className="logo" />
        </div>

        <h1>🎮 Flipboard Slack API</h1>
        <p className="subtitle">Homepage for the Room and Slack API checks</p>

        <div className="buttons-container">
          <a href="/gallery/room.html" className="main-button btn-primary">
            Enter the Room
          </a>

          <div className="secondary-buttons">
            <Link href="/api">API Endpoints</Link>
            <Link href="/api/health">API Health Check</Link>
          </div>
        </div>

        <div className="features">
          <div className="feature-card">
            <h3>⚡ Slack Integration</h3>
            <p>Use <code>/upload-flipboard</code> command in Slack to share GitHub repositories</p>
          </div>

          <div className="feature-card">
            <h3>📊 Dashboard</h3>
            <p>View all uploaded repositories with user information and timestamps</p>
          </div>

          <div className="feature-card">
            <h3>🔗 GitHub Links</h3>
            <p>Automatic validation and parsing of GitHub repository URLs</p>
          </div>
        </div>

        <div className="endpoints">
          <h2>Available Endpoints</h2>
          <div className="endpoint-list">
            <div className="endpoint-item">
              <span className="method get">GET</span>
              <Link href="/api" className="endpoint-url">/api</Link>
              <span className="endpoint-desc">API information</span>
            </div>
            <div className="endpoint-item">
              <span className="method get">GET</span>
              <Link href="/api/health" className="endpoint-url">/api/health</Link>
              <span className="endpoint-desc">Health check</span>
            </div>
            <div className="endpoint-item">
              <span className="method post">POST</span>
              <span className="endpoint-url">/api/slack/events</span>
              <span className="endpoint-desc">Slack slash command handler</span>
            </div>
            <div className="endpoint-item">
              <span className="method get">GET</span>
              <Link href="/api/uploads" className="endpoint-url">/api/uploads</Link>
              <span className="endpoint-desc">Upload history (JSON)</span>
            </div>
            <div className="endpoint-item">
              <span className="method get">GET</span>
              <Link href="/dashboard" className="endpoint-url">/dashboard</Link>
              <span className="endpoint-desc">Upload dashboard (UI)</span>
            </div>
            <div className="endpoint-item">
              <span className="method get">GET</span>
              <a href="/gallery/room.html" className="endpoint-url">/gallery/room.html</a>
              <span className="endpoint-desc">3D Gallery Room</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #000000;
          min-height: 100vh;
        }

        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .logo {
          max-width: 300px;
          height: auto;
        }

        h1 {
          color: #2c3e50;
          text-align: center;
          margin-bottom: 10px;
          font-size: 2.4em;
        }

        .subtitle {
          text-align: center;
          color: #cccccc;
          font-size: 1.2em;
          margin-bottom: 30px;
        }

        .buttons-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .main-button {
          background: #04626C !important;
          color: #ffffff !important;
          padding: 20px 50px !important;
          border-radius: 16px !important;
          text-decoration: none !important;
          font-weight: 700 !important;
          font-size: 1.1em !important;
          text-align: center !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4) !important;
          border: 3px solid #04626C !important;
          min-width: 250px !important;
          display: inline-block !important;
          cursor: pointer !important;
        }

        .secondary-buttons {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .feature-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }

        .endpoints {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin: 20px 0;
        }

        .endpoint-list { display: flex; flex-direction: column; gap: 10px; }

        .method { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .method.get { background: #27ae60; color: white; }
        .method.post { background: #e74c3c; color: white; }

        .endpoint-url { font-family: 'Monaco', monospace; color: #3498db; }

        code { background: #1a1a1a; color: #04626C; padding: 2px 6px; border-radius: 4px; }

        @media (max-width: 768px) {
          .container { padding: 20px 15px; }
          .main-button { min-width: 200px; padding: 14px 28px; }
          .features { grid-template-columns: 1fr; }
        }
      `}</style>

      <style jsx global>{`
        body { margin: 0; padding: 0; background: #000000; }
        * { box-sizing: border-box; }
      `}</style>
    </>
  );
}
        .main-button {
          background: #04626C !important;
          color: #ffffff !important;
          padding: 20px 50px !important;
          border-radius: 16px !important;
          text-decoration: none !important;
          font-weight: 700 !important;
          font-size: 1.3em !important;
          text-align: center !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4) !important;
          border: 3px solid #04626C !important;
          min-width: 250px !important;
          display: inline-block !important;
          cursor: pointer !important;
          max-width: 350px !important;
        }

        .main-button:hover {
          background: #057a87 !important;
          border-color: #057a87 !important;
          transform: translateY(-4px) !important;
          box-shadow: 0 8px 16px rgba(4, 98, 108, 0.5) !important;
        }

        .main-button:active {
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 8px rgba(4, 98, 108, 0.4) !important;
        }

        .secondary-buttons {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .secondary-buttons a {
          color: #cccccc;
          text-decoration: underline;
        }

        .secondary-buttons a:hover {
          color: #ffffff;
        }

        code {
          background: #1a1a1a;
          color: #04626C;
>>>>>>> electromalina/main
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        @media (max-width: 768px) {
          .container {
            padding: 20px 15px;
          }

<<<<<<< HEAD
          h1 {
            font-size: 2.5em;
          }

          .features {
            grid-template-columns: 1fr;
          }

          .endpoint-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .actions {
            flex-direction: column;
            align-items: center;
          }

          .btn {
            width: 200px;
            text-align: center;
=======
          .main-button {
            min-width: 200px;
            padding: 18px 40px;
            font-size: 1.2em;
            max-width: 100%;
          }

          .secondary-buttons {
            flex-direction: column;
            width: 100%;
>>>>>>> electromalina/main
          }
        }
      `}</style>

      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
<<<<<<< HEAD
          background: #f5f5f5;
=======
          background: #000000;
>>>>>>> electromalina/main
        }

        * {
          box-sizing: border-box;
        }
<<<<<<< HEAD
=======

        a {
          color: #cccccc;
        }
>>>>>>> electromalina/main
      `}</style>
    </>
  );
}

