/**
 * Gallery Paintings System - API Integration
 * Fetches GitHub uploads from API and displays them as interactive paintings
 */

console.log('🎨 Gallery module loading...');

import { 
  TRIGGER_DISTANCE, 
  TRIGGER_COOLDOWN, 
  LOOK_PRECISION 
} from './config.js';
import { getPlayerPosition } from './player.js';

// =============================================================================
// GALLERY PAINTINGS CONFIGURATION
// =============================================================================

/**
 * Interactive gallery paintings positioned on walls
 * These will be populated from API data
 */
export let galleryFrames = [
  // Default paintings (will be replaced by API data)
  { x: 11, y: 6, url: 'https://github.com', title: 'Loading...', user: 'system' },
  { x: 1, y: 6, url: 'https://github.com', title: 'Loading...', user: 'system' },
  { x: 6, y: 1, url: 'https://github.com', title: 'Loading...', user: 'system' },
  { x: 6, y: 11, url: 'https://github.com', title: 'Loading...', user: 'system' },
  { x: 3, y: 1, url: 'https://github.com', title: 'Loading...', user: 'system' },
  { x: 8, y: 11, url: 'https://github.com', title: 'Loading...', user: 'system' },
];

// =============================================================================
// API INTEGRATION
// =============================================================================

/**
 * Fetch uploads from API and update gallery paintings
 */
async function loadGalleryData() {
  console.log('🎨 Loading gallery data from API...');
  
  try {
    // Try multiple API endpoints
    const apiUrls = [
      '/uploads',
      './uploads',
      'uploads',
      'https://i558110.hera.fontysict.net/api-testing/uploads'
    ];
    
    let uploads = null;
    for (const apiUrl of apiUrls) {
      try {
        console.log(`Trying API endpoint: ${apiUrl}`);
        const response = await fetch(apiUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          uploads = await response.json();
          console.log(`✅ Successfully loaded from: ${apiUrl}`, uploads);
          break;
        }
      } catch (err) {
        console.log(`❌ Failed to load from ${apiUrl}:`, err.message);
      }
    }
    
    if (!uploads || !Array.isArray(uploads)) {
      console.log('⚠️ No valid uploads data, using demo data');
      uploads = createDemoData();
    }
    
    // Update gallery frames with API data
    updateGalleryFrames(uploads);
    
  } catch (error) {
    console.error('❌ Error loading gallery data:', error);
    // Use demo data as fallback
    updateGalleryFrames(createDemoData());
  }
}

/**
 * Create demo data for testing
 */
function createDemoData() {
  return [
    {
      github_url: 'https://github.com/JenWillems/Tipsy-Dragon-Game',
      timestamp: new Date().toISOString(),
      user_name: 'JenWillems',
      repo_name: 'Tipsy-Dragon-Game'
    },
    {
      github_url: 'https://github.com/electromalina/flipdots-project',
      timestamp: new Date().toISOString(),
      user_name: 'electromalina',
      repo_name: 'flipdots-project'
    },
    {
      github_url: 'https://github.com/octocat/Hello-World',
      timestamp: new Date().toISOString(),
      user_name: 'octocat',
      repo_name: 'Hello-World'
    }
  ];
}

/**
 * Update gallery frames with upload data
 * @param {Array} uploads - Array of upload objects from API
 */
function updateGalleryFrames(uploads) {
  console.log('🖼️ Updating gallery frames with data:', uploads);
  
  // Fixed painting positions on the walls
  const positions = [
    { x: 11, y: 6 },  // Right wall center
    { x: 1, y: 6 },   // Left wall center  
    { x: 6, y: 1 },   // Top wall center
    { x: 6, y: 11 },  // Bottom wall center
    { x: 3, y: 1 },   // Top wall left
    { x: 8, y: 11 },  // Bottom wall right
  ];
  
  // Clear existing frames
  galleryFrames.length = 0;
  
  // Create new frames from uploads (up to 6)
  const maxPaintings = Math.min(uploads.length, positions.length);
  
  for (let i = 0; i < maxPaintings; i++) {
    const upload = uploads[i];
    const position = positions[i];
    
    // Use original GitHub URL directly (not runnable version)
    const githubUrl = upload.github_url;
    
    galleryFrames.push({
      x: position.x,
      y: position.y,
      url: githubUrl,  // Use original GitHub repo URL
      originalUrl: githubUrl,
      title: upload.repo_name || 'Unknown Repository',
      user: upload.user_name || 'Unknown User',
      timestamp: upload.timestamp || new Date().toISOString(),
      lastTrigger: 0
    });
  }
  
  // Fill remaining positions with default entries if needed
  while (galleryFrames.length < positions.length) {
    const position = positions[galleryFrames.length];
    galleryFrames.push({
      x: position.x,
      y: position.y,
      url: 'https://github.com',
      originalUrl: 'https://github.com',
      title: 'Empty Slot',
      user: 'system',
      timestamp: new Date().toISOString(),
      lastTrigger: 0
    });
  }
  
  console.log(`✅ Gallery updated with ${galleryFrames.length} paintings`);
  
  // Log painting info for debugging
  galleryFrames.forEach((frame, i) => {
    console.log(`🖼️ Painting ${i + 1}: "${frame.title}" by ${frame.user} at (${frame.x}, ${frame.y})`);
  });
}


// =============================================================================
// GALLERY INTERACTION SYSTEM
// =============================================================================

