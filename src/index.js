import { Ticker } from "./ticker.js";
import { createCanvas, registerFont } from "canvas";
import fs from "node:fs";
import path from "node:path";
import { FPS, LAYOUT } from "./settings.js";
import { Display } from "@owowagency/flipdot-emu";
import "./preview.js";

const IS_DEV = process.argv.includes("--dev");

/* =========================
   TYPEDEFS (JSDoc)
   Korte types om de spelkern duidelijker te maken.
========================= */

/**
 * Mogelijke symbolen op de rollen.
 * @typedef {"bigdot"|"smalldot"|"plus"|"minus"} SymbolId
 */

/**
 * Grid-coördinaat [rij, kolom].
 * @typedef {[number, number]} Cell
 */

/**
 * Een uitbetalingslijn bestaat uit 3 grid-cellen.
 * @typedef {Cell[]} Payline
 */

/**
 * Interne toestand van één rol.
 * @typedef {Object} ReelState
 * @property {boolean} spinning  - Rol draait nu
 * @property {number}  offset    - Verticale pixelverschuiving binnen de cel
 * @property {number}  speed     - Pixels per seconde
 * @property {boolean} decel     - Bezig met vertragen richting stop
 * @property {boolean} snap      - Op de volgende celgrens stoppen
 */

// ========== Debug toggles (alleen voor spelinspectie, niet voor weergave) ==========
let DEBUG = true;
const DEBUG_SNAPSHOT_EVERY = 5;
const DEBUG_LOG_TO_CONSOLE = true;
const DEBUG_WRITE_HUD = true && IS_DEV;
const DEBUG_DET_RNG = false;
let RNG_SEED = 1337;

/** Eenvoudige deterministische RNG voor reproduceerbare spins. */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = DEBUG_DET_RNG ? mulberry32(RNG_SEED) : Math.random;

// Eventlog voor snelle diagnose van spin-flow.
const EV_LOG = [];
const MAX_LOG = 80;
function logEv(nowMs, msg) {
  const line = `[${(nowMs / 1000).toFixed(3)}] ${msg}`;
  EV_LOG.push(line);
  if (EV_LOG.length > MAX_LOG) EV_LOG.shift();
  if (DEBUG_LOG_TO_CONSOLE && DEBUG) console.log(line);
}

/* =========================
   Display en canvassen
   (rendercode bewust onverklaard gehouden)
========================= */
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
ctx.font = "18px monospace";
ctx.textBaseline = "top";

const dbgCanvas = createCanvas(360, 200);
const dctx = dbgCanvas.getContext("2d");

/* =========================
   SLOT CONFIG (spelgrid en symbolen)
   Spel is 4 rijen x 3 kolommen. Elke kolom heeft een eigen buffer
   die omhoog schuift tijdens spinnen. RNG is gelijk verdeeld over SYMBOLS,
   dus elke hit is puur kansgestuurd zonder gewichten.
========================= */
const ROWS = 4;
const COLS = 3;
/** @type {SymbolId[]} */
const SYMBOLS = ["bigdot", "smalldot", "plus", "minus"];

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

/**
 * Elke kolom houdt ROWS zichtbare items + 2 extra bij.
 * Tijdens scrollen pushen we bovenaan een nieuw RNG-symbool en poppen onderaan.
 * Zo krijg je een echte rolbeleving per kolom en geen global shuffle.
 */
const columnBuffers = Array.from({ length: COLS }, () =>
  Array.from({ length: ROWS + 2 }, () => randSymbol())
);

/**
 * Reellogica per kolom. We sturen snelheid en offset in pixels.
 * Stoppen gebeurt op celgrenzen om harde snaps te voorkomen.
 * @type {ReelState[]}
 */
const reels = Array.from({ length: COLS }, () => ({
  spinning: false,
  offset: 0,
  speed: 0,
  decel: false,
  snap: false,
}));

// Snelheden zijn afgeleid van celhoogte zodat het op elk raster passend voelt.
const FAST_SPEED = CELL_H * 8;   // snelle fase
const SLOW_SPEED = CELL_H * 3;   // langzame fase net voor stoppen
const DECEL_RATE = CELL_H * 30;  // constante vertraging

