// Idle Renderer - Handles rendering when no music is playing or paused

export function renderIdleState(ctx, trackData, width, height) {
	ctx.fillStyle = "#fff";
	ctx.font = '6px "cg-pixel-4x5"';
	
	const message = trackData ? "Paused" : "No music playing";
	const textMetrics = ctx.measureText(message);
	const textX = (width - textMetrics.width) / 2;
	const textY = height / 2;
	
	ctx.fillText(message, textX, textY);
}

