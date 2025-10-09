/**
 * =============================================================================
 * FLIPBOARD GITHUB API INTEGRATION - REPOSITORY CONTENT DISPLAY
 * =============================================================================
 * 
 * This script uses the GitHub API to fetch repository content and display it
 * on the flipboard when paintings are clicked.
 * 
 * Features:
 * - Uses GitHub API to fetch repository content
 * - Displays actual repository files on flipboard
 * - Handles different file types (HTML, README, code files)
 * - Creates flipboard displays from repository content
 * - No need for ZIP downloads or extractions
 * 
 * Author: Flipboard Project Team
 * Last Updated: 2024
 * =============================================================================
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import https from 'https';

// =============================================================================
// FLIPBOARD CONFIGURATION
// =============================================================================

/** Flipboard display dimensions */
const FLIPBOARD_WIDTH = 84;
const FLIPBOARD_HEIGHT = 28;

/** Output directory */
const OUTPUT_DIR = './flipboard-output';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
    }
}

/**
 * Make HTTPS request
 * @param {string} url - URL to request
 * @param {Object} options - Request options
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    resolve(data);
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

/**
 * Extract repository information from GitHub URL
 * @param {string} githubUrl - GitHub repository URL
 */
function extractRepoInfo(githubUrl) {
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/);
    if (match) {
        return {
            owner: match[1],
            name: match[2],
            branch: match[3] || 'main',
            fullName: `${match[1]}/${match[2]}`
        };
    }
    return null;
}

/**
 * Fetch repository content from GitHub API
 * @param {Object} repoInfo - Repository information
 */