/* =========================
   Spin lifecycle en kettingstop
   We starten alle rollen tegelijk, maar laten ze links-naar-rechts stoppen.
   Stoppen gebeurt in twee fasen:
   1) decel: snelheid daalt tot SLOW_SPEED
   2) snap: zodra een celgrens wordt gepasseerd, valt de rol precies in het raster en stopt
========================= */
let spinActive = false;
let chainIndex = -1;          // kolom die als volgende in decel gaat
let chainCountdownMs = 0;     // countdown tot decel van chainIndex

const FIRST_DECEL_DELAY = 700;   // wachttijd na start voor kolom 0
const BETWEEN_DECEL_DELAY = 250; // kleine pauze tussen kolommen

// Scorestate voor blink en tijdsvenster tonen
let winningLines = [];
let blinkStart = 0;
let showWinsUntil = 0;

/**
 * Paylines: alle horizontale 3-in-een-rij, 4 diagonalen en verticale 3-stroken.
 * Zo dekken we logische combinaties op een 4x3 grid.
 * @type {Payline[]}
 */
const paylines = (() => {
  const lines = [];

  // horizontaal (4 rijen)
  for (let r = 0; r < ROWS; r++) lines.push([[r, 0], [r, 1], [r, 2]]);

  // diagonalen
  lines.push(
    [[0,0],[1,1],[2,2]],
    [[1,0],[2,1],[3,2]],
    [[3,0],[2,1],[1,2]],
    [[2,0],[1,1],[0,2]],
  );

  // verticaal: twee per kolom in 4-rijen grid
  for (let c = 0; c < COLS; c++) {
    lines.push([[0,c],[1,c],[2,c]]);
    lines.push([[1,c],[2,c],[3,c]]);
  }

  return lines;
})();

/* =========================
   Helpers voor RNG en grid
========================= */

/** Trek een willekeurig symbool met gelijke kans. */
function randSymbol() {
  return SYMBOLS[(rnd() * SYMBOLS.length) | 0];
}

/** Schuif één item omhoog in de kolom en voeg bovenaan nieuw RNG-symbool toe. */
function shiftUp(col) {
  columnBuffers[col].push(randSymbol());
  columnBuffers[col].shift();
}

/** Maak een zichtbaar 4x3 grid snapshot uit de kolombuffers. */
function currentGrid() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill("bigdot"));
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) grid[r][c] = columnBuffers[c][r];
  }
  return grid;
}

/**
 * Check alle paylines. Een lijn telt als alle drie symbolen exact gelijk zijn.
 * Geen wilds of multipliers. Simpel en eerlijk.
 * @returns {Payline[]}
 */
function evaluateWins() {
  const g = currentGrid();
  const wins = [];
  for (const line of paylines) {
    const [a, b, d] = line;
    const s1 = g[a[0]][a[1]];
    const s2 = g[b[0]][b[1]];
    const s3 = g[d[0]][d[1]];
    if (s1 === s2 && s2 === s3) wins.push(line);
  }
  return wins;
}

/* =========================
   Commands vanuit preview (spin, pause, debug)
========================= */
let pendingSpin = false;
let paused = false;
let stepFrames = 0;

