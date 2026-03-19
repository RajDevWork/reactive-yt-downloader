import express from "express";
import cors from "cors";
import http from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 🔥 PATH SETUP
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 yt-dlp path (LOCAL FILE)
const isProd = process.env.NODE_ENV === "production";
const ytdlpPath = isProd
  ? path.join(__dirname, "yt-dlp")   // Render (Linux)
  : path.join(__dirname, "yt-dlp.exe"); // Local (Windows)

// ================= PREVIEW =================
app.post("/api/preview", async (req, res) => {
  try {
    console.log("Preview API hit");

    const process = spawn(ytdlpPath, [
                "--dump-single-json",
                "--no-warnings",
                "--no-playlist",
                "--extractor-args",
                "youtube:player_client=android",
                req.body.url,
                ]);

    let data = "";

    process.stdout.on("data", (chunk) => {
      data += chunk;
    });

    process.stderr.on("data", (err) => {
      console.log("yt-dlp stderr:", err.toString());
    });

    process.on("close", () => {
        try {
            if (!data || data.trim() === "") {
            console.log("Empty yt-dlp output");
            return res.status(500).json({ error: "Empty yt-dlp output" });
            }

            const json = JSON.parse(data);

            const formats = json.formats
            .filter((f) => f.ext === "mp4" && f.height)
            .map((f) => ({
                id: f.format_id,
                quality: f.height + "p",
            }));


            if (!json || !json.formats) {
                return res.status(500).json({
                    error: "Video data not available (YouTube blocked request)",
                });
            }


            res.json({
            title: json.title,
            thumbnail: json.thumbnail,
            formats,
            });

        } catch (err) {
            console.log("RAW OUTPUT:", data.slice(0, 500));
            console.log("Parse error:", err.message);

            res.status(500).json({ error: "Failed to parse video data" });
        }
        });

  } catch (err) {
    console.log("Preview error:", err.message);
    res.status(500).json({ error: "Preview failed" });
  }
});


// ================= DOWNLOAD =================
app.post("/api/download", (req, res) => {
  try {
    const { url, format, jobId } = req.body;

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=video.mp4"
    );

    const process = spawn(ytdlpPath, [
      "-f",
      format,
      "-o",
      "-",
      url,
    ]);

    process.stdout.pipe(res);

    process.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(/(\d+\.\d+)%/);
      console.log("yt-dlp stderr:", text);
    });

    process.on("error", () => {
      res.status(500).end("Download failed");
    });

  } catch (err) {
    console.log("Download error:", err.message);
    res.status(500).end("Server error");
  }
});


// ======================================================
// 🔥 FRONTEND SERVE
// ======================================================

// static files
app.use(express.static(path.join(__dirname, "public")));

// fallback (IMPORTANT)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();

  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================


server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);