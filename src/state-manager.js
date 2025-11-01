// State Manager - Centralized state management for the application
export class StateManager {
	constructor() {
		// Track data
		this.track = {
			current: null,
			albumArt: null,
			previous: {
				name: null,
				isPlaying: null
			}
		};
		
		// Animation state
		this.animation = {
			playing: false,
			frames: [],
			frameIndex: 0,
			startTime: 0,
			type: null
		};
		
		// Scroll state
		this.scroll = {
			enabled: true,
			track: {
				offset: 0,
				lastTrackWidth: 0
			},
			artist: {
				offset: 0,
				lastTrackWidth: 0
			},
			speed: 1 // Integer pixels for smooth rendering
		};
		
		// Timing state
		this.timings = {
			lastTrackUpdate: 0,
			buttonPressed: 0,
			waitingForTrackChange: false,
			waitingStartTime: 0
		};
		
		// Constants
		this.constants = {
			TRACK_UPDATE_INTERVAL: 500,
			BUTTON_COOLDOWN: 3000,
			TRACK_CHANGE_TIMEOUT: 5000
		};
	}
	
	// Track methods
	updateTrack(data) {
		this.track.previous.name = this.track.current?.track || null;
		this.track.previous.isPlaying = this.track.current?.isPlaying || null;
		this.track.current = data;
	}
	
	setAlbumArt(canvas) {
		this.track.albumArt = canvas;
	}
	
	// Animation methods
	startAnimation(type, frames) {
		this.animation.playing = true;
		this.animation.type = type;
		this.animation.frames = frames;
		this.animation.frameIndex = 0;
		this.animation.startTime = Date.now();
	}
	
	stopAnimation() {
		this.animation.playing = false;
		this.animation.type = null;
		this.animation.frames = [];
	}
	
	// Scroll methods
	resetScroll() {
		this.scroll.track.offset = 0;
		this.scroll.artist.offset = 0;
	}
	
	// Timing methods
	setButtonPressed() {
		this.timings.buttonPressed = Date.now();
	}
	
	startWaitingForTrackChange() {
		this.timings.waitingForTrackChange = true;
		this.timings.waitingStartTime = Date.now();
	}
	
	stopWaitingForTrackChange() {
		this.timings.waitingForTrackChange = false;
	}
	
	isExternalChange() {
		const timeSinceButton = Date.now() - this.timings.buttonPressed;
		return timeSinceButton > this.constants.BUTTON_COOLDOWN;
	}
	
	shouldUpdateTrack(now) {
		return now - this.timings.lastTrackUpdate >= this.constants.TRACK_UPDATE_INTERVAL;
	}
	
	markTrackUpdated(now) {
		this.timings.lastTrackUpdate = now;
	}
}