function readJsonSafe(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function pollCommands(nowMs) {
  const cmdPath = path.join(outputDir, "cmd.json");
  if (!fs.existsSync(cmdPath)) return;

  let raw = readJsonSafe(cmdPath);
  try { fs.unlinkSync(cmdPath); } catch {}

  // accepteer zowel {action:"spin"} als {spin:timestamp}
  let action = "";
  if (raw && typeof raw.action === "string") action = raw.action.toLowerCase();
  else if (raw && (raw.spin !== undefined)) action = "spin";

  switch (action) {
    case "spin":
      pendingSpin = true;
      logEv(nowMs, "cmd: spin");
      break;
    case "pause":
      paused = true;
      logEv(nowMs, "cmd: pause");
      break;
    case "resume":
      paused = false;
      stepFrames = 0;
      logEv(nowMs, "cmd: resume");
      break;
    case "step":
      stepFrames = Math.max(1, (raw?.frames|0));
      paused = true;
      logEv(nowMs, `cmd: step ${stepFrames}`);
      break;
    case "dump":
      writeStateSnapshot(nowMs, true);
      if (DEBUG_WRITE_HUD) writeDebugHud(nowMs, true);
      logEv(nowMs, "cmd: dump snapshot");
      break;
    case "toggledebug":
      DEBUG = !DEBUG;
      logEv(nowMs, `cmd: toggleDebug -> ${DEBUG}`);
      break;
    case "":
      logEv(nowMs, `cmd: unknown shape -> ${JSON.stringify(raw)}`);
      break;
    default:
      logEv(nowMs, `cmd: unknown action -> ${JSON.stringify(raw)}`);
  }
}

/* =========================
   SPIN CONTROL
   Start alle rollen, decel in ketting, stop exact op celgrenzen.
   Belangrijk: we zetten decel maar één keer per rol. Zodra snap gewapend is
   mag decel niet opnieuw getriggerd worden. Daarmee voorkomen we oneindig draaien.
========================= */

/** Start een nieuwe spin als er geen rollen meer draaien. */
function tryStartSpin(nowMs) {
  if (spinActive || reels.some(r => r.spinning)) return;

  winningLines = [];
  showWinsUntil = 0;
  blinkStart = nowMs;

  // fase 1: alle rollen gaan hard draaien
  spinActive = true;
  for (let c = 0; c < COLS; c++) {
    const r = reels[c];
    r.spinning = true;
    r.offset = 0;
    r.speed = FAST_SPEED;
    r.decel = false;
    r.snap = false;
  }

  // fase 2: kettingvertraging vanaf kolom 0
  chainIndex = 0;
  chainCountdownMs = FIRST_DECEL_DELAY;

  logEv(nowMs, "spin: start");
}

/** Zet één rol in de vertraag-fase, maar alleen als dat nog niet gebeurd is. */
function startDecelFor(index, nowMs) {
  const r = reels[index];
  // belangrijk voor stabiliteit: niet hertriggeren
  if (!r.spinning) return;
  if (r.snap) {
    logEv(nowMs, `reel${index}: decel genegeerd (snap al gewapend)`);
    return;
  }
  if (r.decel) return;

  r.decel = true;
  logEv(nowMs, `reel${index}: decel`);
}

/**
 * Werk één rol bij:
 * - tijdens decel: snelheid daalt tot SLOW_SPEED
 * - bij celgrens met snap: rol stopt netjes uitgelijnd
 */
function updateReel(c, dt, nowMs) {
  const r = reels[c];
  if (!r.spinning) return;

  // decel tot SLOW_SPEED, daarna op volgende celgrens stoppen
  if (r.decel && !r.snap) {
    const prev = r.speed;
    r.speed = Math.max(SLOW_SPEED, r.speed - DECEL_RATE * dt);
    if (prev !== r.speed && r.speed <= SLOW_SPEED + 0.01) {
      r.speed = SLOW_SPEED;
      r.snap = true;
      r.decel = false;
      logEv(nowMs, `reel${c}: snap armed`);
    }
  }

  // beweging in pixels
  r.offset += r.speed * dt;

  // telkens als we een celhoogte passeren schuift de kolom 1 item
  let shifts = 0;
  while (r.offset >= CELL_H) {
    r.offset -= CELL_H;
    shiftUp(c);
    shifts++;

    // als snap actief is bij een celgrens, dan stoppen we hard en netjes uitgelijnd
    if (r.snap) {
      r.offset = 0;
      r.speed = 0;
      r.spinning = false;
      r.snap = false;

      // activeer kettingtimer voor volgende kolom
      if (c === chainIndex) {
        chainIndex++;
        if (chainIndex < COLS) chainCountdownMs = BETWEEN_DECEL_DELAY;
      }
      logEv(nowMs, `reel${c}: stop (shifts=${shifts})`);
      break;
    }
  }
  if (shifts > 1) {
    logEv(nowMs, `reel${c}: overshoot shifts=${shifts} dt=${dt.toFixed(4)}s`);
  }
}

/** Verwerk countdown voor kettingvertraging en bepaal wanneer alles stil staat. */
function updateChain(dt, nowMs) {
  if (!spinActive) return;

  if (chainIndex >= 0 && chainIndex < COLS) {
    chainCountdownMs -= dt * 1000;
    const r = reels[chainIndex];
    // alleen triggeren als de rol nog niet in decel of snap zit
    if (chainCountdownMs <= 0 && r.spinning && !r.decel && !r.snap) {
      startDecelFor(chainIndex, nowMs);
    }
  }

  // Scoren zodra alle rollen stilstaan. Evaluatie is puur op gelijkheid per lijn.
  if (reels.every(r => !r.spinning)) {
    spinActive = false;
    winningLines = evaluateWins();
    blinkStart = nowMs;
    showWinsUntil = nowMs + 1800;
    logEv(nowMs, `spin: all stopped, wins=${winningLines.length}`);
  }
}


function drawGrid() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(PLAY_X - 1, PLAY_Y - 1, PLAY_W + 2, PLAY_H + 2);

  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) {
    const x = PLAY_X + c * CELL_W + 0.5;
    ctx.beginPath(); ctx.moveTo(x, PLAY_Y); ctx.lineTo(x, PLAY_Y + PLAY_H); ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    const y = PLAY_Y + r * CELL_H + 0.5;
    ctx.beginPath(); ctx.moveTo(PLAY_X, y); ctx.lineTo(PLAY_X + PLAY_W, y); ctx.stroke();
  }
}

