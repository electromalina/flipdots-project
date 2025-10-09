import { Ticker } from "./ticker.js";
import { createCanvas, registerFont } from "canvas";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Load environment variables first, before any other imports
dotenv.config();

import { FPS, LAYOUT } from "./settings.js";
import { Display } from "@owowagency/flipdot-emu";
import { setButtonHandler, setSpotifyService } from "./preview.js";
import { ditherCanvas } from "./utils/dithering.js";
import { createBackAnimation, createPlayPauseAnimation, createForwardAnimation } from "./animations.js";
import { SpotifyService } from "./utils/spotify-service.js";
import { APP_CONFIG } from "./config/app-config.js";


const IS_DEV = APP_CONFIG.dev.isDev;

// Initialize music service
const musicService = new SpotifyService(APP_CONFIG.musicService.spotify);

// Create display
const display = new Display({
	layout: LAYOUT,
	panelWidth: 28,
	isMirrored: true,
	transport: !IS_DEV ? {
		type: 'serial',
		path: '/dev/ttyACM0',
		baudRate: 57600
	} : {
		type: 'ip',
		host: '127.0.0.1',
		port: 3000
	}
});

const { width, height } = display;

// Create output directory if it doesn't exist
const outputDir = APP_CONFIG.dev.outputDir;
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Register fonts

registerFont(path.resolve(import.meta.dirname, "../fonts/cg-pixel-4x5.ttf"), {
	family: "cg-pixel-4x5",
});

registerFont(
	path.resolve(import.meta.dirname, "../fonts/OpenSans-Variable.ttf"),
	{ family: "OpenSans" },
);
registerFont(
	path.resolve(import.meta.dirname, "../fonts/PPNeueMontrealMono-Regular.ttf"),
	{ family: "PPNeueMontreal" },
);
registerFont(path.resolve(import.meta.dirname, "../fonts/Px437_ACM_VGA.ttf"), {
	family: "Px437_ACM_VGA",
});

// Create canvas with the specified resolution
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.textBaseline = "top";

// Track state
let currentTrackData = null;
let albumArtCanvas = null;

// Animation state
let currentAnimation = null;
let animationFrames = [];
let animationFrameIndex = 0;
let animationPlaying = false;
let animationStartTime = 0;

// Track update throttling
let lastTrackUpdateTime = 0;
const TRACK_UPDATE_INTERVAL = 1000; // Update every 1 second instead of every frame

// Track previous state to detect external changes
let previousTrackName = null;
let previousIsPlaying = null;
let localButtonPressedTime = 0; // Timestamp of last button press
const BUTTON_COOLDOWN = 3000; // Ignore external changes for 3 seconds after button press

// Track change waiting state
let waitingForTrackChange = false; // True when we've pressed next/back and waiting for new track
let waitingForTrackStartTime = 0; // When we started waiting
const TRACK_CHANGE_TIMEOUT = 5000; // Give up waiting after 5 seconds

// Text scrolling state
let scrollEnabled = true; // Toggle for scrolling
let scrollOffsetTrack = 0; // Scroll position for track name
let scrollOffsetArtist = 0; // Scroll position for artist name
let scrollSpeed = 0.67; // Pixels per frame (about 10 pixels/sec at 15fps)
let scrollPauseFrames = 20; // Pause at loop (1.3 seconds at 15fps)
let scrollPauseCounterTrack = 0; // Separate pause counter for track
let scrollPauseCounterArtist = 0; // Separate pause counter for artist

// Helper: word wrap and draw text
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
	// Handle undefined or null text
	if (!text || typeof text !== 'string') {
		return y;
	}
	
	const words = text.split(' ');
	let line = '';
	let linesUsed = 0;
	for (let i = 0; i < words.length; i++) {
		const testLine = line + words[i] + ' ';
		const metrics = ctx.measureText(testLine);
		if (metrics.width > maxWidth && i > 0) {
			ctx.fillText(line, x, y);
			line = words[i] + ' ';
			y += lineHeight;
			linesUsed++;
			if (linesUsed >= maxLines - 1) {
				line = line.substring(0, line.length - 1) + '...';
				break;
			}
		} else {
			line = testLine;
		}
	}
	ctx.fillText(line, x, y);
	linesUsed++;
	return y + lineHeight;
}

