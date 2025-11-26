import { Upload } from '@/lib/types/upload';
import { UploadItem } from './UploadItem';

interface UploadListProps {
  uploads: Upload[];
}

export function UploadList({ uploads }: UploadListProps) {
  if (uploads.length === 0) {
    return (
      <p>No uploads yet. Use <code>/upload-flipboard</code> in Slack to get started!</p>
    );
  }

  return (
    <div className="uploads-list">
      {uploads.map((upload) => (
        <UploadItem key={upload.id} upload={upload} />
      ))}
    </div>
  );
}

