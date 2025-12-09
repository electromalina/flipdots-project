import Link from 'next/link';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Slack API</title>
        <meta name="description" content="Slack app for uploading GitHub links" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <div className="logo-container">
          <img src="/gallery/logo.png" alt="ROOM" className="logo" />
        </div>

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

        @media (max-width: 768px) {
          .container {
            padding: 20px 15px;
          }

          h1 {
            font-size: 2.5em;
          }

          .main-button {
            min-width: 200px;
            padding: 18px 40px;
            font-size: 1.2em;
            max-width: 100%;
          }

          .secondary-buttons {
            flex-direction: column;
            width: 100%;
          }
        }
      `}</style>

      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          background: #000000;
        }

        * {
          box-sizing: border-box;
        }

        a {
          color: #cccccc;
        }
      `}</style>
    </>
  );
}