// Function to draw scrolling text (marquee style)
function drawScrollingText(ctx, text, x, y, maxWidth, lineHeight) {
	if (!text || typeof text !== 'string') {
		return y;
	}
	
	const metrics = ctx.measureText(text);
	const textWidth = metrics.width;
	
	// If text fits, no need to scroll
	if (textWidth <= maxWidth) {
		ctx.fillText(text, x, y);
		return y + lineHeight;
	}
	
	// Text needs scrolling - return data for rendering
	const padding = maxWidth * 0.3; // 30% of width as spacing
	const totalTrackWidth = textWidth + padding;
	
	return { 
		needsScroll: true, 
		text, 
		x, 
		y, 
		maxWidth, 
		lineHeight,
		textWidth,
		totalTrackWidth
	};
}

// Helper to render scrolling text with offset
function renderScrollingText(ctx, scrollData, offset) {
	const { text, x, y, maxWidth, textWidth, totalTrackWidth } = scrollData;
	
	// Normalize offset to loop seamlessly
	const normalizedOffset = offset % totalTrackWidth;
	
	// CRITICAL: Round to whole pixels for flip dot - no anti-aliasing!
	const pixelPerfectOffset = Math.floor(normalizedOffset);
	
	// Save context for clipping
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, maxWidth, scrollData.lineHeight);
	ctx.clip();
	
	// Draw text at pixel-perfect position (integer coordinates only)
	const drawX = Math.floor(x - pixelPerfectOffset);
	ctx.fillText(text, drawX, y);
	
	// Draw second copy for seamless loop
	if (pixelPerfectOffset > 0) {
		ctx.fillText(text, drawX + Math.floor(totalTrackWidth), y);
	}
	
	ctx.restore();
	return y + scrollData.lineHeight;
}

// Function to draw truncated text (when scrolling is off)
function drawTruncatedText(ctx, text, x, y, maxWidth, lineHeight) {
	if (!text || typeof text !== 'string') {
		return y;
	}
	
	const metrics = ctx.measureText(text);
	
	if (metrics.width <= maxWidth) {
		ctx.fillText(text, x, y);
		return y + lineHeight;
	}
	
	// Try to fit with ellipsis
	let truncated = text;
	while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
		truncated = truncated.slice(0, -1);
	}
	
	ctx.fillText(truncated + '...', x, y);
	return y + lineHeight;
}

// Function to update track data
async function updateTrackData() {
	try {
		const newTrackData = await musicService.getCurrentTrack();
		
		// Debug logging
		if (newTrackData) {
			console.log('Current track:', newTrackData.track, 'by', newTrackData.artist, 'isPlaying:', newTrackData.isPlaying);
			
			// Check if we got the new track we were waiting for
			if (waitingForTrackChange) {
				const trackChanged = newTrackData.track !== previousTrackName;
				const waitTimeout = (Date.now() - waitingForTrackStartTime) > TRACK_CHANGE_TIMEOUT;
				
				if (trackChanged || waitTimeout) {
					console.log(trackChanged ? '✓ New track received!' : '⚠ Track change timeout');
					waitingForTrackChange = false;
				}
			}
			
			// Check if enough time has passed since last button press
			const timeSinceButtonPress = Date.now() - localButtonPressedTime;
			const isExternalChange = timeSinceButtonPress > BUTTON_COOLDOWN;
			
			// Detect external changes (not from our buttons)
			if (currentTrackData && isExternalChange && !waitingForTrackChange) {
				// Detect track skip (forward or back)
				if (newTrackData.track !== previousTrackName && previousTrackName !== null) {
					console.log('External track change detected!');
					triggerAnimation('forward');
				}
				
				// Detect play/pause toggle
				if (newTrackData.isPlaying !== previousIsPlaying && previousIsPlaying !== null) {
					console.log('External play/pause detected!');
					triggerAnimation('playpause');
				}
			}
			
			// Store current state for next comparison
			previousTrackName = newTrackData.track;
			previousIsPlaying = newTrackData.isPlaying;
			
			// If we have new track data and it's different from current one
			if (!currentTrackData || newTrackData.track !== currentTrackData.track) {
				// Get album art with Atkinson dithering for better low-res
				albumArtCanvas = await musicService.getAlbumArt(
					newTrackData,
					42,  // Use half display width or 28px max
					height
				);
			}
			
		currentTrackData = newTrackData;
	} else {
		console.log('No track data received');
		// Don't clear currentTrackData on occasional failures to prevent flickering
		// The display will continue showing the last known track until valid data returns
	}
	} catch (error) {
		console.error('Failed to update track data:', error.message || error);
		console.error('Full error details:', JSON.stringify(error, null, 2));
		// Don't immediately clear currentTrackData on error to prevent flickering
	}
}

