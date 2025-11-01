// Track Renderer - Handles rendering of track information with scrolling

// Layout constants
const LAYOUT = {
	ALBUM_SIZE: 28, // Reduced from 42 to give more text space
	MARGIN: 3, // Reduced margin for better space utilization
	RIGHT_MARGIN: 2,
	TRACK_Y: 3,
	ARTIST_Y: 11,
	PROGRESS_BAR_HEIGHT: 3,
	LINE_HEIGHT: 6
};

// Draw scrolling text (marquee style)
function prepareScrollingText(ctx, text, x, y, maxWidth, lineHeight) {
	if (!text || typeof text !== 'string') {
		return null;
	}
	
	const metrics = ctx.measureText(text);
	const textWidth = metrics.width;
	
	// If text fits, no need to scroll
	if (textWidth <= maxWidth) {
		ctx.fillText(text, x, y);
		return null;
	}
	
	// Text needs scrolling - return data for rendering
	const padding = maxWidth * 0.3;
	const totalTrackWidth = textWidth + padding;
	
	return { 
		needsScroll: true, 
		text, 
		x, 
		y, 
		maxWidth, 
		lineHeight,
		totalTrackWidth
	};
}

// Render scrolling text with offset
function renderScrollingText(ctx, scrollData, offset) {
	const { text, x, y, maxWidth, totalTrackWidth } = scrollData;
	
	// Round track width once for consistency
	const trackWidth = Math.round(totalTrackWidth);
	
	// Integer-only offset for pixel-perfect rendering
	const pixelOffset = Math.round(offset) % trackWidth;
	
	// Save context for clipping
	ctx.save();
	ctx.beginPath();
	ctx.rect(x, y, maxWidth, scrollData.lineHeight);
	ctx.clip();
	
	// Draw first copy at offset position
	const drawX = Math.round(x - pixelOffset);
	ctx.fillText(text, drawX, y);
	
	// Draw second copy for seamless loop
	const secondX = drawX + trackWidth;
	ctx.fillText(text, secondX, y);
	
	ctx.restore();
}

// Draw truncated text (when scrolling is off)
function renderTruncatedText(ctx, text, x, y, maxWidth) {
	if (!text || typeof text !== 'string') {
		return;
	}
	
	const metrics = ctx.measureText(text);
	
	if (metrics.width <= maxWidth) {
		ctx.fillText(text, x, y);
		return;
	}
	
	// Try to fit with ellipsis
	let truncated = text;
	while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
		truncated = truncated.slice(0, -1);
	}
	
	ctx.fillText(truncated + '...', x, y);
}

// Update scroll positions
function updateScrollPositions(state, trackScrollData, artistScrollData) {
	if (state.animation.playing) {
		return;
	}
	
	const { speed } = state.scroll;
	
	// Track scrolling - continuous smooth loop with modulo wrapping
	if (trackScrollData?.needsScroll) {
		const trackWidth = Math.round(trackScrollData.totalTrackWidth);
		
		// Reset if track width changed
		if (state.scroll.track.lastTrackWidth !== trackWidth) {
			state.scroll.track.lastTrackWidth = trackWidth;
			state.scroll.track.offset = 0;
		}
		
		state.scroll.track.offset = (state.scroll.track.offset + speed) % trackWidth;
	} else {
		// Reset if text no longer needs scrolling
		state.scroll.track.offset = 0;
	}
	
	// Artist scrolling - continuous smooth loop with modulo wrapping
	if (artistScrollData?.needsScroll) {
		const artistWidth = Math.round(artistScrollData.totalTrackWidth);
		
		// Reset if artist width changed
		if (state.scroll.artist.lastTrackWidth !== artistWidth) {
			state.scroll.artist.lastTrackWidth = artistWidth;
			state.scroll.artist.offset = 0;
		}
		
		state.scroll.artist.offset = (state.scroll.artist.offset + speed) % artistWidth;
	} else {
		// Reset if text no longer needs scrolling
		state.scroll.artist.offset = 0;
	}
}

// Main track rendering function
export function renderTrackInfo(ctx, state, width, height) {
	const trackData = state.track.current;
	if (!trackData) return;
	
	// Draw album art
	if (state.track.albumArt) {
		ctx.drawImage(state.track.albumArt, 0, 0, LAYOUT.ALBUM_SIZE, height);
	}
	
	// Calculate text area
	const textX = LAYOUT.ALBUM_SIZE + LAYOUT.MARGIN;
	const textAreaWidth = width - textX - LAYOUT.RIGHT_MARGIN;
	
	ctx.fillStyle = "#fff";
	ctx.font = '5px "cg-pixel-4x5"';
	
	// Render track name (always scrolling if needed)
	let trackScrollData = null;
	if (trackData.track) {
		trackScrollData = prepareScrollingText(
			ctx, trackData.track, textX, LAYOUT.TRACK_Y, textAreaWidth, LAYOUT.LINE_HEIGHT
		);
		if (trackScrollData) {
			renderScrollingText(ctx, trackScrollData, state.scroll.track.offset);
		}
	}
	
	// Render artist name (always scrolling if needed)
	let artistScrollData = null;
	if (trackData.artist) {
		artistScrollData = prepareScrollingText(
			ctx, trackData.artist, textX, LAYOUT.ARTIST_Y, textAreaWidth, LAYOUT.LINE_HEIGHT
		);
		if (artistScrollData) {
			renderScrollingText(ctx, artistScrollData, state.scroll.artist.offset);
		}
	}
	
	// Update scroll positions for next frame
	updateScrollPositions(state, trackScrollData, artistScrollData);
	
	// Render progress bar
	renderProgressBar(ctx, trackData, textX, textAreaWidth, height);
}

// Render progress bar
function renderProgressBar(ctx, trackData, textX, textAreaWidth, height) {
	const barHeight = 1;
	const progress = trackData.duration > 0 ? trackData.progress / trackData.duration : 0;
	const progressY = height - LAYOUT.PROGRESS_BAR_HEIGHT + 1;
	
	// Background
	ctx.fillStyle = "#333";
	ctx.fillRect(textX, progressY, textAreaWidth, barHeight);
	
	// Progress
	ctx.fillStyle = "#fff";
	ctx.fillRect(textX, progressY, Math.floor(textAreaWidth * progress), barHeight);
}

