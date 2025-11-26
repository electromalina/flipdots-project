import fs from 'fs';
import path from 'path';
import { Upload, SlackData } from '../types/upload';
import { GitHubRepoInfo } from '../types/github';

// In-memory storage as fallback
let inMemoryUploads: Upload[] = [];

// Use /tmp in production (writable in serverless), data/ in development
const UPLOADS_FILE = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'uploads.json')
  : path.join(process.cwd(), 'data', 'uploads.json');

// Track if file system is available (null = not checked yet)
// Note: In serverless, this resets per invocation, so we always try
let fileSystemAvailable: boolean | null = null;

function checkFileSystemAvailable(): boolean {
  // In serverless, always try (don't rely on cache across invocations)
  // But cache within the same invocation to avoid repeated checks
  if (fileSystemAvailable !== null) return fileSystemAvailable;
  
  try {
    const dir = path.dirname(UPLOADS_FILE);
    // Try to create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Test write capability
    const testFile = path.join(dir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    fileSystemAvailable = true;
    console.log('File system storage available at:', UPLOADS_FILE);
    return true;
  } catch (error) {
    console.warn('File system not available, using in-memory storage:', error);
    fileSystemAvailable = false;
    return false;
  }
}

function loadFromFile(): Upload[] {
  // Always try to read, even if previous check failed
  // In serverless, the file might exist from a previous invocation
  try {
    console.log(`Attempting to load from: ${UPLOADS_FILE}`);
    const fileExists = fs.existsSync(UPLOADS_FILE);
    console.log(`File exists: ${fileExists}`);
    
    if (fileExists) {
      const content = fs.readFileSync(UPLOADS_FILE, 'utf8');
      console.log(`File content length: ${content.length} bytes`);
      const uploads = JSON.parse(content) || [];
      console.log(`✅ Loaded ${uploads.length} uploads from file: ${UPLOADS_FILE}`);
      console.log(`Uploads data:`, JSON.stringify(uploads, null, 2));
      // If we successfully read, mark file system as available
      fileSystemAvailable = true;
      return uploads;
    } else {
      console.log(`⚠️ Uploads file does not exist yet: ${UPLOADS_FILE}`);
      console.log(`Directory exists: ${fs.existsSync(path.dirname(UPLOADS_FILE))}`);
    }
  } catch (error) {
    console.error('❌ Error reading uploads from file:', error);
    // Don't set fileSystemAvailable to false here - might be a read error, not a write error
  }
  
  // If file doesn't exist, still try to check if we can write
  // This helps determine if we should try saving later
  if (fileSystemAvailable === null) {
    checkFileSystemAvailable();
  }
  
  return [];
}

function saveToFile(uploads: Upload[]): boolean {
  // Always try to save, even if previous check failed
  try {
    const dir = path.dirname(UPLOADS_FILE);
    console.log(`Attempting to save to: ${UPLOADS_FILE}`);
    console.log(`Directory: ${dir}`);
    
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const jsonContent = JSON.stringify(uploads, null, 2);
    console.log(`Writing ${jsonContent.length} bytes to file`);
    fs.writeFileSync(UPLOADS_FILE, jsonContent);
    
    // Verify the file was written
    const verifyExists = fs.existsSync(UPLOADS_FILE);
    const verifySize = verifyExists ? fs.statSync(UPLOADS_FILE).size : 0;
    console.log(`✅ Saved ${uploads.length} uploads to file: ${UPLOADS_FILE}`);
    console.log(`File verification: exists=${verifyExists}, size=${verifySize} bytes`);
    fileSystemAvailable = true;
    return true;
  } catch (error) {
    console.error('❌ Error saving uploads to file:', error);
    fileSystemAvailable = false;
    return false;
  }
}

export function getUploads(): Upload[] {
  // Always try file system first
  const fileUploads = loadFromFile();
  
  console.log('getUploads() called:', {
    fileSystemAvailable,
    fileUploadsCount: fileUploads.length,
    inMemoryCount: inMemoryUploads.length,
    uploadsFile: UPLOADS_FILE,
    nodeEnv: process.env.NODE_ENV,
    fileExists: fs.existsSync(UPLOADS_FILE)
  });
  
  // If we got uploads from file, return them
  if (fileUploads.length > 0) {
    return fileUploads;
  }
  
  // If file system is available but file doesn't exist, return empty array
  // (don't fall back to in-memory which would be stale)
  if (fileSystemAvailable === true) {
    return [];
  }
  
  // Only use in-memory if file system is definitely not available
  // (and we have in-memory data from this invocation)
  if (fileSystemAvailable === false && inMemoryUploads.length > 0) {
    console.log('Using in-memory uploads as fallback');
    return inMemoryUploads;
  }
  
  return [];
}

export function logUpload(githubUrl: string, repoInfo: GitHubRepoInfo, slackData: SlackData): void {
  try {
    console.log('logUpload() called:', {
      githubUrl,
      repository: `${repoInfo.owner}/${repoInfo.repo}`,
      uploadsFile: UPLOADS_FILE,
      nodeEnv: process.env.NODE_ENV
    });
    
    const uploads = getUploads();
    console.log(`Current uploads count before adding: ${uploads.length}`);
    
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
    console.log(`New uploads count after adding: ${limitedUploads.length}`);
    
    // Try to save to file, fallback to in-memory
    if (saveToFile(limitedUploads)) {
      console.log('✅ Upload saved successfully to file');
    } else {
      inMemoryUploads = limitedUploads;
      console.warn('⚠️ Saved to in-memory storage (not persistent across serverless invocations)');
    }
  } catch (error) {
    console.error('❌ Error logging upload:', error);
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

