import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import { spawn } from "child_process";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// ================= DB =================
mongoose.connect("mongodb://127.0.0.1:27017/ytdown");

// ================= MODELS =================
const User = mongoose.model("User", {
  email: String,
  password: String,
});

const Download = mongoose.model("Download", {
  userId: String,
  url: String,
  createdAt: { type: Date, default: Date.now },
});

// ================= AUTH =================
app.post("/api/signup", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ email: req.body.email, password: hash });
  res.json(user);
});

app.post("/api/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const ok = await bcrypt.compare(req.body.password, user.password);

  if (!ok) return res.status(401).json({ error: "Invalid" });

  const token = jwt.sign({ id: user._id }, "secret");
  res.json({ token });
});

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

// ================= DOWNLOAD STREAM =================
app.post("/api/download", (req, res) => {
  const { url, format, jobId } = req.body;

  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");

  const process = spawn("./yt-dlp.exe", [
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

    if (match) {
      io.emit(jobId, { progress: match[1] });
    }
  });
});

// ================= HISTORY =================
app.post("/api/history", async (req, res) => {
  const { userId, url } = req.body;
  await Download.create({ userId, url });
  res.json({ success: true });
});

app.get("/api/history/:userId", async (req, res) => {
  const data = await Download.find({ userId: req.params.userId });
  res.json(data);
});

// ================= SOCKET =================
io.on("connection", () => {
  console.log("socket connected");
});

server.listen(5000, () => console.log("Server running"));