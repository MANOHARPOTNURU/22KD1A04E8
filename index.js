import express from "express";
import { Log } from "loggingmiddleware";
import bodyParser from "body-parser";

const app = express();

app.get("/", (req, res) => {
  Log("Root endpoint was hit");
  res.send("Hello, world!");
});

app.use(bodyParser.json());

const urlDatabase = new Map();

function generateShortcode(length = 6) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.post("/shorturls", (req, res) => {
  const { url, validity = 30, shortcode } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let code = shortcode || generateShortcode();
  if (urlDatabase.has(code)) {
    return res.status(409).json({ error: "Shortcode already in use" });
  }

  const expiresAt = Date.now() + validity * 60 * 1000;
  urlDatabase.set(code, { url, expiresAt });

  res.json({
    shortLink: `http://localhost:3000/${code}`,
    expiry: new Date(expiresAt).toISOString(),
  });
});

function trackClicks(req, res, next) {
  const { shortid } = req.params;
  const entry = urlDatabase.get(shortid);
  if (!entry) {
    return res.status(404).json({ error: "Shortcode not found" });
  }
  if (!entry.clicks) entry.clicks = 0;
  if (!entry.clickTimestamps) entry.clickTimestamps = [];
  entry.clicks += 1;
  entry.clickTimestamps.push(Date.now());
  next();
}

app.get("/shorturls/:shortid", trackClicks, (req, res) => {
  const { shortid } = req.params;
  const entry = urlDatabase.get(shortid);
  if (!entry) {
    return res.status(404).json({ error: "Shortcode not found" });
  }
  res.json({
    originalUrl: entry.url,
    createdAt: new Date(entry.expiresAt - 30 * 60 * 1000).toISOString(),
    expiry: new Date(entry.expiresAt).toISOString(),
    totalClicks: entry.clicks || 0,
    clickTimestamps: entry.clickTimestamps || [],
  });
});

app.listen(3000, () => {
  Log("Server running on http://localhost:3000");
});