function drawSymbol(type, cx, cy) {
  const bigR  = Math.max(2, Math.floor(CELL_H * 0.25));
  const smallR= Math.max(1, Math.floor(CELL_H * 0.10));
  const bar   = Math.max(1, Math.floor(CELL_H * 0.20));
  const len   = Math.max(2, Math.floor(CELL_H * 0.40));

  if (type === "bigdot")   { ctx.beginPath(); ctx.arc(cx, cy, bigR, 0, Math.PI*2); ctx.fill(); return; }
  if (type === "smalldot") { ctx.beginPath(); ctx.arc(cx, cy, smallR, 0, Math.PI*2); ctx.fill(); return; }
  if (type === "plus")  { ctx.fillRect(cx - Math.floor(bar/2), cy - len, bar, len*2 + 1);
                          ctx.fillRect(cx - len, cy - Math.floor(bar/2), len*2 + 1, bar); return; }
  if (type === "minus") { ctx.fillRect(cx - len, cy - Math.floor(bar/2), len*2 + 1, bar); return; }
}

function drawReels() {
  ctx.fillStyle = "#fff";
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS; r++) {
      const sym = columnBuffers[c][r];
      const x = PLAY_X + c * CELL_W;
      const yTop = PLAY_Y + r * CELL_H - reels[c].offset;
      const cx = x + Math.floor(CELL_W / 2);
      const cy = yTop + Math.floor(CELL_H / 2);
      drawSymbol(sym, cx, cy);
    }
  }
}

function drawWinningLines(nowMs) {
  if (!winningLines.length) return;
  if (showWinsUntil && nowMs > showWinsUntil) return;

  const blinkOn = Math.floor((nowMs - blinkStart) / 250) % 2 === 0;

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = blinkOn ? 2 : 1;

  for (const line of winningLines) {
    const pts = line.map(([r, c]) => {
      const x = PLAY_X + c * CELL_W + Math.floor(CELL_W / 2);
      const y = PLAY_Y + r * CELL_H + Math.floor(CELL_H / 2);
      return [x, y];
    });
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.stroke();

    if (blinkOn) {
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
      }
    }
  }
}

/* =========================
   STATE SNAPSHOT + HUD (debug)
========================= */
function stateObj(nowMs, dt, instFps) {
  return {
    nowMs,
    dt,
    fps: instFps,
    spinActive,
    chainIndex,
    chainCountdownMs,
    reels: reels.map((r, i) => ({
      i,
      spinning: r.spinning,
      decel: r.decel,
      snap: r.snap,
      speed: Number(r.speed.toFixed(3)),
      offset: Number(r.offset.toFixed(3)),
    })),
    grid: currentGrid(),
    wins: winningLines,
    eventsTail: EV_LOG.slice(-10),
  };
}

function writeStateSnapshot(nowMs, force = false) {
  if (!DEBUG && !force) return;
  const snap = JSON.stringify(stateObj(nowMs, lastDtSec, instFps), null, 2);
  const tmp = path.join(outputDir, "state.tmp");
  const final = path.join(outputDir, "state.json");
  fs.writeFile(tmp, snap, err => {
    if (!err) fs.rename(tmp, final, () => {});
  });
}

