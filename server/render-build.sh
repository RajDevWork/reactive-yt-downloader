#!/usr/bin/env bash

echo "Installing yt-dlp locally..."

# download yt-dlp in project root
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp

chmod +x yt-dlp

./yt-dlp --version