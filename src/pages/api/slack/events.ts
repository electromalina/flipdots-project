import { NextApiRequest, NextApiResponse } from 'next';
import { isValidGitHubUrl, parseGitHubUrl } from '@/lib/api/github';
import { logUpload } from '@/lib/storage/uploads';
import { createSlackSuccessResponse, createSlackErrorResponse } from '@/lib/api/slack';

// Disable body parsing for this route - we'll handle it manually to support form-urlencoded
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Slack sends form-urlencoded data, but Next.js can parse it automatically
    // If body is a string, parse it manually
    let data = req.body;
    
    // Handle form-urlencoded if needed
    if (typeof data === 'string') {
      const params = new URLSearchParams(data);
      data = Object.fromEntries(params);
    }
    
    // Log the request for debugging (sanitized)
    console.log('🔔 Slack request received:', {
      command: data.command,
      hasText: !!data.text,
      user: data.user_name,
      channel: data.channel_name,
      text: data.text?.substring(0, 50) // First 50 chars for debugging
    });
    
    // Check if it's a slash command
    if (!data.command || data.command !== '/upload-flipboard') {
      return res.status(200).json({ text: 'Unknown command' });
    }
    
    const text = (data.text || '').trim();
    
    // Validate GitHub URL
    if (!text) {
      return res.status(200).json(
        createSlackErrorResponse('❌ Please provide a GitHub URL. Usage: `/upload-flipboard https://github.com/user/repo`')
      );
    }
    
    // Handle @mention format
    let githubUrl = text;
    if (text.startsWith('@')) {
      githubUrl = text.substring(1);
    }
    
    // Validate GitHub URL
    if (!isValidGitHubUrl(githubUrl)) {
      return res.status(200).json(
        createSlackErrorResponse('❌ Invalid GitHub URL. Please provide a valid GitHub repository URL.')
      );
    }
    
    // Parse GitHub URL
    const repoInfo = parseGitHubUrl(githubUrl);
    if (!repoInfo) {
      return res.status(200).json(
        createSlackErrorResponse('❌ Could not parse GitHub URL. Please check the format.')
      );
    }
    
    // Create response
    const response = createSlackSuccessResponse(githubUrl, repoInfo);
    
    // Log the upload
    console.log('📝 About to log upload:', { githubUrl, repo: repoInfo.repo });
    logUpload(githubUrl, repoInfo, {
      user_name: data.user_name,
      channel_name: data.channel_name
    });
    console.log('✅ Upload logged successfully');
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Error handling Slack event:', error);
    res.status(200).json(
      createSlackErrorResponse('❌ An error occurred while processing your request. Please try again.')
    );
  }
}


