#!/bin/bash
# Full verification using ref-based type (triggers React onChange)
set +e
cd /home/z/my-project
export DATABASE_URL="postgresql://neondb_owner:npg_5M1kVGKLoUCH@ep-restless-brook-azfq9kz1-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

pkill -f "next dev" 2>/dev/null
sleep 1

nohup bun run dev > dev.log 2>&1 &
echo "server pid=$!"

for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|307"; then
    echo "server ready after ${i}s"
    break
  fi
  sleep 1
done

agent-browser open http://localhost:3000 2>&1 | tail -1
sleep 3

# Helper: extract ref id (e.g. "e20") from a snapshot line like: - button "Toko" [refe20]
extract_ref() {
  echo "$1" | grep -oP 'ref\Ke\d+' | head -1
}

# Snapshot login page
echo "=== LOGIN SNAPSHOT ==="
agent-browser snapshot -i 2>&1 | grep -E "Username|Password|Masuk" | head -3

# Type using refs
agent-browser type @e2 "admin" 2>&1 | tail -1
agent-browser type @e4 "admin123" 2>&1 | tail -1
agent-browser click @e3 2>&1 | tail -1
sleep 5
echo "=== URL AFTER LOGIN ==="
agent-browser get url 2>&1 | tail -1

# Dashboard
DASH=$(agent-browser snapshot -i 2>&1)
INV_LINE=$(echo "$DASH" | grep 'button "Inventaris"' | head -1)
INV_REF=$(extract_ref "$INV_LINE")
echo "Inventaris ref: @$INV_REF"
agent-browser click @"$INV_REF" 2>&1 | tail -1
sleep 4

# Inventaris page - click Gedung tab
INV2=$(agent-browser snapshot -i 2>&1)
GED_LINE=$(echo "$INV2" | grep 'button "Gedung"' | head -1)
GED_REF=$(extract_ref "$GED_LINE")
echo "Gedung ref: @$GED_REF"
agent-browser click @"$GED_REF" 2>&1 | tail -1
sleep 3

echo "=== GEDUNG TABLE ==="
agent-browser snapshot -i 2>&1 | grep -iE "columnheader|Keadaan|Nilai|heading|Tambah" | head -15
agent-browser screenshot /home/z/my-project/tool-results/verify-gedung-asset-table.png 2>&1 | tail -1

# Open Add Gedung dialog
GED2=$(agent-browser snapshot -i 2>&1)
TMB_LINE=$(echo "$GED2" | grep -i 'button "Tambah Gedung"' | head -1)
TMB_REF=$(extract_ref "$TMB_LINE")
echo "Tambah Gedung ref: @$TMB_REF"
agent-browser click @"$TMB_REF" 2>&1 | tail -1
sleep 3

echo "=== ADD GEDUNG DIALOG ==="
DIALOG=$(agent-browser snapshot -i 2>&1)
echo "$DIALOG" | grep -iE "combobox|Keadaan|Tahun|Nilai|Sumber|heading|textbox|label" | head -25
agent-browser screenshot /home/z/my-project/tool-results/verify-gedung-asset-form.png 2>&1 | tail -1

# Test the Keadaan Select - find combobox showing "Baik"
KEADAAN_LINE=$(echo "$DIALOG" | grep -i 'combobox.*Baik' | head -1)
echo "Keadaan line: $KEADAAN_LINE"
KEADAAN_REF=$(extract_ref "$KEADAAN_LINE")
echo "Keadaan ref: @$KEADAAN_REF"
if [ -n "$KEADAAN_REF" ]; then
  agent-browser click @"$KEADAAN_REF" 2>&1 | tail -1
  sleep 1
  echo "=== KEADAAN OPTIONS ==="
  agent-browser snapshot -i 2>&1 | grep -iE "Baik|Rusak|option" | head -8
  agent-browser screenshot /home/z/my-project/tool-results/verify-keadaan-options.png 2>&1 | tail -1
fi
agent-browser press Escape 2>&1 | tail -1
sleep 1
agent-browser press Escape 2>&1 | tail -1
sleep 2

# Go to Ruang tab
RUANG_SNAP=$(agent-browser snapshot -i 2>&1)
RUANG_LINE=$(echo "$RUANG_SNAP" | grep 'button "Ruang"' | head -1)
RUANG_REF=$(extract_ref "$RUANG_LINE")
echo "Ruang ref: @$RUANG_REF"
agent-browser click @"$RUANG_REF" 2>&1 | tail -1
sleep 3

echo "=== RUANG PAGE ==="
RUANG2=$(agent-browser snapshot -i 2>&1)
echo "$RUANG2" | grep -iE "heading|Tambah|columnheader|Keadaan" | head -10

# Open Add Ruang
TMB2_LINE=$(echo "$RUANG2" | grep -i 'button "Tambah' | head -1)
TMB2_REF=$(extract_ref "$TMB2_LINE")
echo "Tambah Ruang ref: @$TMB2_REF"
agent-browser click @"$TMB2_REF" 2>&1 | tail -1
sleep 3

echo "=== ADD RUANG DIALOG ==="
agent-browser snapshot -i 2>&1 | grep -iE "combobox|Keadaan|Tahun|Nilai|Sumber|heading|textbox|label" | head -25
agent-browser screenshot /home/z/my-project/tool-results/verify-ruang-asset-form.png 2>&1 | tail -1

echo "=== DONE ==="
ss -tln 2>/dev/null | grep 3000 || echo "server gone"
