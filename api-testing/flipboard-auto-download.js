/**
 * =============================================================================
 * FLIPBOARD AUTO-DOWNLOAD INTEGRATION - REPOSITORY CONTENT DISPLAY
 * =============================================================================
 * 
 * This script automatically downloads GitHub repositories when paintings are clicked
 * and displays the actual repository content on the flipboard.
 * 
 * Features:
 * - Automatically downloads GitHub repositories as ZIP files
 * - Extracts and processes repository content
 * - Displays actual repository files on flipboard
 * - Handles different file types (HTML, README, code files)
 * - Creates flipboard displays from repository content
 * 
 * Author: Flipboard Project Team
 * Last Updated: 2024
 * =============================================================================
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =============================================================================
// FLIPBOARD CONFIGURATION
// =============================================================================

/** Flipboard display dimensions */
const FLIPBOARD_WIDTH = 84;
const FLIPBOARD_HEIGHT = 28;

/** Output directories */
const OUTPUT_DIR = './flipboard-output';
const TEMP_DIR = './temp-repos';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Ensure directories exist
 */
function ensureDirectories() {
    [OUTPUT_DIR, TEMP_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
}

/**
 * Download a file from URL
 * @param {string} url - URL to download from
 * @param {string} filepath - Local file path to save to
 */
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {}); // Delete the file on error
            reject(err);
        });
    });
}

/**
 * Download GitHub repository as ZIP
 * @param {string} githubUrl - GitHub repository URL
 * @param {string} outputPath - Path to save the ZIP file
 */
async function downloadRepo(githubUrl, outputPath) {
    console.log(`📥 Downloading repository: ${githubUrl}`);
    
    // Convert GitHub URL to ZIP download URL
    let zipUrl;
    if (githubUrl.includes('/tree/')) {
        // Extract branch from URL
        const branchMatch = githubUrl.match(/\/tree\/([^\/]+)/);
        const branch = branchMatch ? branchMatch[1] : 'main';
        const baseUrl = githubUrl.replace(/\/tree\/[^\/]+/, '');
        zipUrl = `${baseUrl}/archive/refs/heads/${branch}.zip`;
    } else {
        zipUrl = githubUrl + '/archive/refs/heads/main.zip';
    }
    
    console.log(`🔗 Download URL: ${zipUrl}`);
    
    try {
        await downloadFile(zipUrl, outputPath);
        console.log(`✅ Repository downloaded: ${outputPath}`);
        return true;
    } catch (error) {
        console.log(`❌ Failed to download repository: ${error.message}`);
        return false;
    }
}

/**
 * Extract ZIP file using PowerShell
 * @param {string} zipPath - Path to ZIP file
 * @param {string} extractPath - Path to extract to
 */
