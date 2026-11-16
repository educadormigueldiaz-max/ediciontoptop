#!/bin/sh
# Programa en este Mac la revisión de canales libres cada 2 meses (día 16 de ene, mar, may, jul, sep y nov,
# 10 a. m.). Si el Mac está apagado o dormido a esa hora, corre apenas se despierte.
# Quitarla: launchctl bootout gui/$(id -u)/com.kreo.canales-libres && rm ~/Library/LaunchAgents/com.kreo.canales-libres.plist
set -e
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
NODE="$(command -v node)"
PLIST="$HOME/Library/LaunchAgents/com.kreo.canales-libres.plist"
MESES=""
for m in 1 3 5 7 9 11; do
  MESES="$MESES<dict><key>Month</key><integer>$m</integer><key>Day</key><integer>16</integer><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>"
done
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.kreo.canales-libres</string>
  <key>ProgramArguments</key><array>
    <string>$NODE</string><string>$AQUI/actualizar.mjs</string><string>--publicar</string>
  </array>
  <key>WorkingDirectory</key><string>$RAIZ</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$(dirname "$NODE"):/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>StartCalendarInterval</key><array>$MESES</array>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/kreo-canales-libres.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/kreo-canales-libres.log</string>
</dict></plist>
EOF
launchctl bootout "gui/$(id -u)/com.kreo.canales-libres" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Listo: la revisión de canales libres corre cada 2 meses (próxima: 16 de enero)."
