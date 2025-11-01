// Animation Renderer - Handles button animation rendering
import { APP_CONFIG } from '../config/app-config.js';

export function renderAnimation(ctx, state) {
	const { animation } = state;
	
	if (!animation.playing && !state.timings.waitingForTrackChange) {
		return false; // Not rendering animation
	}
	
	// Calculate frame rate and timing
	const frameRate = (animation.type === 'back' || animation.type === 'forward')
		? APP_CONFIG.animations.nextBackFrameRate
		: APP_CONFIG.animations.playPauseFrameRate;
	
	const frameTime = 1000 / frameRate;
	const elapsed = Date.now() - animation.startTime;
	let frameIndex = Math.floor(elapsed / frameTime) % animation.frames.length;
	
	// Safety check for array bounds
	frameIndex = Math.min(frameIndex, animation.frames.length - 1);
	
	// Render current frame or loop last frame while waiting
	if (frameIndex < animation.frames.length && animation.frames.length > 0) {
		ctx.drawImage(animation.frames[frameIndex], 0, 0);
	} else if (state.timings.waitingForTrackChange && animation.frames.length > 0) {
		// Loop the last animation frame while waiting for track change
		const lastFrame = animation.frames[animation.frames.length - 1];
		if (lastFrame) {
			ctx.drawImage(lastFrame, 0, 0);
		}
	}
	
	return true; // Animation was rendered
}

