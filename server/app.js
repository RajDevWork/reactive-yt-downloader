import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 🔥 PATH SETUP
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 yt-dlp absolute path (SAFE)
const ytdlpPath = path.join(__dirname, "yt-dlp");

// ================= PREVIEW =================
app.post("/api/preview", async (req, res) => {
  try {
    const process = spawn(ytdlpPath, ["--dump-json", req.body.url]);

    let data = "";

    process.stdout.on("data", (chunk) => (data += chunk));

    process.on("close", () => {
      try {
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
      } catch (err) {
        res.status(500).json({ error: "Failed to parse video data" });
      }
    });

  } catch (err) {
    res.status(500).json({ error: "Preview failed" });
  }
});

// ================= DOWNLOAD =================
app.post("/api/download", (req, res) => {
  try {
    const { url, format, jobId } = req.body;

    res.setHeader("Content-Disposition", "attachment; filename=video.mp4");

    const process = spawn(ytdlpPath, ["-f", format, "-o", "-", url]);

    process.stdout.pipe(res);

    process.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(/(\d+\.\d+)%/);

      if (match) {
        io.emit(jobId, { progress: match[1] });
      }
    });

    process.on("error", () => {
      res.status(500).end("Download failed");
    });

  } catch (err) {
    res.status(500).end("Server error");
  }
});


// ======================================================
// 🔥 FRONTEND SERVE (CORRECT POSITION)
// ======================================================

// static files
app.use(express.static(path.join(__dirname, "public")));

// fallback (ONLY for non-api routes)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();

  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));