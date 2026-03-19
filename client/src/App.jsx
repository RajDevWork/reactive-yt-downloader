import { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState(null);
  const [format, setFormat] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [jobId] = useState(Date.now().toString());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    socket.on(jobId, (data) => {
      setProgress(parseFloat(data.progress));
    });
  }, []);

  const preview = async () => {
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/preview", { url });
      setVideo(res.data);
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
  try {
    setDownloading(true);   // 🔥 loading start
    setProgress(0);

    const res = await axios.post(
      "http://localhost:5000/api/download",
      { url, format, jobId },
      {
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percent); // ⚡ fallback progress
          }
        },
      }
    );

    // 🔥 create file
    const blob = new Blob([res.data]);
    const link = document.createElement("a");

    const fileName = video?.title
      ? video.title.replace(/[^\w\s]/gi, "") + ".mp4"
      : "video.mp4";

    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // cleanup
    link.remove();
    window.URL.revokeObjectURL(link.href);

  } catch (err) {
    console.error(err);
    alert("Download failed ❌");
  } finally {
    setDownloading(false); // 🔥 loading end
  }
};

  const uniqueFormats = video
    ? Array.from(
        new Map(
          video.formats.map((f) => [f.quality, f])
        ).values()
      )
    : [];



  return (
    <div className="min-h-screen flex flex-col items-center pt-32 pb-10 bg-[#050505] relative overflow-hidden">

  {/* 🔥 NAVBAR */}
  <div className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-black/20 border-b border-white/10">
    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
      <div className="flex items-center gap-3 cursor-pointer group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
          🎬
        </div>
        <span className="text-lg font-semibold tracking-wide bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
          Reactive TubeX Downloader
        </span>
      </div>
    </div>
  </div>

  {/* 🌈 BACKGROUND GLOW */}
  <div className="absolute w-[600px] h-[600px] bg-purple-600 opacity-30 blur-[150px] top-[-150px] left-[-150px]" />
  <div className="absolute w-[500px] h-[500px] bg-blue-600 opacity-30 blur-[150px] bottom-[-150px] right-[-150px]" />

  {/* 💎 MAIN CARD */}
  <div className="relative w-full max-w-2xl min-h-[100px] max-h-[620px] overflow-auto scrollbar-hide p-[1px] rounded-3xl bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500">

    <div className="bg-[#0b0b0b]/90 backdrop-blur-2xl rounded-3xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)]">

      {/* 🔥 TITLE */}
      <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
        🎬 YouTube Downloader
      </h1>

      {/* INPUT */}
      <div className="flex gap-3">
        <input
          placeholder="Paste YouTube URL..."
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 px-4 py-3 text-white rounded-xl bg-[#111] border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
        />

        <button
          onClick={preview}
          disabled={loading || !url}
          className={`relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden group shadow-lg transition-all 
          ${loading || !url
            ? "bg-gray-600 cursor-not-allowed" 
            : "bg-gradient-to-r from-purple-500 cursor-pointer to-blue-500 hover:scale-105"}
          `}
          
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Loading...
            </div>
          ) : (
            <span>Preview</span>
          )}
        </button>
      </div>



      {/* 🔥 SKELETON */}
      {loading && !video && (
        <div className="mt-8 animate-pulse">
          <div className="w-full h-48 bg-gray-800 rounded-xl mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-10 bg-gray-800 rounded mb-3"></div>
          <div className="h-10 bg-gray-800 rounded"></div>
        </div>
      )}

      {/* 🎥 VIDEO */}
      {video && !loading && (
        <div className="mt-8 animate-fadeIn">

          <div className="rounded-xl overflow-hidden shadow-xl">
            <img
              src={video.thumbnail}
              className="w-full hover:scale-105 transition duration-500"
            />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-gray-200">
            {video.title}
          </h2>

          {/* ✅ FIXED SELECT */}
          <div className="mt-4">
          <p className="text-sm text-gray-400 mb-2">Select Quality</p>

          <div className="flex flex-wrap gap-2">
            {uniqueFormats.map((f, i) => (
              <button
                key={i}
                onClick={() => setFormat(f.id)}
                className={`px-4 py-2 rounded-lg text-sm transition-all border
                ${
                  format === f.id
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent shadow-lg"
                    : "bg-[#111] text-gray-300 border-gray-700 hover:border-purple-500"
                }`}
              >
                {f.quality}
              </button>
            ))}
          </div>
        </div>

          {/* DOWNLOAD */}
          <button
              onClick={download}
              disabled={!format || downloading}
              className={`relative w-full mt-5 py-3 rounded-xl font-semibold text-white overflow-hidden group transition-all duration-300
              ${
                !format || downloading
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-400 hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.5)]"
              }
              `}
            >
              {downloading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Downloading...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4C16.5523 4 17 4.44772 17 5V9.2L22.2133 5.55071C22.4395 5.39235 22.7513 5.44737 22.9096 5.6736C22.9684 5.75764 23 5.85774 23 5.96033V18.0397C23 18.3158 22.7761 18.5397 22.5 18.5397C22.3974 18.5397 22.2973 18.5081 22.2133 18.4493L17 14.8V19C17 19.5523 16.5523 20 16 20H2C1.44772 20 1 19.5523 1 19V5C1 4.44772 1.44772 4 2 4H16ZM15 6H3V18H15V6ZM10 8V12H13L9 16L5 12H8V8H10ZM21 8.84131L17 11.641V12.359L21 15.1587V8.84131Z"></path></svg> Download Video
                </span>
              )}

              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-white/10 blur-xl"></span>
            </button>

          {/* PROGRESS */}
          {progress > 0 && (
            <div className="mt-5">
              <div className="w-full h-3 bg-[#111] rounded-full overflow-hidden border border-gray-700">
                <div
                  className="h-3 bg-gradient-to-r from-purple-500 via-blue-500 to-green-400 shadow-[0_0_10px_rgba(99,102,241,0.7)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-sm text-gray-400 mt-2 text-right">
                {progress.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
    
  </div>
  {!video && !loading && (
      <div className="mt-6 p-4 w-full max-w-2xl rounded-xl bg-white/5 border border-white/10 text-center animate-fadeIn">

        <p className="text-lg text-gray-300">
          🚀 Paste a YouTube link and download videos instantly
        </p>

        <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
          <span>⚡ Fast</span>
          <span>🎬 HD Quality</span>
          <span>🔒 Secure</span>
        </div>

      </div>
    )}
</div>
  );
}

export default App;