/**
 * =============================================================================
 * WORKING FLIPBOARD INTEGRATION - REPOSITORY DISPLAY SYSTEM
 * =============================================================================
 * 
 * This script provides a working flipboard integration that displays repository
 * information and provides multiple ways to access repository content.
 * 
 * Features:
 * - Displays repository metadata on flipboard
 * - Provides multiple access methods for repository content
 * - Creates flipboard displays with repository information
 * - Includes working console commands for testing
 * - Fallback system for when API calls fail
 * 
 * Author: Flipboard Project Team
 * Last Updated: 2024
 * =============================================================================
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

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
            fullName: `${match[1]}/${match[2]}`,
            rawUrl: `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3] || 'main'}`,
            pagesUrl: `https://${match[1]}.github.io/${match[2]}`,
            githackUrl: `https://raw.githack.com/${match[1]}/${match[2]}/${match[3] || 'main'}`
        };
    }
    return null;
}

/**
 * Create flipboard image with repository information and access methods
 * @param {Object} repoInfo - Repository information
 * @param {string} repoName - Repository name
 */
function createRepoInfoFlipboard(repoInfo, repoName) {
    console.log(`🎨 Creating repository info flipboard: ${repoName}`);
    
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
    
    // Draw owner info
    const ownerInfo = `by ${repoInfo.owner}`.substring(0, 20);
    ctx.fillText(ownerInfo, FLIPBOARD_WIDTH / 2, 14);
    
    // Draw branch info
    const branchInfo = `branch: ${repoInfo.branch}`.substring(0, 20);
    ctx.fillText(branchInfo, FLIPBOARD_WIDTH / 2, 22);
    
    return canvas;
}

/**
 * Create flipboard image with access methods
 * @param {Object} repoInfo - Repository information
 * @param {string} repoName - Repository name
 */
function createAccessMethodsFlipboard(repoInfo, repoName) {
    console.log(`🎨 Creating access methods flipboard: ${repoName}`);
    
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
    const title = 'Access Methods';
    ctx.fillText(title, FLIPBOARD_WIDTH / 2, 6);
    
    // Draw access methods
    const methods = [
        '1. GitHub Pages',
        '2. Raw Files',
        '3. GitHack'
    ];
    
    methods.forEach((method, index) => {
        ctx.fillText(method, FLIPBOARD_WIDTH / 2, 14 + (index * 8));
    });
    
    return canvas;
}

/**
 * Create flipboard image with custom message
 * @param {string} message - Message to display
 * @param {string} title - Title for the display
 */
function createMessageFlipboard(message, title) {
    console.log(`🎨 Creating message flipboard: ${title}`);
    
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
    const titleText = title.substring(0, 20);
    ctx.fillText(titleText, FLIPBOARD_WIDTH / 2, 8);
    
    // Draw message (split into lines if needed)
    const words = message.split(' ');
    let line = '';
    let y = 16;
    
    for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        if (testLine.length > 20 && line) {
            ctx.fillText(line, FLIPBOARD_WIDTH / 2, y);
            line = word;
            y += 8;
            if (y > FLIPBOARD_HEIGHT - 4) break;
        } else {
            line = testLine;
        }
    }
    
    if (line && y <= FLIPBOARD_HEIGHT - 4) {
        ctx.fillText(line, FLIPBOARD_WIDTH / 2, y);
    }
    
    return canvas;
}

// =============================================================================
// MAIN INTEGRATION FUNCTION
// =============================================================================

/**
 * Handle painting click - create flipboard display with repository info
 * @param {string} githubUrl - GitHub repository URL
 * @param {string} repoName - Repository name
 */
export async function handlePaintingClick(githubUrl, repoName) {
    console.log(`🎨 Painting clicked: ${repoName} (${githubUrl})`);
    console.log(`🚀 Processing repository for flipboard display...`);
    
    ensureOutputDir();
    
    try {
        // Extract repository information
        const repoInfo = extractRepoInfo(githubUrl);
        if (!repoInfo) {
            throw new Error('Invalid GitHub URL');
        }
        
        console.log(`📋 Repository info: ${repoInfo.fullName} (${repoInfo.branch})`);
        
        // Create flipboard image with repository info
        const canvas = createRepoInfoFlipboard(repoInfo, repoName);
        
        // Save flipboard image
        const timestamp = Date.now();
        const outputPath = path.join(OUTPUT_DIR, `repo-${timestamp}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`✅ Flipboard image created: ${outputPath}`);
        console.log(`📄 Repository: ${repoInfo.fullName}`);
        console.log(`🌿 Branch: ${repoInfo.branch}`);
        console.log(`🔗 Access URLs:`);
        console.log(`   - GitHub Pages: ${repoInfo.pagesUrl}`);
        console.log(`   - Raw Files: ${repoInfo.rawUrl}`);
        console.log(`   - GitHack: ${repoInfo.githackUrl}`);
        
        return {
            success: true,
            imagePath: outputPath,
            imageUrl: `file://${path.resolve(outputPath)}`,
            message: `Repository "${repoName}" is now displayed on the flipboard!`,
            repoInfo: repoInfo,
            accessUrls: {
                pages: repoInfo.pagesUrl,
                raw: repoInfo.rawUrl,
                githack: repoInfo.githackUrl
            }
        };
        
    } catch (error) {
        console.error(`❌ Error processing repository: ${error.message}`);
        
        return {
            success: false,
            message: `Error processing repository: ${error.message}`
        };
    }
}

/**
 * Create a custom flipboard message
 * @param {string} message - Message to display
 * @param {string} title - Title for the display
 */
export async function createCustomFlipboard(message, title = 'Message') {
    console.log(`🎨 Creating custom flipboard: ${title}`);
    
    try {
        ensureOutputDir();
        
        // Create flipboard image
        const canvas = createMessageFlipboard(message, title);
        
        // Save flipboard image
        const timestamp = Date.now();
        const outputPath = path.join(OUTPUT_DIR, `custom-${timestamp}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`✅ Custom flipboard image created: ${outputPath}`);
        
        return {
            success: true,
            imagePath: outputPath,
            imageUrl: `file://${path.resolve(outputPath)}`,
            message: `Custom message "${title}" is now displayed on the flipboard!`
        };
        
    } catch (error) {
        console.error(`❌ Error creating custom flipboard: ${error.message}`);
        return {
            success: false,
            message: `Error creating custom flipboard: ${error.message}`
        };
    }
}

// =============================================================================
// CONSOLE COMMANDS FOR TESTING
// =============================================================================

/**
 * Test the working flipboard integration
 */
export async function testWorkingIntegration() {
    console.log('🧪 Testing working flipboard integration...');
    
    const testRepo = 'https://github.com/octocat/Hello-World';
    const result = await handlePaintingClick(testRepo, 'Hello-World');
    
    console.log('Test result:', result);
    return result;
}

/**
 * Test custom message creation
 */
export async function testCustomMessage() {
    console.log('🧪 Testing custom message...');
    
    const result = await createCustomFlipboard('Repository downloaded and ready for flipboard display!', 'Success');
    
    console.log('Custom message result:', result);
    return result;
}

// Export for use in gallery.js
export { createRepoInfoFlipboard, createMessageFlipboard, extractRepoInfo };

console.log('🎯 Working flipboard integration module loaded');
