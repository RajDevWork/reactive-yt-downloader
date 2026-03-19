import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { spawn } from "child_process";

// 🔥 ADD THESE
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 🔥 PATH SETUP (IMPORTANT)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= PREVIEW =================
app.post("/api/preview", async (req, res) => {
  const process = spawn("yt-dlp", ["--dump-json", req.body.url]);

  let data = "";
  process.stdout.on("data", (chunk) => (data += chunk));

  process.on("close", () => {
    const json = JSON.parse(data);

    const formats = json.formats
      .filter((f) => f.ext === "mp4" && f.height)
      .map((f) => ({
        id: f.format_id,
        quality: f.height + "p",
      }));

    res.json({
      title: json.title,
      thumbnail: json.thumbnail,
      formats,
    });
  });
});

// ================= DOWNLOAD =================
app.post("/api/download", (req, res) => {
  const { url, format, jobId } = req.body;

  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");

  const process = spawn("yt-dlp", ["-f", format, "-o", "-", url]);

  process.stdout.pipe(res);

  process.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    const match = text.match(/(\d+\.\d+)%/);

    if (match) {
      io.emit(jobId, { progress: match[1] });
    }
  });
});


// ======================================================
// 🔥🔥 STEP-4 (VERY IMPORTANT) — FRONTEND SERVE
// ======================================================

// static files serve
app.use(express.static(path.join(__dirname, "public")));

// React routing fix
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));