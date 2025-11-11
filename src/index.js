// index.js
import { Ticker } from "./ticker.js";
import { createCanvas, registerFont } from "canvas";
import fs from "node:fs";
import path from "node:path";
import { FPS, LAYOUT } from "./settings.js";
import { Display } from "@owowagency/flipdot-emu";
import "./preview.js";

const IS_DEV = process.argv.includes("--dev");

const display = new Display({
  layout: LAYOUT,
  panelWidth: 28,
  isMirrored: true,
  transport: !IS_DEV
    ? { type: "serial", path: "/dev/ttyACM0", baudRate: 57600 }
    : { type: "ip", host: "127.0.0.1", port: 3000 },
});

const { width, height } = display;

const outputDir = "./output";
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

registerFont(path.resolve(import.meta.dirname, "../fonts/OpenSans-Variable.ttf"), { family: "OpenSans" });
registerFont(path.resolve(import.meta.dirname, "../fonts/PPNeueMontrealMono-Regular.ttf"), { family: "PPNeueMontreal" });
registerFont(path.resolve(import.meta.dirname, "../fonts/Px437_ACM_VGA.ttf"), { family: "Px437_ACM_VGA" });

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.font = '18px monospace';
ctx.textBaseline = "top";

// ---- SLOT MACHINE ----
const ROWS = 4;
const COLS = 3;
const SYMBOLS = ["circle", "star"];

const MARGIN = 2;
const GRID_TOP = 2;
const GRID_BOTTOM = height - MARGIN;
const GRID_LEFT = MARGIN;
const GRID_RIGHT = width - MARGIN;
const GRID_W = GRID_RIGHT - GRID_LEFT;
const GRID_H = GRID_BOTTOM - GRID_TOP;

const CELL_W = Math.floor(GRID_W / COLS);
const CELL_H = Math.floor(GRID_H / ROWS);
const PLAY_W = CELL_W * COLS;
const PLAY_H = CELL_H * ROWS;
const PLAY_X = GRID_LEFT + Math.floor((GRID_W - PLAY_W) / 2);
const PLAY_Y = GRID_TOP + Math.floor((GRID_H - PLAY_H) / 2);

const columnBuffers = Array.from({ length: COLS }, () =>
  Array.from({ length: ROWS + 3 }, () => randSymbol())
);

let spinning = [false, false, false];
let lastStepAt = [0, 0, 0];
let stepInterval = [40, 40, 40];
let stopTimes = [0, 0, 0];
let showWinsUntil = 0;

const paylines = [
  ...Array.from({ length: ROWS }, (_, r) => [[r, 0], [r, 1], [r, 2]]),
  ...[0, 1].map(r => [[r, 0], [r + 1, 1], [r + 2, 2]]),
  ...[3, 2].map(r => [[r, 0], [r - 1, 1], [r - 2, 2]]),
];

let winningLines = [];
let winBlinkStart = 0;
let winAnimStart = 0;

function randSymbol() {
  return SYMBOLS[(Math.random() * SYMBOLS.length) | 0];
}

function tryStartSpin(now) {
  if (spinning.some(Boolean)) return;
  showWinsUntil = 0;
  startSpin(now);
}

function startSpin(now) {
  spinning = [true, true, true];
  stepInterval = [40, 40, 40];
  stopTimes = [now + 1200, now + 1700, now + 2200];
  lastStepAt = [now, now, now];
  winningLines = [];
  winBlinkStart = now;
  winAnimStart = now;
}

function maybeStopColumns(now) {
  for (let c = 0; c < COLS; c++) {
    if (spinning[c] && now >= stopTimes[c]) {
      stepInterval[c] = 120;
      if (now - lastStepAt[c] >= stepInterval[c]) {
        spinOneStep(c);
        spinning[c] = false;
        lastStepAt[c] = now;
      }
    }
  }
  if (spinning.every(s => s === false) && !showWinsUntil) {
    winningLines = evaluateWins();
    winBlinkStart = now;
    winAnimStart = now;
    showWinsUntil = now + 2000;
  }
}

function spinOneStep(col) {
  columnBuffers[col].unshift(randSymbol());
  columnBuffers[col].pop();
}

function tickSpin(now) {
  for (let c = 0; c < COLS; c++) {
    if (!spinning[c]) continue;
    if (now - lastStepAt[c] >= stepInterval[c]) {
      spinOneStep(c);
      lastStepAt[c] = now;
      stepInterval[c] = Math.min(90, stepInterval[c] + 1);
    }
  }
}

function currentGrid() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill("circle"));
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[r][c] = columnBuffers[c][r];
  return grid;
}

