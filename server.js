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
const hostIP = getLocalIP();

try {
  const sslOptions = {
    key: fs.readFileSync("certs/localhost.key"),
    cert: fs.readFileSync("certs/localhost.crt"),
  };

  https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
    console.log("--- Server is running ---");
    console.log(`Phone Controller: https://${hostIP}:${PORT}`);
    console.log(`Laptop Display:   https://${hostIP}:${PORT}/laptop`);
    console.log("-------------------------");
  });

} catch (err) {
  console.error("\nERROR: SSL certificate not found.");
  console.error("Please generate certs/localhost.crt and certs/localhost.key");
}
