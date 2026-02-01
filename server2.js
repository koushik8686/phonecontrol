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

// ---- Find local IP address ----


app.use(cors());
app.use(express.json());

// ---- In-memory sensor store ----
let latestData = {
  datapoints: 0,
  interval: 0,
  orientation: { alpha: 0, beta: 0, gamma: 0 },
  acceleration: { x: 0, y: 0, z: 0 },
  accelerationIncludingGravity: { x: 0, y: 0, z: 0 },
  rotationRate: { alpha: 0, beta: 0, gamma: 0 },
};

// ---- Routes ----
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.get("/laptop", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "laptop.html"));
});

app.post("/sensor", (req, res) => {
  if (req.body) {
    latestData = req.body;
  }
  res.json({ status: "ok", data: latestData });
});

app.get("/sensor", (req, res) => {
  res.json(latestData);
});

// ---- HTTPS Server ----
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log(`http://[IP_ADDRESS]`);
});