#!/bin/bash
# Next.js Dev Server Keeper - auto-restarts when process dies
cd /home/z/my-project
LOG=/home/z/my-project/dev.log

while true; do
  echo "[$(date '+%H:%M:%S')] Starting Next.js dev server..." >> "$LOG"
  NODE_OPTIONS="--max-old-space-size=512" npx next dev -p 3000 >> "$LOG" 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%H:%M:%S')] Server exited (code=$EXIT_CODE). Restarting in 2s..." >> "$LOG"
  sleep 2
done
