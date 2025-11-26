import { NextApiRequest, NextApiResponse } from 'next';
import { logUpload, getUploads } from '@/lib/storage/uploads';
import { GitHubRepoInfo } from '@/lib/types/github';
import { SlackData } from '@/lib/types/upload';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('POST /api/test-upload called');
      
      // Create a test upload
      const testRepoInfo: GitHubRepoInfo = {
        owner: 'test-user',
        repo: 'test-repo',
        branch: 'main',
        path: '/'
      };
      
      const testSlackData: SlackData = {
        user_name: 'test-user',
        channel_name: 'test-channel'
      };
      
      logUpload('https://github.com/test-user/test-repo', testRepoInfo, testSlackData);
      
      // Get all uploads to verify
      const uploads = getUploads();
      
      res.status(200).json({
        success: true,
        message: 'Test upload created',
        totalUploads: uploads.length,
        uploads: uploads
      });
    } catch (error) {
      console.error('Error in /api/test-upload:', error);
      res.status(500).json({
        error: 'Failed to create test upload',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'GET') {
    // Return current uploads
    const uploads = getUploads();
    res.status(200).json({
      total: uploads.length,
      uploads: uploads
    });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}

