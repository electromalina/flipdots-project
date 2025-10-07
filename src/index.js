// index.js
import { Ticker } from "./ticker.js";
import { createCanvas, registerFont } from "canvas";
import fs from "node:fs";
import path from "node:path";
import { FPS, LAYOUT } from "./settings.js";
import { Display } from "@owowagency/flipdot-emu";
import "./preview.js";
import { Server } from "socket.io";
import express from "express";
import http from "http";
import { fileURLToPath } from "url";

// HTTP + Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public")); // zorgt ervoor dat de controls op de andere client via poort 4000
server.listen(4000, () => console.log("http://localhost:4000"));

// Separate state
let currentMove = null;   
let currentLook = null;   
let lookTimeout = null;

// luistert naar de arrows waar op gedrukt worden om deze op het scherm te laten zien
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("move", (dir) => {
    if (dir === "up" || dir === "down" || dir === "left" || dir === "right") {
      currentMove = dir;
      console.log("Move:", dir);
    }
  });

  socket.on("look", (dir) => {
    if (dir === "left" || dir === "right") {
      currentMove = null;

      currentLook = dir;
      console.log("Look:", dir);

      if (lookTimeout) clearTimeout(lookTimeout);
      lookTimeout = setTimeout(() => {
        currentLook = null;
        lookTimeout = null;
      }, 600);
    }
  });
});

// Dev mode
const IS_DEV = process.argv.includes("--dev");

// Display
const display = new Display({
  layout: LAYOUT,
  panelWidth: 28,
  isMirrored: true,
  transport: !IS_DEV
    ? { type: "serial", path: "/dev/ttyACM0", baudRate: 57600 }
    : { type: "ip", host: "127.0.0.1", port: 3000 },
});

const { width, height } = display; // 84 x 28

// Output dir
const outputDir = "./output";
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Fonts
registerFont(path.join(__dirname, "../fonts/OpenSans-Variable.ttf"), { family: "OpenSans" });
registerFont(path.join(__dirname, "../fonts/PPNeueMontrealMono-Regular.ttf"), { family: "PPNeueMontreal" });
registerFont(path.join(__dirname, "../fonts/Px437_ACM_VGA.ttf"), { family: "Px437_ACM_VGA" });

// Canvas
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.textBaseline = "middle";
ctx.textAlign = "center";

// Helpers
function drawArrow(dir) {
  if (!dir) return;
  ctx.fillStyle = "#fff";

  // Sized for small matrix
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const size = Math.floor(Math.min(width, height) * 0.45); // about 12px on 28h

  ctx.beginPath();
  if (dir === "up") {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx - size, cy + size);
    ctx.lineTo(cx + size, cy + size);
  } else if (dir === "down") {
    ctx.moveTo(cx, cy + size);
    ctx.lineTo(cx - size, cy - size);
    ctx.lineTo(cx + size, cy - size);
  } else if (dir === "left") {
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy - size);
    ctx.lineTo(cx + size, cy + size);
  } else if (dir === "right") {
    ctx.moveTo(cx + size, cy);
    ctx.lineTo(cx - size, cy - size);
    ctx.lineTo(cx - size, cy + size);
  }
  ctx.closePath();
  ctx.fill();
}

function drawLookLabel(dir) {
  if (!dir) return;
  const label = dir.toUpperCase(); // LEFT or RIGHT

  // Fit text to 84x28
  // Height budget: leave 1px padding top and bottom
  const maxH = height - 2;
  const maxW = width - 2;

  let size = Math.floor(maxH); // start from full height
  const family = "Px437_ACM_VGA, monospace";

  // Reduce until both width and height fit
  do {
    ctx.font = `bold ${size}px ${family}`;
    // measureText height is not reliable, but we control by font size vs maxH
    size -= 1;
  } while (size > 6 && ctx.measureText(label).width > maxW);

  // Centered
  ctx.fillStyle = "#fff";
  ctx.fillText(label, Math.floor(width / 2), Math.floor(height / 2));
}

// Ticker
const ticker = new Ticker({ fps: FPS });

ticker.start(({ deltaTime, elapsedTime }) => {
  console.clear();
  console.time("Write frame");
  console.log(`Rendering a ${width}x${height} canvas`);
  console.log("View at http://localhost:3000/view");
  console.log("State:", { move: currentMove, look: currentLook });

 
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // laat arrow zien
  drawArrow(currentMove);

  // laat text zien op het scherm
  drawLookLabel(currentLook);

  // Convert to binary
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const bin = brightness > 127 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = bin;
    data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Output
  if (IS_DEV) {
    fs.writeFileSync(path.join(outputDir, "frame.png"), canvas.toBuffer("image/png"));
  } else {
    const dd = ctx.getImageData(0, 0, display.width, display.height);
    display.setImageData(dd);
    if (display.isDirty()) display.flush();
  }

  console.log(`Elapsed time: ${(elapsedTime / 1000).toFixed(2)}s`);
  console.log(`Delta time: ${deltaTime.toFixed(2)}ms`);
  console.timeEnd("Write frame");
});
