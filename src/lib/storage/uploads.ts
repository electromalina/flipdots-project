import fs from 'fs';
import path from 'path';
import { Upload, SlackData } from '../types/upload';
import { GitHubRepoInfo } from '../types/github';

// In-memory storage for Vercel (serverless functions have read-only filesystem)
// For production, consider using a database (Vercel KV, MongoDB, etc.)
let inMemoryUploads: Upload[] = [];

// Try to use file system if available (local development)
const UPLOADS_FILE = path.join(process.cwd(), 'data', 'uploads.json');
const USE_FILE_SYSTEM = process.env.NODE_ENV !== 'production' || process.env.USE_FILE_STORAGE === 'true';

function ensureDataDirectory() {
  if (!USE_FILE_SYSTEM) return;
  
  try {
    const dataDir = path.dirname(UPLOADS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create data directory, using in-memory storage:', error);
  }
}

function loadFromFile(): Upload[] {
  if (!USE_FILE_SYSTEM) return [];
  
  try {
    ensureDataDirectory();
    if (fs.existsSync(UPLOADS_FILE)) {
      const content = fs.readFileSync(UPLOADS_FILE, 'utf8');
      return JSON.parse(content) || [];
    }
  } catch (error) {
    console.warn('Error reading uploads from file, using in-memory storage:', error);
  }
  return [];
}

function saveToFile(uploads: Upload[]): void {
  if (!USE_FILE_SYSTEM) return;
  
  try {
    ensureDataDirectory();
    fs.writeFileSync(UPLOADS_FILE, JSON.stringify(uploads, null, 2));
  } catch (error) {
    console.warn('Error saving uploads to file, using in-memory storage:', error);
  }
}

export function getUploads(): Upload[] {
  if (USE_FILE_SYSTEM) {
    return loadFromFile();
  }
  return inMemoryUploads;
}

export function logUpload(githubUrl: string, repoInfo: GitHubRepoInfo, slackData: SlackData): void {
  try {
    const uploads = getUploads();
    
    const upload: Upload = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      github_url: githubUrl,
      repository: `${repoInfo.owner}/${repoInfo.repo}`,
      branch: repoInfo.branch,
      path: repoInfo.path,
      slack_user: slackData.user_name || 'unknown',
      slack_channel: slackData.channel_name || 'unknown'
    };
    
    // Add to beginning and keep only last 6
    uploads.unshift(upload);
    const limitedUploads = uploads.slice(0, 6);
    
    if (USE_FILE_SYSTEM) {
      saveToFile(limitedUploads);
    } else {
      inMemoryUploads = limitedUploads;
    }
  } catch (error) {
    console.error('Error logging upload:', error);
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