// Function to trigger button animations
function triggerAnimation(type) {
	animationPlaying = true;
	animationStartTime = Date.now();
	animationFrameIndex = 0;
	
	switch(type) {
		case 'back':
			animationFrames = createBackAnimation(ctx, width, height);
			currentAnimation = 'back';
			break;
		case 'playpause':
			animationFrames = createPlayPauseAnimation(ctx, width, height, currentTrackData?.isPlaying || false);
			currentAnimation = 'playpause';
			break;
		case 'forward':
			animationFrames = createForwardAnimation(ctx, width, height);
			currentAnimation = 'forward';
			break;
	}
	
	// Animation duration (in milliseconds) - faster for next/back
	const animationDuration = type === 'back' || type === 'forward' 
		? APP_CONFIG.animations.nextBackDuration 
		: APP_CONFIG.animations.playPauseDuration;
	
	// Stop animation after duration
	setTimeout(() => {
		animationPlaying = false;
		currentAnimation = null;
		animationFrames = [];
	}, animationDuration);
}

// Function to handle button actions
function handleButtonAction(action) {
	// Record timestamp to prevent triggering animation twice
	// (once from button, once from state change detection)
	localButtonPressedTime = Date.now();
	
	switch(action) {
		case 'back':
			// Go to previous track
			console.log('Back button pressed');
			musicService.previousTrack();
			triggerAnimation('back');
			// Wait for track data to update before showing content
			waitingForTrackChange = true;
			waitingForTrackStartTime = Date.now();
			break;
		case 'playpause':
			// Toggle play/pause
			console.log('Play/Pause button pressed');
			musicService.togglePlayback();
			triggerAnimation('playpause');
			// No need to wait for track change on play/pause
			break;
		case 'forward':
			// Go to next track
			console.log('Forward button pressed');
			musicService.nextTrack();
			triggerAnimation('forward');
			// Wait for track data to update before showing content
			waitingForTrackChange = true;
			waitingForTrackStartTime = Date.now();
			break;
		case 'togglescroll':
			// Toggle text scrolling (no animation needed)
			scrollEnabled = !scrollEnabled;
			console.log('Toggle scroll:', scrollEnabled ? 'ON' : 'OFF');
			scrollOffsetTrack = 0;
			scrollOffsetArtist = 0;
			scrollPauseCounterTrack = scrollPauseFrames;
			scrollPauseCounterArtist = scrollPauseFrames;
			break;
	}
}

// Initialize the ticker
const ticker = new Ticker({ fps: FPS });

// Update track data initially
await updateTrackData();

