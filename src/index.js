import { Ticker } from "./ticker.js";
import { createCanvas, registerFont, ImageData } from "canvas";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Worker } from "worker_threads";

// Load environment variables
dotenv.config();

import { FPS, LAYOUT } from "./settings.js";
import { Display } from "@owowagency/flipdot-emu";
import { setButtonHandler, setSpotifyService } from "./preview.js";
import { createBackAnimation, createPlayPauseAnimation, createForwardAnimation } from "./animations.js";
import { SpotifyService } from "./utils/spotify-service.js";
import { APP_CONFIG } from "./config/app-config.js";
import { StateManager } from "./state-manager.js";
import { renderTrackInfo } from "./renderers/track-renderer.js";
import { renderAnimation } from "./renderers/animation-renderer.js";
import { renderIdleState } from "./renderers/idle-renderer.js";

const IS_DEV = APP_CONFIG.dev.isDev;
const DEBUG = process.env.DEBUG === 'true';

// Initialize state manager
const state = new StateManager();

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

// Register fonts (once at startup)
registerFont(path.resolve(import.meta.dirname, "../fonts/cg-pixel-4x5.ttf"), {
	family: "cg-pixel-4x5",
});

// Create canvas
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.textBaseline = "top";

// Initialize dithering worker
const ditheringWorker = new Worker(
	path.resolve(import.meta.dirname, './workers/dithering-worker.js'),
	{ type: 'module' }
);

// Double buffering for dithering
let pendingDither = false;
let lastDitheredData = null;

ditheringWorker.on('message', ({ success, data }) => {
	if (success && data) {
		lastDitheredData = new Uint8ClampedArray(data);
	}
	pendingDither = false;
});

// Function to request dithering in background
function requestDithering(imageData) {
	if (pendingDither) return; // Skip if worker is busy
	
	pendingDither = true;
	ditheringWorker.postMessage({
		imageData: imageData.data,
		width,
		height,
		threshold: 128
	});
}

// Function to update track data
async function updateTrackData(forceUpdate = false) {
	try {
		const newTrackData = await musicService.getCurrentTrack();
		
		if (newTrackData) {
			if (DEBUG) {
				console.log('Track:', newTrackData.track, 'by', newTrackData.artist);
			}
			
			// Check if we got the new track we were waiting for
			if (state.timings.waitingForTrackChange) {
				const trackChanged = newTrackData.track !== state.track.previous.name;
				const waitTimeout = (Date.now() - state.timings.waitingStartTime) > state.constants.TRACK_CHANGE_TIMEOUT;
				
				if (trackChanged || waitTimeout) {
					if (DEBUG) console.log(trackChanged ? '✓ New track' : '⚠ Timeout');
					state.stopWaitingForTrackChange();
				}
			}
			
			// Detect external changes (not from our buttons)
			if (state.track.current && state.isExternalChange() && !state.timings.waitingForTrackChange) {
				// Detect track skip
				if (newTrackData.track !== state.track.previous.name && state.track.previous.name !== null) {
					if (DEBUG) console.log('External track change');
					triggerAnimation('forward');
				}
				
				// Detect play/pause toggle - pass PREVIOUS state to show correct icon
				// (animation shows the action taken, not the resulting state)
				if (newTrackData.isPlaying !== state.track.previous.isPlaying && state.track.previous.isPlaying !== null) {
					if (DEBUG) console.log('External play/pause', newTrackData.isPlaying ? 'pressed play' : 'pressed pause');
					triggerAnimation('playpause', state.track.previous.isPlaying);
				}
			}
			
			// Update state
			state.updateTrack(newTrackData);
			
			// Fetch album art if track changed
			if (!state.track.albumArt || newTrackData.track !== state.track.previous.name) {
				const albumArt = await musicService.getAlbumArt(newTrackData, 28, height);
				state.setAlbumArt(albumArt);
			}
		} else {
			// No track data - clear the state to show idle state
			if (state.track.current !== null) {
				if (DEBUG) console.log('No track playing - clearing state');
				state.updateTrack(null);
			}
		}
	} catch (error) {
		if (DEBUG) console.error('Track update error:', error.message);
		// On error, also clear the state if we had one
		if (state.track.current !== null) {
			state.updateTrack(null);
		}
	}
}