function writeDebugHud(nowMs, force = false) {
  if (!DEBUG || !DEBUG_WRITE_HUD) return;
  dctx.fillStyle = "#111";
  dctx.fillRect(0, 0, dbgCanvas.width, dbgCanvas.height);
  dctx.fillStyle = "#0f0";
  dctx.font = "12px monospace";

  let y = 16;
  const line = (t) => { dctx.fillText(t, 10, y); y += 14; };

  line(`time: ${(nowMs/1000).toFixed(3)}s  dt: ${lastDtSec.toFixed(4)}s  fps~ ${instFps.toFixed(1)}`);
  line(`spin: ${spinActive}  chainIndex: ${chainIndex}  countdown: ${Math.max(0, chainCountdownMs|0)}ms`);
  for (let i = 0; i < COLS; i++) {
    const r = reels[i];
    line(`reel${i}: spin=${r.spinning} decel=${r.decel} snap=${r.snap} speed=${r.speed.toFixed(2)} off=${r.offset.toFixed(2)}`);
  }
  if (winningLines.length) line(`wins: ${JSON.stringify(winningLines)}`);

  y += 8;
  dctx.fillStyle = "#0af";
  dctx.fillText("events:", 10, y); y += 14;
  dctx.fillStyle = "#bbb";
  const tail = EV_LOG.slice(-8);
  for (const s of tail) { dctx.fillText(s, 10, y); y += 14; }

  const tmp = path.join(outputDir, "debug.tmp");
  const final = path.join(outputDir, "debug.png");
  const buf = dbgCanvas.toBuffer("image/png");
  fs.writeFile(tmp, buf, err => {
    if (!err) fs.rename(tmp, final, () => {});
  });
}


const ticker = new Ticker({ fps: FPS });
let frameNo = 0;
let lastNowMs = 0;
let lastDtSec = 0;
let instFps = FPS;

ticker.start(({ deltaTime, elapsedTime }) => {
  // deltaTime is genormaliseerd op target FPS, dus dt = normalized / FPS
  const dt = Math.min(deltaTime / FPS, 0.1);
  const nowMs = elapsedTime;

  if (lastNowMs) {
    const msDelta = nowMs - lastNowMs;
    if (msDelta > 0) instFps = 1000 / msDelta;
  }
  lastNowMs = nowMs;
  lastDtSec = dt;

  if (DEBUG && dt > 0.08) logEv(nowMs, `dt spike ${dt.toFixed(4)}s`);

  // commands
  pollCommands(nowMs);

  // pauze en stepping
  if (paused && stepFrames <= 0) {
    drawAndBlit(nowMs);
    return;
  }
  if (paused && stepFrames > 0) stepFrames--;

  // spin start als command kwam
  if (pendingSpin) {
    tryStartSpin(nowMs);
    pendingSpin = false;
  }

  // spelupdate: ketting en rollen
  updateChain(dt, nowMs);
  for (let c = 0; c < COLS; c++) updateReel(c, dt, nowMs);

  // render en output
  drawAndBlit(nowMs);

  // periodieke debugfiles
  frameNo++;
  if (DEBUG && (frameNo % DEBUG_SNAPSHOT_EVERY === 0)) {
    writeStateSnapshot(nowMs);
    if (DEBUG_WRITE_HUD) writeDebugHud(nowMs);
  }
});

function drawAndBlit(nowMs) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  drawGrid();
  drawReels();
  drawWinningLines(nowMs);

  // posterize naar zwart wit voor flipdots
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const binary = brightness > 127 ? 255 : 0;
    data[i] = binary; data[i + 1] = binary; data[i + 2] = binary; data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  if (IS_DEV) {
    const tmp = path.join(outputDir, "frame.tmp");
    const final = path.join(outputDir, "frame.png");
    const buf = canvas.toBuffer("image/png");
    fs.writeFile(tmp, buf, err => {
      if (!err) fs.rename(tmp, final, () => {});
    });
  } else {
    const img = ctx.getImageData(0, 0, display.width, display.height);
    display.setImageData(img);
    if (display.isDirty()) display.flush();
  }
}