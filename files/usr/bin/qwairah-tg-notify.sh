#!/bin/sh
CONF="/etc/qwairah_tg.conf"
[ -f "$CONF" ] && . "$CONF"
[ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ] && exit 0

MODE="${1:-boot}"
DETAIL="${2:-}"
RAW_NODE="${NODE_NAME:-$(uci -q get system.@system[0].hostname || echo قويره)}"
MODEM_NAME=$(printf '%s' "$RAW_NODE" | sed 's/QWAIRAH/قويره/g')
MODEL="$(cat /tmp/sysinfo/model 2>/dev/null || echo 'KT KM08-708H')"
LAN_IP="$(ip -4 addr show br-lan 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 | head -n1)"
[ -z "$LAN_IP" ] && LAN_IP="$(uci -q get network.lan.ipaddr || echo '192.168.1.1')"
DHCP_STATE=$([ "$(uci -q get dhcp.lan.ignore)" = "1" ] && echo "معطل (OFF)" || echo "شغال (ON)")
WIFI_2G="$(uci -q get wireless.default_radio0.ssid || echo 'QWAIRAH 2.4G')"
WIFI_5G="$(uci -q get wireless.default_radio1.ssid || echo 'QWAIRAH 5.8G')"
PORTS=$(for d in /sys/class/net/*; do
  n=$(basename "$d")
  case "$n" in lo) continue ;; esac
  st=$(cat "$d/operstate" 2>/dev/null || echo "down")
  sp=$(cat "$d/speed" 2>/dev/null)
  [ -n "$sp" ] && [ "$sp" -gt 0 ] 2>/dev/null && printf "%s:%s(%sMb) " "$n" "$st" "$sp" || printf "%s:%s " "$n" "$st"
done)

url_encode_bytes() {
  LC_ALL=C hexdump -v -e '/1 "%02X\n"' | awk '
    BEGIN {
      for (i = 0; i < 16; i++) h[sprintf("%X", i)] = i
      for (c = 32; c < 127; c++) ch[c] = sprintf("%c", c)
    }
    /^[0-9A-Fa-f]{2}$/ {
      u = toupper($0)
      b = h[substr(u, 1, 1)] * 16 + h[substr(u, 2, 1)]
      if ((b >= 48 && b <= 57) || (b >= 65 && b <= 90) || (b >= 97 && b <= 122) || b == 45 || b == 46 || b == 95 || b == 126) printf "%s", ch[b]
      else if (b == 32) printf "+"
      else printf "%%%s", u
    }
  '
}

send_tg() {
  TXT="$1"
  TOUT="${2:-12}"
  if command -v curl >/dev/null 2>&1; then
    curl -sSk --max-time "$TOUT" -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${CHAT_ID}" \
      --data-urlencode "text=${TXT}"
    return $?
  fi
  ENC=$(printf '%s' "$TXT" | url_encode_bytes)
  URL="https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${ENC}"
  if command -v uclient-fetch >/dev/null 2>&1; then
    uclient-fetch --no-check-certificate -T "$TOUT" -q -O - "$URL"
  elif command -v wget >/dev/null 2>&1; then
    wget --no-check-certificate -T "$TOUT" -qO - "$URL"
  else
    return 1
  fi
}

if [ "$MODE" = "shutdown" ]; then
  RAW=$(printf '🔴 تنبيه إطفاء / إعادة تشغيل — شبكة قـويــره نت\n📡 الموديل: %s (%s)\n🌐 الآيبي: %s\n⚙️ حالة DHCP: %s' "$MODEL" "$MODEM_NAME" "$LAN_IP" "$DHCP_STATE")
  send_tg "$RAW" 6
elif [ "$MODE" = "test" ]; then
  P_AVG="$(ping -c 3 -W 2 1.1.1.3 2>/dev/null | awk -F/ '/round-trip|rtt/ {print $5}' | head -n1)"
  RAW=$(printf '✅ تقرير تشغيل وحالة — شبكة قـويــره نت\n📡 الموديل: %s (%s)\n🌐 الآيبي: %s\n⚙️ حالة DHCP: %s\n📶 الواي فاي: 2.4G=%s | 5.8G=%s\n🔌 المنافذ: %s\n⏱️ البينج (1.1.1.3): %s ms' "$MODEL" "$MODEM_NAME" "$LAN_IP" "$DHCP_STATE" "$WIFI_2G" "$WIFI_5G" "${PORTS:-لا يوجد}" "${P_AVG:-انتهت المهلة}")
  send_tg "$RAW" 12
elif [ "$MODE" = "event" ]; then
  RAW=$(printf '🔔 تنبيه ارتباط/تحديث — شبكة قـويــره نت\n📡 الموديل: %s (%s)\n🌐 الآيبي: %s\n⚙️ حالة DHCP: %s\n📋 التفاصيل: %s' "$MODEL" "$MODEM_NAME" "$LAN_IP" "$DHCP_STATE" "${DETAIL:-تحديث}")
  send_tg "$RAW" 10
else
  i=0
  while [ $i -lt 15 ]; do
    ping -c 1 -W 2 1.1.1.3 >/dev/null 2>&1 && break
    sleep 3
    i=$((i + 1))
  done
  P_AVG="$(ping -c 4 -W 2 1.1.1.3 2>/dev/null | awk -F/ '/round-trip|rtt/ {print $5}' | head -n1)"
  RAW=$(printf '🟢 تقرير تشغيل العقدة — شبكة قـويــره نت\n📡 الموديل: %s (%s)\n🌐 الآيبي: %s\n⚙️ حالة DHCP: %s\n📶 الواي فاي: 2.4G=%s | 5.8G=%s\n🔌 المنافذ: %s\n⏱️ البينج (1.1.1.3): %s ms' "$MODEL" "$MODEM_NAME" "$LAN_IP" "$DHCP_STATE" "$WIFI_2G" "$WIFI_5G" "${PORTS:-لا يوجد}" "${P_AVG:-انتهت المهلة}")
  send_tg "$RAW" 12
fi
