#!/bin/bash
# Full verification script: start server, login, navigate, screenshot combobox
set +e
cd /home/z/my-project
export DATABASE_URL="postgresql://neondb_owner:npg_5M1kVGKLoUCH@ep-restless-brook-azfq9kz1-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Kill any stale server
pkill -f "next dev" 2>/dev/null
sleep 1

# Start server fresh
nohup bun run dev > dev.log 2>&1 &
SRV_PID=$!
echo "server pid=$SRV_PID"

# Wait for server to be ready (max 30s)
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|307"; then
    echo "server ready after ${i}s"
    break
  fi
  sleep 1
done

# Open login page
agent-browser open http://localhost:3000 2>&1 | tail -1
sleep 2

# Login
agent-browser snapshot -i 2>&1 | grep -E "Username|Password|Masuk"
agent-browser type @e2 "admin" 2>&1 | tail -1
agent-browser type @e4 "admin123" 2>&1 | tail -1
agent-browser click @e3 2>&1 | tail -1
sleep 4
echo "=== URL AFTER LOGIN ==="
agent-browser get url 2>&1 | tail -1

# Snapshot dashboard to find nav
echo "=== DASHBOARD SNAPSHOT ==="
agent-browser snapshot -i 2>&1 | grep -iE "button|Pesanan|Toko|Inventaris" | head -30

# Find and click the Toko nav button (it has sub-menu Pesanan)
echo "=== LOOKING FOR TOKO BUTTON ==="
TOKO_REF=$(agent-browser snapshot -i 2>&1 | grep -i 'button "Toko"' | head -1 | grep -oP '@e\d+')
echo "Toko ref: $TOKO_REF"
agent-browser click "$TOKO_REF" 2>&1 | tail -1
sleep 3
echo "=== AFTER TOKO CLICK ==="
agent-browser snapshot -i 2>&1 | head -30

echo "=== SCREENSHOT: TOKO PAGE ==="
agent-browser screenshot /home/z/my-project/tool-results/verify-toko-page.png 2>&1 | tail -1

echo "=== DONE ==="
# Keep server alive briefly so we can see it
sleep 2
echo "=== FINAL SERVER STATUS ==="
ss -tln 2>/dev/null | grep 3000 || echo "server gone"
