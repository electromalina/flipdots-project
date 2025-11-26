import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { Upload } from '@/lib/types/upload';
import { getUploads } from '@/lib/storage/uploads';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { UploadList } from '@/components/dashboard/UploadList';

interface DashboardProps {
  uploads: Upload[];
  totalUploads: number;
}

export default function Dashboard({ uploads, totalUploads }: DashboardProps) {
  const recentUploads = uploads.slice(0, 5);

  return (
    <>
      <Head>
        <title>Flipboard Upload Dashboard</title>
        <meta name="description" content="Dashboard for Flipboard GitHub uploads" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <h1>🎮 Flipboard Upload Dashboard</h1>
        
        <DashboardStats totalUploads={totalUploads} />
        
        <h2>Recent Uploads</h2>
        <UploadList uploads={recentUploads} />
        
        <div className="actions">
          <Link href="/api/uploads" className="btn">
            📋 View All Uploads (JSON)
          </Link>
          <Link href="/api" className="btn">
            🔧 API Info
          </Link>
        </div>
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          min-height: 100vh;
        }

        h1 {
          color: #2c3e50;
          border-bottom: 3px solid #3498db;
          padding-bottom: 10px;
          margin-bottom: 30px;
        }

        h2 {
          color: #2c3e50;
          margin-top: 40px;
          margin-bottom: 20px;
        }

        .stats {
          display: flex;
          gap: 20px;
          margin: 30px 0;
          flex-wrap: wrap;
        }

        .stat-card {
          background: #3498db;
          color: white;
          padding: 30px;
          border-radius: 12px;
          flex: 1;
          text-align: center;
          min-width: 200px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-number {
          font-size: 2.5em;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 1em;
          opacity: 0.9;
        }

        .uploads-list {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .upload-item {
          background: #f8f9fa;
          margin: 15px 0;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }

        .upload-repo {
          font-weight: bold;
          color: #2c3e50;
          font-size: 1.1em;
          margin-bottom: 8px;
        }

        .upload-meta {
          color: #7f8c8d;
          font-size: 0.9em;
          margin: 8px 0;
        }

        .upload-link {
          color: #3498db;
          text-decoration: none;
          font-weight: 500;
        }

        .upload-link:hover {
          text-decoration: underline;
        }

        .actions {
          margin-top: 30px;
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .btn {
          background: #3498db;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .btn:hover {
          background: #2980b9;
        }

        code {
          background: #ecf0f1;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        @media (max-width: 768px) {
          .container {
            padding: 20px 15px;
          }

          .stats {
            flex-direction: column;
          }

          .stat-card {
            min-width: auto;
          }

          .actions {
            flex-direction: column;
          }

          .btn {
            text-align: center;
          }
        }
      `}</style>

      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          background: #f5f5f5;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const uploads = getUploads();
  
  return {
    props: {
      uploads,
      totalUploads: uploads.length
    }
  };
};