// Function to trigger button animations
function triggerAnimation(type, isPlaying = null) {
	let frames;
	switch(type) {
		case 'back':
			frames = createBackAnimation(ctx, width, height);
			break;
		case 'playpause':
			// Use provided isPlaying state or fall back to current state
			const playState = isPlaying !== null ? isPlaying : (state.track.current?.isPlaying || false);
			frames = createPlayPauseAnimation(ctx, width, height, playState);
			break;
		case 'forward':
			frames = createForwardAnimation(ctx, width, height);
			break;
		default:
			return;
	}
	
	state.startAnimation(type, frames);
	
	// Animation duration
	const duration = (type === 'back' || type === 'forward')
		? APP_CONFIG.animations.nextBackDuration
		: APP_CONFIG.animations.playPauseDuration;
	
	setTimeout(() => state.stopAnimation(), duration);
}

// Function to handle button actions
function handleButtonAction(action) {
	state.setButtonPressed();
	
	switch(action) {
		case 'back':
			if (DEBUG) console.log('Back pressed');
			musicService.previousTrack();
			triggerAnimation('back');
			state.startWaitingForTrackChange();
			updateTrackData(true); // Force immediate update
			break;
			
		case 'playpause':
			if (DEBUG) console.log('Play/Pause pressed');
			musicService.togglePlayback();
			triggerAnimation('playpause');
			updateTrackData(true); // Force immediate update
			break;
			
		case 'forward':
			if (DEBUG) console.log('Forward pressed');
			musicService.nextTrack();
			triggerAnimation('forward');
			state.startWaitingForTrackChange();
			updateTrackData(true); // Force immediate update
			break;
	}
}

// Initialize the ticker
const ticker = new Ticker({ fps: FPS });

// Update track data initially
await updateTrackData();

// Main render loop
ticker.start(async ({ deltaTime, elapsedTime }) => {
	// Update track data (throttled unless forced)
	const now = Date.now();
	if (state.shouldUpdateTrack(now)) {
		await updateTrackData();
		state.markTrackUpdated(now);
	}

	// Clear and fill background
	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, width, height);

	// Render based on current state
	let rendered = false;
	
	// 1. Try to render animation (highest priority)
	if (state.animation.playing || state.timings.waitingForTrackChange) {
		rendered = renderAnimation(ctx, state);
	}
	
	// 2. Render track info if playing
	if (!rendered && state.track.current?.isPlaying) {
		renderTrackInfo(ctx, state, width, height);
		rendered = true;
	}
	
	// 3. Render idle state
	if (!rendered) {
		renderIdleState(ctx, state.track.current, width, height);
	}

	// Get image data for dithering
	const imageData = ctx.getImageData(0, 0, width, height);
	
	// Request background dithering
	requestDithering(imageData);
	
	// Apply last dithered data if available, otherwise use current
	const dataToUse = lastDitheredData || imageData.data;
	const finalImageData = new ImageData(new Uint8ClampedArray(dataToUse), width, height);

	// Output to display or file
	if (IS_DEV) {
		const filename = path.join(outputDir, "frame.png");
		ctx.putImageData(finalImageData, 0, 0);
		const buffer = canvas.toBuffer("image/png");
		fs.writeFileSync(filename, buffer);
	} else {
		display.setImageData(finalImageData);
		if (display.isDirty()) {
			display.flush();
		}
	}

	if (DEBUG) {
		console.log(`Frame time: ${deltaTime.toFixed(2)}ms | Dither: ${pendingDither ? 'busy' : 'ready'}`);
	}
});

// Connect button handler and Spotify service to the preview server
setButtonHandler(handleButtonAction);
setSpotifyService(musicService);

// Cleanup on exit
process.on('exit', () => {
	ditheringWorker.terminate();
});