async function extractZip(zipPath, extractPath) {
    try {
        // Use PowerShell to extract ZIP (Windows)
        const command = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`;
        await execAsync(command);
        console.log(`📦 Extracted repository to: ${extractPath}`);
        
        // Check if extraction was successful
        if (fs.existsSync(extractPath)) {
            const files = fs.readdirSync(extractPath);
            console.log(`📁 Extracted files: ${files.join(', ')}`);
            return true;
        } else {
            console.log(`❌ Extraction directory not found: ${extractPath}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Failed to extract ZIP: ${error.message}`);
        return false;
    }
}

/**
 * Find and read repository content
 * @param {string} repoPath - Path to extracted repository
 */
function findAndReadRepoContent(repoPath) {
    console.log(`🔍 Searching for content in: ${repoPath}`);
    
    const mainFiles = [
        'index.html',
        'README.md',
        'main.html',
        'app.html',
        'game.html',
        'demo.html',
        'package.json',
        'main.js',
        'app.js'
    ];
    
    // First, check if repoPath contains a subdirectory (common with GitHub downloads)
    let searchPath = repoPath;
    const files = fs.readdirSync(repoPath);
    console.log(`📁 Directory contents: ${files.join(', ')}`);
    
    // Look for a subdirectory that might contain the actual repo
    const subdir = files.find(file => {
        const fullPath = path.join(repoPath, file);
        return fs.statSync(fullPath).isDirectory() && !file.startsWith('.');
    });
    
    if (subdir) {
        searchPath = path.join(repoPath, subdir);
        console.log(`📁 Found subdirectory: ${subdir}, searching in: ${searchPath}`);
    }
    
    // Search for main files
    for (const file of mainFiles) {
        const filePath = path.join(searchPath, file);
        if (fs.existsSync(filePath)) {
            console.log(`📄 Found main file: ${file}`);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return {
                    file: file,
                    path: filePath,
                    content: content,
                    type: path.extname(file)
                };
            } catch (error) {
                console.log(`❌ Error reading file ${file}: ${error.message}`);
            }
        }
    }
    
    // Look for any text file
    const searchFiles = fs.readdirSync(searchPath);
    const textFiles = searchFiles.filter(file => 
        file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.js') || 
        file.endsWith('.html') || file.endsWith('.json')
    );
    
    if (textFiles.length > 0) {
        const file = textFiles[0];
        const filePath = path.join(searchPath, file);
        console.log(`📄 Found text file: ${file}`);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return {
                file: file,
                path: filePath,
                content: content,
                type: path.extname(file)
            };
        } catch (error) {
            console.log(`❌ Error reading file ${file}: ${error.message}`);
        }
    }
    
    console.log(`❌ No readable content found in repository`);
    return null;
}

/**
 * Create flipboard image from repository content
 * @param {Object} repoContent - Repository content object
 * @param {string} repoName - Repository name
 * @param {string} owner - Repository owner
 */
function createContentFlipboard(repoContent, repoName, owner) {
    console.log(`🎨 Creating flipboard from repository content: ${repoContent.file}`);
    
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
    const fileInfo = `${repoContent.file}`.substring(0, 20);
    ctx.fillText(fileInfo, FLIPBOARD_WIDTH / 2, 14);
    
    // Draw content preview (first few lines)
    const lines = repoContent.content.split('\n').slice(0, 2);
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
 * Handle painting click - download repo and show content on flipboard
 * @param {string} githubUrl - GitHub repository URL
 * @param {string} repoName - Repository name
 */
export async function handlePaintingClick(githubUrl, repoName) {
    console.log(`🎨 Painting clicked: ${repoName} (${githubUrl})`);
    console.log(`🚀 Starting automatic repository download...`);
    
    ensureDirectories();
    
    const timestamp = Date.now();
    const zipPath = path.join(TEMP_DIR, `${repoName}-${timestamp}.zip`);
    const extractPath = path.join(TEMP_DIR, `${repoName}-${timestamp}`);
    
    try {
        // Download repository
        console.log(`📥 Step 1: Downloading repository...`);
        const downloaded = await downloadRepo(githubUrl, zipPath);
        if (!downloaded) {
            throw new Error('Failed to download repository');
        }
        
        // Extract repository
        console.log(`📦 Step 2: Extracting repository...`);
        const extracted = await extractZip(zipPath, extractPath);
        if (!extracted) {
            throw new Error('Failed to extract repository');
        }
        
        // Find and read repository content
        console.log(`🔍 Step 3: Finding repository content...`);
        const repoContent = findAndReadRepoContent(extractPath);
        if (!repoContent) {
            throw new Error('No readable content found in repository');
        }
        
        // Extract repository info
        const urlMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        const owner = urlMatch ? urlMatch[1] : 'unknown';
        
        // Create flipboard image from content
        console.log(`🎨 Step 4: Creating flipboard display...`);
        let canvas;
        
        if (repoContent.type === '.html') {
            canvas = createHtmlFlipboard(repoContent.content, repoName);
        } else {
            canvas = createContentFlipboard(repoContent, repoName, owner);
        }
        
        // Save flipboard image
        const outputPath = path.join(OUTPUT_DIR, `repo-${timestamp}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`✅ Flipboard image created: ${outputPath}`);
        console.log(`📄 Content from: ${repoContent.file}`);
        
        // Clean up temporary files
        try {
            fs.unlinkSync(zipPath);
            fs.rmSync(extractPath, { recursive: true, force: true });
            console.log(`🧹 Cleaned up temporary files`);
        } catch (cleanupError) {
            console.log(`⚠️ Warning: Could not clean up temporary files: ${cleanupError.message}`);
        }
        
        return {
            success: true,
            imagePath: outputPath,
            imageUrl: `file://${path.resolve(outputPath)}`,
            message: `Repository "${repoName}" content is now displayed on the flipboard!`,
            contentFile: repoContent.file,
            contentPreview: repoContent.content.substring(0, 100)
        };
        
    } catch (error) {
        console.error(`❌ Error processing repository: ${error.message}`);
        
        // Clean up on error
        try {
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
        } catch (cleanupError) {
            console.log(`⚠️ Warning: Could not clean up after error: ${cleanupError.message}`);
        }
        
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
 * Test the auto-download integration
 */
export async function testAutoDownload() {
    console.log('🧪 Testing auto-download integration...');
    
    const testRepo = 'https://github.com/octocat/Hello-World';
    const result = await handlePaintingClick(testRepo, 'Hello-World');
    
    console.log('Test result:', result);
    return result;
}

// Export for use in gallery.js
export { createContentFlipboard, createHtmlFlipboard };

console.log('🎯 Auto-download flipboard integration module loaded');
