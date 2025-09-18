import { Ticker } from "./ticker.js";
import { createCanvas, registerFont, loadImage } from "canvas";
import fs from "node:fs";
import path from "node:path";
import { FPS, LAYOUT } from "./settings.js";
import { Display } from "@owowagency/flipdot-emu";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import "./preview.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_DEV = process.argv.includes("--dev");

// === CONFIG: enable/disable features ===
const ENABLE_WEATHER = true;
const ENABLE_SPINNING_DOTS = false;
const ENABLE_LOADING_BAR = false;

// === DISPLAY SETUP ===
const display = new Display({
	layout: LAYOUT,
	panelWidth: 28,
	isMirrored: true,
	transport: !IS_DEV
		? { type: "serial", path: "/dev/ttyACM0", baudRate: 57600 }
		: { type: "ip", host: "127.0.0.1", port: 3000 },
});

const { width, height } = display;

// Create output directory
const outputDir = "./output";
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Register fonts
registerFont(path.resolve(__dirname, "../fonts/OpenSans-Variable.ttf"), { family: "OpenSans" });
registerFont(path.resolve(__dirname, "../fonts/PPNeueMontrealMono-Regular.ttf"), { family: "PPNeueMontreal" });
registerFont(path.resolve(__dirname, "../fonts/Px437_ACM_VGA.ttf"), { family: "Px437_ACM_VGA" });

// === CANVAS SETUP ===
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.textBaseline = "top";

// === TICKER ===
const ticker = new Ticker({ fps: FPS });

// === WEATHER SETUP ===
let currentWeather = null;
let ICONS = {};
let DEFAULT_ICON = "";

if (ENABLE_WEATHER) {
	const API_KEY = "e4430382dd87cdb1972e6ef7d26dc38c";
	const CITY = "Eindhoven";
	const COUNTRY = "NL";
	const WEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?q=${CITY},${COUNTRY}&appid=${API_KEY}&units=metric`;

	ICONS = {
		Clear: "sun.png",
		Clouds: "cloudy.png",
		Rain: "rain.png",
		Drizzle: "rain.png",
		Snow: "snow.png",
		Thunderstorm: "rain.png",
		Mist: "cloudy.png",
		Fog: "cloudy.png",
	};
	DEFAULT_ICON = "cloudy.png";

	async function fetchWeather() {
		try {
			const response = await fetch(WEATHER_URL);
			const data = await response.json();
			if (data.main && data.main.temp && data.weather && data.weather[0]) {
				return { temp: data.main.temp, condition: data.weather[0].main };
			}
			return null;
		} catch (err) {
			console.error("Error fetching weather:", err);
			return null;
		}
	}

	currentWeather = await fetchWeather();
	setInterval(async () => {
		currentWeather = await fetchWeather();
	}, 10 * 60 * 1000);
}

// === MAIN LOOP ===
ticker.start(async ({ deltaTime, elapsedTime }) => {
	console.clear();
	console.time("Write frame");
	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, width, height);

	if (ENABLE_WEATHER && currentWeather) {
		// === Weather + icon ===
		const tempText = `${currentWeather.temp.toFixed(1)}°C`;
		ctx.font = '18px "Px437_ACM_VGA"';
		const textWidth = ctx.measureText(tempText).width;

		const iconFile = ICONS[currentWeather.condition] || DEFAULT_ICON;
		const iconSize = 20;
		const gap = 2;

		try {
			const iconPath = path.resolve(__dirname, "../icons", iconFile);
			const img = await loadImage(iconPath);

			const totalWidth = iconSize + gap + textWidth;
			const startX = (width - totalWidth) / 2;
			const iconX = startX;
			const iconY = (height - iconSize) / 2;
			const textX = startX + iconSize + gap;
			const textY = (height - 18) / 2;

			ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
			ctx.fillStyle = "#fff";
			ctx.fillText(tempText, textX, textY);
		} catch (err) {
			console.error("Error loading icon:", err);
			const totalWidth = 16 + gap + textWidth;
			const startX = (width - totalWidth) / 2;
			ctx.fillStyle = "#fff";
			ctx.font = '16px "Px437_ACM_VGA"';
			ctx.fillText("☁️", startX, (height - 16) / 2);
			ctx.font = '18px "Px437_ACM_VGA"';
			ctx.fillText(tempText, startX + 16 + gap, (height - 18) / 2);
		}
	} else {
		// === Loading animations ===
		if (ENABLE_SPINNING_DOTS) {
			const dotCount = 3, radius = 3, circleRadius = 10, speed = 0.001;
			const cx = width / 2, cy = height / 2;
			for (let i = 0; i < dotCount; i++) {
				const angle = (elapsedTime * speed) + (i * (Math.PI * 2 / dotCount));
				const x = cx + Math.cos(angle) * circleRadius;
				const y = cy + Math.sin(angle) * circleRadius;
				ctx.fillStyle = "#fff";
				ctx.beginPath();
				ctx.arc(x, y, radius, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		if (ENABLE_LOADING_BAR) {
			const barWidth = width - 4;
			const barHeight = 6;
			const barSpeed = 0.003;
			const progress = (elapsedTime * barSpeed / barWidth) % 2;
			const normalized = progress <= 1 ? progress : 2 - progress;
			const fillLength = Math.floor(normalized * barWidth);
		
			const barX = 2;
			const barY = height - barHeight - 2; // moved up so it doesn't clip
		
			// Draw background
			ctx.fillStyle = "#000";
			ctx.fillRect(barX, barY, barWidth, barHeight);
		
			// Draw filled portion
			ctx.fillStyle = "#fff";
			ctx.fillRect(barX, barY, fillLength, barHeight);
		
			// Draw "loading..." text above the bar
			const text = "loading...";
			ctx.fillStyle = "#fff";
			ctx.font = '10px "Px437_ACM_VGA"';
			const textWidth = ctx.measureText(text).width;
			const textX = (width - textWidth) / 2;
			const textY = barY - 12; // 12px above bar
			ctx.fillText(text, textX, textY);
		}
	}

	// === Convert to black & white for flipdot ===
	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
		const binary = brightness > 127 ? 255 : 0;
		data[i] = data[i + 1] = data[i + 2] = binary;
		data[i + 3] = 255;
	}
	ctx.putImageData(imageData, 0, 0);

	// Save or send to flipdot
	if (IS_DEV) {
		fs.writeFileSync(path.join(outputDir, "frame.png"), canvas.toBuffer("image/png"));
	} else {
		const displayData = ctx.getImageData(0, 0, width, height);
		display.setImageData(displayData);
		if (display.isDirty()) display.flush();
	}

	console.log(`Elapsed time: ${(elapsedTime / 1000).toFixed(2)}s`);
	console.log(`Delta time: ${deltaTime.toFixed(2)}ms`);
	console.timeEnd("Write frame");
});