ticker.start(async ({ deltaTime, elapsedTime }) => {
	// Update track data only once per second instead of every frame (throttled)
	const now = Date.now();
	if (now - lastTrackUpdateTime >= TRACK_UPDATE_INTERVAL) {
		await updateTrackData();
		lastTrackUpdateTime = now;
	}

	console.clear();
	console.time("Write frame");
	console.log(`Rendering a ${width}x${height} canvas`);
	console.log("View at http://localhost:3000/");

	ctx.clearRect(0, 0, width, height);

	// Fill the canvas with a black background
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, width, height);

	// Check if we're playing a button animation OR waiting for track to change
	if ((animationPlaying && animationFrames.length > 0) || waitingForTrackChange) {
		// Play animation frames - faster for next/back animations
		const frameRate = (currentAnimation === 'back' || currentAnimation === 'forward') 
			? APP_CONFIG.animations.nextBackFrameRate 
			: APP_CONFIG.animations.playPauseFrameRate;
		const frameTime = 1000 / frameRate;
		const elapsed = Date.now() - animationStartTime;
		animationFrameIndex = Math.floor(elapsed / frameTime) % animationFrames.length;
		
		if (animationFrameIndex < animationFrames.length && animationFrames.length > 0) {
			ctx.drawImage(animationFrames[animationFrameIndex], 0, 0);
		} else if (waitingForTrackChange) {
			// Loop the last animation frame while waiting for track change
			const lastFrame = animationFrames[animationFrames.length - 1];
			if (lastFrame) {
				ctx.drawImage(lastFrame, 0, 0);
			}
		}
	} else if (currentTrackData && currentTrackData.isPlaying) {
		// Album art on left side - increase the size to 42x28
		const albumSize = Math.min(42, height);
		if (albumArtCanvas) {
			ctx.drawImage(albumArtCanvas, 0, 0, albumSize, height);
		}
		const margin = 5; // 5px margin between album art and text
		const albumWidth = albumSize;
		const textX = albumWidth + margin;
		const textAreaWidth = width - textX - 2; // 2px right margin
		
		// Fixed layout positions for consistent alignment
		const trackY = 3; // Track name position from top
		const artistY = 11; // Artist name position (track + line height + spacing)
		const progressBarHeight = 3; // Reserve 3 pixels at bottom (1px bar + margins)
		
		ctx.fillStyle = "#fff";
		ctx.font = '5px "cg-pixel-4x5"';
		
		// Song name - fixed position at top
		let trackScrollData = null;
		if (currentTrackData.track) {
			if (scrollEnabled) {
				const result = drawScrollingText(ctx, currentTrackData.track, textX, trackY, textAreaWidth, 6);
				if (result.needsScroll) {
					trackScrollData = result;
					renderScrollingText(ctx, trackScrollData, scrollOffsetTrack);
				} else {
					// Text fits, just draw it
					ctx.fillText(currentTrackData.track, textX, trackY);
				}
			} else {
				drawTruncatedText(ctx, currentTrackData.track, textX, trackY, textAreaWidth, 6);
			}
		}
		
		// Artist name - fixed position below track
		let artistScrollData = null;
		if (currentTrackData.artist) {
			ctx.font = '5px "cg-pixel-4x5"';
			if (scrollEnabled) {
				const result = drawScrollingText(ctx, currentTrackData.artist, textX, artistY, textAreaWidth, 6);
				if (result.needsScroll) {
					artistScrollData = result;
					renderScrollingText(ctx, artistScrollData, scrollOffsetArtist);
				} else {
					// Text fits, just draw it
					ctx.fillText(currentTrackData.artist, textX, artistY);
				}
			} else {
				drawTruncatedText(ctx, currentTrackData.artist, textX, artistY, textAreaWidth, 6);
			}
		}
		
		// Update scroll offsets for next frame - smooth continuous scrolling
		if (scrollEnabled && !animationPlaying) {
			// Track scrolling with independent pause
			if (trackScrollData && trackScrollData.needsScroll) {
				if (scrollPauseCounterTrack > 0) {
					// Paused at loop point
					scrollPauseCounterTrack--;
				} else {
					// Scroll continuously
					scrollOffsetTrack += scrollSpeed;
					
					// Reset with brief pause when loop completes
					if (scrollOffsetTrack >= trackScrollData.totalTrackWidth) {
						scrollOffsetTrack = 0;
						scrollPauseCounterTrack = scrollPauseFrames;
					}
				}
			}
			
			// Artist scrolling with independent pause
			if (artistScrollData && artistScrollData.needsScroll) {
				if (scrollPauseCounterArtist > 0) {
					// Paused at loop point
					scrollPauseCounterArtist--;
				} else {
					// Scroll continuously
					scrollOffsetArtist += scrollSpeed;
					
					// Reset with brief pause when loop completes
					if (scrollOffsetArtist >= artistScrollData.totalTrackWidth) {
						scrollOffsetArtist = 0;
						scrollPauseCounterArtist = scrollPauseFrames;
					}
				}
			}
		} else if (!scrollEnabled) {
			// Reset scroll when disabled
			scrollOffsetTrack = 0;
			scrollOffsetArtist = 0;
			scrollPauseCounterTrack = 0;
			scrollPauseCounterArtist = 0;
		}
		// Progress bar - fixed at bottom, always same position
		const barHeight = 1; // Single pixel bar
		const barWidth = textAreaWidth;
		const progress = currentTrackData.duration > 0 ? currentTrackData.progress / currentTrackData.duration : 0;
		const progressY = height - progressBarHeight + 1; // Fixed position from bottom
		
		// Draw background bar
		ctx.fillStyle = "#333";
		ctx.fillRect(textX, progressY, barWidth, barHeight);
		
		// Draw progress
		ctx.fillStyle = "#fff";
		ctx.fillRect(textX, progressY, Math.floor(barWidth * progress), barHeight);
	} else {
		// Not playing message - only show if no track data at all OR if we have track data but it's explicitly paused
		if (!currentTrackData || (currentTrackData && !currentTrackData.isPlaying)) {
			ctx.fillStyle = "#fff";
			ctx.font = '6px "cg-pixel-4x5"';
			const noMusicMsg = currentTrackData ? "Paused" : "No music playing";
			const textMetrics = ctx.measureText(noMusicMsg);
			const textX = (width - textMetrics.width) / 2;
			const textY = height / 2;
			ctx.fillText(noMusicMsg, textX, textY);
		} else {
			// Show full-screen pause display with big centered pause icon
			ctx.fillStyle = "#fff";
			
			// Center coordinates
			const centerX = Math.floor(width / 2);
			const centerY = Math.floor(height / 2);
			
			// Draw big pause icon in the center
			const iconSize = Math.min(width, height) * 0.6; // 60% of the smaller dimension
			const barWidth = Math.max(3, Math.floor(iconSize * 0.15)); // 15% of icon size, minimum 3px
			const barHeight = Math.floor(iconSize);
			const gap = Math.max(4, Math.floor(iconSize * 0.2)); // 20% of icon size, minimum 4px
			
			// Draw two vertical bars for pause icon
			ctx.fillRect(centerX - gap/2 - barWidth, centerY - barHeight/2, barWidth, barHeight);
			ctx.fillRect(centerX + gap/2, centerY - barHeight/2, barWidth, barHeight);
		}
	}

	// --- DITHERING STEP ---
	// Use Floyd-Steinberg dithering for better low-res results
	ditherCanvas(ctx, width, height);

	if (IS_DEV) {
		// Save the canvas as a PNG file
		const filename = path.join(outputDir, "frame.png");
		const buffer = canvas.toBuffer("image/png");
		fs.writeFileSync(filename, buffer);
	} else {
		const imageData = ctx.getImageData(0, 0, display.width, display.height);
		display.setImageData(imageData);
		if (display.isDirty()) {
			display.flush();
		}
	}

	console.log(`Elapsed time: ${(elapsedTime / 1000).toFixed(2)}s`);
	console.log(`Delta time: ${deltaTime.toFixed(2)}ms`);
	console.timeEnd("Write frame");
});

// Connect button handler and Spotify service to the preview server
setButtonHandler(handleButtonAction);
setSpotifyService(musicService);