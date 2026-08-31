#!/bin/bash
# Auto-restart dev server jika hang/tidak respons
# Cron: */2 * * * * /home/z/my-project/scripts/keep-dev-alive.sh >> /home/z/my-project/dev-keepalive.log 2>&1

cd /home/z/my-project

HEALTH_URL="http://localhost:3000/api/health"
LOG_FILE="/home/z/my-project/dev.log"
MAX_LOG_SIZE=1000000  # 1MB

check_and_restart() {
  # Test health endpoint dengan timeout 10 detik
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$HEALTH_URL" 2>/dev/null)

  if [ "$HTTP_CODE" != "200" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server tidak respons (HTTP: $HTTP_CODE). Restarting..."

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
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dev server restarted. PID: $!"
    sleep 10

    # Verify restart berhasil
    NEW_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$HEALTH_URL" 2>/dev/null)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Health check after restart: $NEW_CODE"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server OK (HTTP: 200)"
  fi
}

check_and_restart
