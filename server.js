import express from "express";
import cors from "cors";
import os from "os";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

app.use(cors());
app.use(express.json());

// ==========================================
//  SINGLE PLAYER STATE (Legacy)
// ==========================================
let latestData = { cursorX: 0.5, cursorY: 0.5, orientation: { alpha: 0, beta: 0, gamma: 0 } };
let gameState = { playerName: "Player", score: 0, zombiesKilled: 0, shots: 0, shootEvent: null };

// ==========================================
//  MULTIPLAYER STATE (New)
// ==========================================
// Players stored as: { [id]: { id, name, color, orientation: {}, score: 0, lastShootTime: 0, recenter: false } }
let players = {};
const PLAYER_COLORS = ["#FF0000", "#00FF00", "#0088FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500"];
let colorIndex = 0;

// ==========================================
//  ROUTES
// ==========================================

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "static", "index.html")));
app.get("/laptop", (req, res) => res.sendFile(path.join(__dirname, "static", "laptop.html")));
app.get("/laser", (req, res) => res.sendFile(path.join(__dirname, "static", "laser.html")));

// Single Player Pages
app.get("/shooter", (req, res) => res.sendFile(path.join(__dirname, "static", "shooter.html")));
app.get("/shootergame", (req, res) => res.sendFile(path.join(__dirname, "static", "shootergame.html")));

// Multiplayer Pages (New)
app.get("/shooter2", (req, res) => res.sendFile(path.join(__dirname, "static", "shooter2.html")));
app.get("/shootergame2", (req, res) => res.sendFile(path.join(__dirname, "static", "shootergame2.html")));

// --- Single Player Endpoints ---
app.post("/sensor", (req, res) => {
  if (req.body) latestData = { ...latestData, ...req.body };
  res.json({ status: "ok" });
});
app.get("/sensor", (req, res) => res.json(latestData));
app.post("/shoot", (req, res) => {
  const { playerName } = req.body;
  gameState.shootEvent = { timestamp: Date.now(), playerName: playerName || "Player" };
  gameState.shots++;
  if (playerName) gameState.playerName = playerName;
  res.json({ status: "ok", gameState });
});
app.get("/game-state", (req, res) => res.json(gameState));
app.post("/zombie-killed", (req, res) => {
  gameState.zombiesKilled++;
  gameState.score += 10;
  res.json({ status: "ok", gameState });
});
app.post("/reset-game", (req, res) => {
  gameState.score = 0;
  gameState.zombiesKilled = 0;
  gameState.shots = 0;
  res.json({ status: "ok", gameState });
});

// --- Multiplayer Endpoints (Suffix '2') ---

// 1. Player Joins
app.post("/join2", (req, res) => {
  const { name } = req.body;
  const id = Math.random().toString(36).substr(2, 9);
  const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  colorIndex++;

  players[id] = {
    id,
    name: name || `P${Object.keys(players).length + 1}`,
    color,
    score: 0,
    kills: 0,
    orientation: { alpha: 0, beta: 0 },
    cursorX: 0.5,
    cursorY: 0.5,
    lastShootTime: 0,
    recenter: true, // Force recenter on join
    lastSeen: Date.now()
  };

  console.log(`Player joined: ${players[id].name} (${id})`);
  res.json({ id, color });
});

// 2. Receive Sensor Data from a specific player
app.post("/sensor2", (req, res) => {
  const { id, orientation, cursorX, cursorY } = req.body;
  if (players[id]) {
    if (orientation) players[id].orientation = orientation;
    if (cursorX !== undefined) players[id].cursorX = cursorX;
    if (cursorY !== undefined) players[id].cursorY = cursorY;
    players[id].lastSeen = Date.now();
  }
  res.json({ status: "ok" });
});

// 3. Receive Shoot Event
app.post("/shoot2", (req, res) => {
  const { id } = req.body;
  if (players[id]) {
    players[id].lastShootTime = Date.now();
    players[id].lastSeen = Date.now();
  }
  res.json({ status: "ok" });
});

// 4. Recenter Request
app.post("/recenter2", (req, res) => {
  const { id } = req.body;
  if (players[id]) {
    players[id].recenter = true;
  }
  res.json({ status: "ok" });
});

// 5. Game Loop Poll (Returns all players)
app.get("/gamestate2", (req, res) => {
  // Optional: Filter out players not seen in 10 seconds
  const now = Date.now();
  for (const id in players) {
    if (now - players[id].lastSeen > 10000) {
      delete players[id];
    }
  }
  res.json(players);
});

// 6. Record Hit (Client confirms a kill)
app.post("/hit2", (req, res) => {
  const { id, points } = req.body;
  if (players[id]) {
    players[id].score += (points || 10);
    players[id].kills += 1;
  }
  res.json({ status: "ok" });
});

// 7. Reset Multiplayer Game
app.post("/reset2", (req, res) => {
  // Reset scores but keep players
  for (const id in players) {
    players[id].score = 0;
    players[id].kills = 0;
  }
  res.json({ status: "ok" });
});

// ==========================================
//  SERVER START
// ==========================================
const hostIP = getLocalIP();
try {
  const sslOptions = {
    key: fs.readFileSync("certs/localhost.key"),
    cert: fs.readFileSync("certs/localhost.crt"),
  };
  https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
    console.log("--- Zombie Shooter Multiplayer Running ---");
    console.log(`Phone Controller: https://${hostIP}:${PORT}/shooter2`);
    console.log(`Main Display:     https://${hostIP}:${PORT}/shootergame2`);
    console.log("------------------------------------------");
  });
} catch (err) {
  console.error("SSL Error: Ensure certs/localhost.key and .crt exist.");
}