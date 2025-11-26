import { Upload } from '@/lib/types/upload';

interface UploadItemProps {
  upload: Upload;
}

export function UploadItem({ upload }: UploadItemProps) {
  return (
    <div className="upload-item">
      <div className="upload-repo">📁 {upload.repository}</div>
      <div className="upload-meta">
        🌿 Branch: {upload.branch} | 
        👤 User: {upload.slack_user} | 
        📅 {new Date(upload.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      <div>
        <a 
          href={upload.github_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="upload-link"
        >
          🔗 View on GitHub
        </a>
      </div>
    </div>
  );
}