function evaluateWins() {
  const grid = currentGrid();
  const wins = [];
  for (const line of paylines) {
    const [a, b, d] = line;
    const s1 = grid[a[0]][a[1]];
    const s2 = grid[b[0]][b[1]];
    const s3 = grid[d[0]][d[1]];
    if (s1 === s2 && s2 === s3) wins.push(line);
  }
  return wins;
}

// ---- WEB COMMAND POLL (W in preview) ----
function pollSpinCommand() {
  try {
    const cmdPath = path.join(outputDir, "cmd.json");
    if (fs.existsSync(cmdPath)) {
      const txt = fs.readFileSync(cmdPath, "utf8");
      fs.unlinkSync(cmdPath);
      const cmd = JSON.parse(txt);
      if (cmd && cmd.spin) tryStartSpin(performance.now());
    }
  } catch { /* ignore */ }
}

// ---- DRAW ----
function drawGrid() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(PLAY_X - 1, PLAY_Y - 1, PLAY_W + 2, PLAY_H + 2);
  for (let c = 1; c < COLS; c++) {
    const x = PLAY_X + c * CELL_W + 0.5;
    ctx.beginPath(); ctx.moveTo(x, PLAY_Y); ctx.lineTo(x, PLAY_Y + PLAY_H); ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    const y = PLAY_Y + r * CELL_H + 0.5;
    ctx.beginPath(); ctx.moveTo(PLAY_X, y); ctx.lineTo(PLAY_X + PLAY_W, y); ctx.stroke();
  }
}

function drawSymbol(type, cx, cy, size) {
  if (type === "circle") {
    ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill(); return;
  }
  if (type === "star") {
    const spikes = 5, outer = size, inner = Math.max(1, size * 0.5);
    let rot = -Math.PI / 2, step = Math.PI / spikes;
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer); rot += step;
      ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner); rot += step;
    }
    ctx.closePath(); ctx.fill();
  }
}

function drawReels() {
  const grid = currentGrid();
  ctx.fillStyle = "#fff";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = PLAY_X + c * CELL_W;
      const y = PLAY_Y + r * CELL_H;
      const cx = x + Math.floor(CELL_W / 2);
      const cy = y + Math.floor(CELL_H / 2);
      const size = Math.floor(Math.min(CELL_W, CELL_H) * 0.35);
      drawSymbol(grid[r][c], cx, cy, size);
    }
  }
}

function drawAnimatedWinningLines(now) {
  if (!winningLines.length) return;
  if (showWinsUntil && now > showWinsUntil) return;

  // blink on/off
  const blinkOn = Math.floor((now - winBlinkStart) / 180) % 2 === 0;

  // progress 0..1 sweep along each line
  const cycle = 700; // ms
  const t = ((now - winAnimStart) % cycle) / cycle;

  for (const line of winningLines) {
    const pts = line.map(([r, c]) => {
      const x = PLAY_X + c * CELL_W + Math.floor(CELL_W / 2);
      const y = PLAY_Y + r * CELL_H + Math.floor(CELL_H / 2);
      return [x, y];
    });

    // segment lengths
    const lenA = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    const lenB = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    const L = lenA + lenB;
    let d = t * L;

    ctx.lineWidth = blinkOn ? 2 : 1;
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);

    if (d <= lenA) {
      const u = d / lenA;
      const x = pts[0][0] + (pts[1][0] - pts[0][0]) * u;
      const y = pts[0][1] + (pts[1][1] - pts[0][1]) * u;
      ctx.lineTo(x, y);
    } else {
      ctx.lineTo(pts[1][0], pts[1][1]);
      const d2 = d - lenA;
      const u2 = Math.min(1, d2 / lenB);
      const x2 = pts[1][0] + (pts[2][0] - pts[1][0]) * u2;
      const y2 = pts[1][1] + (pts[2][1] - pts[1][1]) * u2;
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // small flashing dots on each node
    if (blinkOn) {
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
      }
    }
  }
}

// ---- LOOP ----
const ticker = new Ticker({ fps: FPS });

ticker.start(({ deltaTime, elapsedTime }) => {
  // read spin command created by preview on W
  pollSpinCommand();

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, width, height);

  if (spinning.some(Boolean)) {
    tickSpin(elapsedTime);
    maybeStopColumns(elapsedTime);
  }

  drawGrid();
  drawReels();
  drawAnimatedWinningLines(elapsedTime);

  // B/W threshold
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const binary = brightness > 127 ? 255 : 0;
    data[i] = binary; data[i + 1] = binary; data[i + 2] = binary; data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  if (IS_DEV) {
    const filename = path.join(outputDir, "frame.png");
    fs.writeFileSync(filename, canvas.toBuffer("image/png"));
  } else {
    const img = ctx.getImageData(0, 0, display.width, display.height);
    display.setImageData(img);
    if (display.isDirty()) display.flush();
  }
});