/**
 * Update gallery painting interactions
 * Checks if player is looking at any painting and triggers if conditions are met
 * @param {HTMLCanvasElement} canvas - Canvas element for focus restoration
 * @param {Function} clearMovementKeys - Function to clear movement keys
 * @returns {boolean} True if any painting was triggered
 */
export function updateGalleryInteractions(canvas, clearMovementKeys) {
  const now = performance.now();
  const { x: px, y: py, angle: pa } = getPlayerPosition();
  
  for (let i = 0; i < galleryFrames.length; i++) {
    const gf = galleryFrames[i];
    if (!gf.lastTrigger) gf.lastTrigger = 0;
    
    const dist = Math.hypot(gf.x - px, gf.y - py);
    
    // Check if player is looking directly at the painting
    const angle = Math.atan2(gf.y - py, gf.x - px);
    let delta = angle - pa;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // Normalize to [-π, π]
    
    // Trigger if: close enough + looking at it + cooldown expired
    if (dist < TRIGGER_DISTANCE && 
        Math.abs(delta) < LOOK_PRECISION && 
        now - gf.lastTrigger > TRIGGER_COOLDOWN) {
      
      console.log(`🖼️ Triggering painting: "${gf.title}" by ${gf.user}`);
      console.log(`🔗 Opening GitHub repository: ${gf.url}`);
      
      // Show info about the painting
      const info = `🎨 "${gf.title}" by ${gf.user}\n🔗 Opening GitHub repo: ${gf.url}`;
      console.log(info);
      
      // Process for flipdot display
      processForFlipdot(gf.title, gf.url);
      
      // Open the original GitHub repository URL
      window.open(gf.url, '_blank');
      
      clearMovementKeys(); // Prevent movement during trigger
      gf.lastTrigger = now;
      canvas.focus && canvas.focus();
      return true; // Only trigger one painting per frame
    }
  }
  
  return false;
}

// =============================================================================
// GALLERY MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Get gallery frame information for a specific index
 * @param {number} index - Gallery frame index
 * @returns {Object|null} Gallery frame object or null if invalid index
 */
export function getGalleryFrame(index) {
  if (index < 0 || index >= galleryFrames.length) return null;
  return galleryFrames[index];
}

/**
 * Get the total number of gallery frames
 * @returns {number} Number of gallery frames
 */
export function getGalleryFrameCount() {
  return galleryFrames.length;
}

/**
 * Refresh gallery data from API
 */
export async function refreshGallery() {
  console.log('🔄 Refreshing gallery data...');
  return await loadGalleryData();
}

/**
 * =============================================================================
 * FLIPDOT DISPLAY INTEGRATION
 * =============================================================================
 */

/**
 * Process a repository for flipdot display
 * This function sends the repository information to the flipdot processing API
 */
async function processForFlipdot(repositoryName, githubUrl) {
  try {
    console.log('🔄 Processing repository for flipdot display:', repositoryName);
    
    // Create a screenshot URL from the GitHub repository
    // This is a placeholder - in a real implementation, you'd capture the actual repo
    const imageUrl = `https://github.com/${repositoryName.split('/')[0]}/${repositoryName.split('/')[1]}/raw/main/README.md`;
    
    // Prepare the flipdot processing request
    const requestData = {
      image_url: imageUrl,
      repository_name: repositoryName,
      github_url: githubUrl,
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Sending flipdot processing request:', requestData);
    
    // Send request to flipdot processing API
    const response = await fetch('https://i558110.hera.fontysict.net/api-testing/flipdot/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Flipdot processing result:', result);
    
    // Show success message
    if (result.success) {
      console.log(`🎯 Repository "${repositoryName}" processed for flipdot display!`);
      console.log(`📊 Display info: ${result.display_info.width}x${result.display_info.height} panels`);
      
      // You could add a visual notification here
      showFlipdotNotification(repositoryName, result);
    } else {
      console.error('❌ Flipdot processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error processing repository for flipdot:', error);
    console.log('🔄 Falling back to standard repository view...');
  }
}

/**
 * Show a notification when flipdot processing is complete
 */
function showFlipdotNotification(repositoryName, result) {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #000;
    color: #fff;
    border: 2px solid #fff;
    padding: 15px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  `;
  
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">🎯 FLIPDOT DISPLAY</div>
    <div style="margin-bottom: 5px;">📦 ${repositoryName}</div>
    <div style="margin-bottom: 5px;">📊 ${result.display_info.width}x${result.display_info.height}</div>
    <div style="margin-bottom: 5px;">⚡ ${result.display_info.mode} mode</div>
    <div style="font-size: 10px; color: #ccc;">${new Date().toLocaleTimeString()}</div>
  `;
  
  document.body.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

/**
 * Get flipdot display status
 */
export async function getFlipdotStatus() {
  try {
    const response = await fetch('https://i558110.hera.fontysict.net/api-testing/flipdot/status');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const status = await response.json();
    console.log('📊 Flipdot status:', status);
    return status;
    
  } catch (error) {
    console.error('❌ Error getting flipdot status:', error);
    return null;
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Load gallery data when module loads
console.log('🎨 Gallery system initializing...');
loadGalleryData();

// Refresh gallery data every 30 seconds
setInterval(() => {
  console.log('🔄 Auto-refreshing gallery data...');
  loadGalleryData();
}, 30000);

// Debug: Confirm exports are available
console.log('🎨 Gallery module exports ready:', {
  updateGalleryInteractions: typeof updateGalleryInteractions,
  getGalleryFrameCount: typeof getGalleryFrameCount,
  refreshGallery: typeof refreshGallery,
  galleryFrames: galleryFrames.length + ' frames'
});
