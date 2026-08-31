#!/bin/bash
# Watchdog - berjalan di background, cek server setiap 60 detik
# Jika server hang, restart otomatis

cd /home/z/my-project

HEALTH_URL="http://localhost:3000/api/health"
LOG_FILE="/home/z/my-project/dev.log"
WATCHDOG_LOG="/home/z/my-project/dev-keepalive.log"
MAX_LOG_SIZE=1000000  # 1MB

while true; do
  # Test health endpoint dengan timeout 10 detik
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$HEALTH_URL" 2>/dev/null)

  if [ "$HTTP_CODE" != "200" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server tidak respons (HTTP: $HTTP_CODE). Restarting..." >> "$WATCHDOG_LOG"

    # Kill semua proses next/bun yang stuck
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    pkill -9 -f "bun run dev" 2>/dev/null
    sleep 3

    # Truncate log jika terlalu besar
    if [ -f "$LOG_FILE" ]; then
      LOG_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)
      if [ "$LOG_SIZE" -gt "$MAX_LOG_SIZE" ]; then
        tail -c 500000 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
      fi
    fi

    # Restart dev server
    setsid bash -c 'bun run dev > '"$LOG_FILE"' 2>&1' < /dev/null > /dev/null 2>&1 &
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dev server restarted. PID: $!" >> "$WATCHDOG_LOG"
    sleep 15

    # Verify restart berhasil
    NEW_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$HEALTH_URL" 2>/dev/null)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Health check after restart: $NEW_CODE" >> "$WATCHDOG_LOG"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server OK (HTTP: 200)" >> "$WATCHDOG_LOG"
  fi

  # Cek setiap 60 detik
  sleep 60
done