async function fetchRepoContent(repoInfo) {
    console.log(`🔍 Fetching repository content: ${repoInfo.fullName}`);
    
    try {
        // First, get the repository contents
        const contentsUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.name}/contents`;
        console.log(`📡 API URL: ${contentsUrl}`);
        
        const contents = await makeRequest(contentsUrl);
        
        if (!Array.isArray(contents)) {
            throw new Error('Invalid response from GitHub API');
        }
        
        // Look for important files
        const importantFiles = [
            'README.md',
            'index.html',
            'main.html',
            'app.html',
            'game.html',
            'demo.html',
            'package.json',
            'main.js',
            'app.js'
        ];
        
        let targetFile = null;
        
        // Find the most important file
        for (const fileName of importantFiles) {
            targetFile = contents.find(file => file.name === fileName);
            if (targetFile) {
                console.log(`📄 Found important file: ${fileName}`);
                break;
            }
        }
        
        // If no important file found, get the first text file
        if (!targetFile) {
            targetFile = contents.find(file => 
                file.type === 'file' && 
                (file.name.endsWith('.md') || file.name.endsWith('.txt') || 
                 file.name.endsWith('.js') || file.name.endsWith('.html') ||
                 file.name.endsWith('.json'))
            );
        }
        
        if (!targetFile) {
            throw new Error('No readable files found in repository');
        }
        
        console.log(`📄 Fetching content from: ${targetFile.name}`);
        
        // Get the file content
        const fileContent = await makeRequest(targetFile.download_url);
        
        return {
            fileName: targetFile.name,
            content: fileContent,
            size: targetFile.size,
            type: path.extname(targetFile.name)
        };
        
    } catch (error) {
        console.error(`❌ Error fetching repository content: ${error.message}`);
        throw error;
    }
}

/**
 * Create flipboard image from repository content
 * @param {Object} fileContent - File content object
 * @param {string} repoName - Repository name
 * @param {string} owner - Repository owner
 */
function createContentFlipboard(fileContent, repoName, owner) {
    console.log(`🎨 Creating flipboard from: ${fileContent.fileName}`);
    
    const canvas = createCanvas(FLIPBOARD_WIDTH, FLIPBOARD_HEIGHT);
    const ctx = canvas.getContext('2d');
    
    // Black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, FLIPBOARD_WIDTH, FLIPBOARD_HEIGHT);
    
    // White text
    ctx.fillStyle = 'white';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    
    // Draw title (truncated to fit)
    const title = repoName.substring(0, 20);
    ctx.fillText(title, FLIPBOARD_WIDTH / 2, 6);
    
    // Draw file info
    const fileInfo = `${fileContent.fileName}`.substring(0, 20);
    ctx.fillText(fileInfo, FLIPBOARD_WIDTH / 2, 14);
    
    // Draw content preview (first few lines)
    const content = typeof fileContent.content === 'string' ? fileContent.content : JSON.stringify(fileContent.content);
    const lines = content.split('\n').slice(0, 2);
    lines.forEach((line, index) => {
        const preview = line.substring(0, 20).replace(/[^\x20-\x7E]/g, ' '); // Remove non-printable chars
        ctx.fillText(preview, FLIPBOARD_WIDTH / 2, 22 + (index * 8));
    });
    
    return canvas;
}

/**
 * Create flipboard image from HTML content
 * @param {string} htmlContent - HTML content
 * @param {string} repoName - Repository name
 */
function createHtmlFlipboard(htmlContent, repoName) {
    console.log(`🎨 Creating HTML flipboard for: ${repoName}`);
    
    const canvas = createCanvas(FLIPBOARD_WIDTH, FLIPBOARD_HEIGHT);
    const ctx = canvas.getContext('2d');
    
    // Black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, FLIPBOARD_WIDTH, FLIPBOARD_HEIGHT);
    
    // White text
    ctx.fillStyle = 'white';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    
    // Draw title
    const title = repoName.substring(0, 20);
    ctx.fillText(title, FLIPBOARD_WIDTH / 2, 8);
    
    // Extract text from HTML (simple approach)
    const textContent = htmlContent.replace(/<[^>]*>/g, '').substring(0, 100);
    const lines = textContent.split('\n').slice(0, 2);
    
    lines.forEach((line, index) => {
        const preview = line.substring(0, 20).replace(/[^\x20-\x7E]/g, ' ');
        ctx.fillText(preview, FLIPBOARD_WIDTH / 2, 16 + (index * 8));
    });
    
    return canvas;
}

// =============================================================================
// MAIN INTEGRATION FUNCTION
// =============================================================================

/**
 * Handle painting click - fetch repo content and show on flipboard
 * @param {string} githubUrl - GitHub repository URL
 * @param {string} repoName - Repository name
 */
export async function handlePaintingClick(githubUrl, repoName) {
    console.log(`🎨 Painting clicked: ${repoName} (${githubUrl})`);
    console.log(`🚀 Starting GitHub API fetch...`);
    
    ensureOutputDir();
    
    try {
        // Extract repository information
        const repoInfo = extractRepoInfo(githubUrl);
        if (!repoInfo) {
            throw new Error('Invalid GitHub URL');
        }
        
        console.log(`📋 Repository info: ${repoInfo.fullName} (${repoInfo.branch})`);
        
        // Fetch repository content
        console.log(`📥 Step 1: Fetching repository content...`);
        const fileContent = await fetchRepoContent(repoInfo);
        
        // Create flipboard image from content
        console.log(`🎨 Step 2: Creating flipboard display...`);
        let canvas;
        
        if (fileContent.type === '.html') {
            canvas = createHtmlFlipboard(fileContent.content, repoName);
        } else {
            canvas = createContentFlipboard(fileContent, repoName, repoInfo.owner);
        }
        
        // Save flipboard image
        const timestamp = Date.now();
        const outputPath = path.join(OUTPUT_DIR, `repo-${timestamp}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`✅ Flipboard image created: ${outputPath}`);
        console.log(`📄 Content from: ${fileContent.fileName} (${fileContent.size} bytes)`);
        
        return {
            success: true,
            imagePath: outputPath,
            imageUrl: `file://${path.resolve(outputPath)}`,
            message: `Repository "${repoName}" content is now displayed on the flipboard!`,
            contentFile: fileContent.fileName,
            contentPreview: fileContent.content.substring(0, 100),
            repoInfo: repoInfo
        };
        
    } catch (error) {
        console.error(`❌ Error processing repository: ${error.message}`);
        
        return {
            success: false,
            message: `Error processing repository: ${error.message}`
        };
    }
}

// =============================================================================
// CONSOLE COMMANDS FOR TESTING
// =============================================================================

/**
 * Test the GitHub API integration
 */
export async function testGitHubApi() {
    console.log('🧪 Testing GitHub API integration...');
    
    const testRepo = 'https://github.com/octocat/Hello-World';
    const result = await handlePaintingClick(testRepo, 'Hello-World');
    
    console.log('Test result:', result);
    return result;
}

// Export for use in gallery.js
export { createContentFlipboard, createHtmlFlipboard, extractRepoInfo };

console.log('🎯 GitHub API flipboard integration module loaded');
