#!/usr/bin/env bash
set -e
ROOT_DIR="$(pwd)"

rm -rf openwrt
git clone --branch openwrt-23.05 --depth 1 https://github.com/openwrt/openwrt.git openwrt
cd openwrt

mkdir -p package/kernel/mac80211/patches/subsys
sed -i 's/20)/40)/g' package/firmware/wireless-regdb/Makefile 2>/dev/null || true

./scripts/feeds update -a
./scripts/feeds install -a

find feeds/luci package -type f \( -name "*.htm" -o -name "*.ut" -o -name "*.js" -o -name "*.lua" -o -name "*.po" \) \
  -exec sed -i 's|AL-MALAKI|QWAIRAH قويره|gi; s|OpenWrt 23.05|QWAIRAH قويره OpenWrt 23.05|g; s|https://github.com/openwrt/luci|#|g; s|Powered by LuCI.*|QWAIRAH قويره|g' {} + 2>/dev/null || true

BASE_DTS=$(ls target/linux/ramips/dts/mt7621_*.dts 2>/dev/null | head -n 1)
if [ -n "$BASE_DTS" ]; then
    cp "$BASE_DTS" target/linux/ramips/dts/mt7621_kt_km08-708h.dts
    python3 -c '
p = "target/linux/ramips/dts/mt7621_kt_km08-708h.dts"
s = open(p).read()
s = s.replace("compatible =", "compatible = \"kt,km08-708h\",", 1)
open(p, "w").write(s)
' || true
fi

python3 - << 'PYEOF'
mk_path = "target/linux/ramips/image/mt7621.mk"
with open(mk_path, "r") as f:
    content = f.read()

tag = "define Device/kt_km08-708h"
while tag in content:
    start = content.index(tag)
    end = content.find("\nendef", start)
    if end != -1:
        content = content[:start] + content[end+6:]
    else:
        break
content = content.replace("TARGET_DEVICES += kt_km08-708h\n", "")

block = """
define Device/kt_km08-708h
  $(Device/dsa-migration)
  $(Device/uimage-lzma-loader)
  DEVICE_VENDOR := KT
  DEVICE_MODEL := KM08-708H
  DEVICE_DTS := mt7621_kt_km08-708h
  SUPPORTED_DEVICES += kt,km08-708h
  DEVICE_PACKAGES := kmod-mt7603 kmod-mt76x2 kmod-mt7615-firmware kmod-mt7615e
  IMAGE/sysupgrade.bin := append-kernel | append-rootfs | pad-rootfs | append-metadata
endef
TARGET_DEVICES += kt_km08-708h
"""

with open(mk_path, "w") as f:
    f.write(content + block)
PYEOF

cat << 'CONF' > .config
CONFIG_TARGET_ramips=y
CONFIG_TARGET_ramips_mt7621=y
CONFIG_TARGET_ramips_mt7621_DEVICE_kt_km08-708h=y
CONFIG_TARGET_MULTI_PROFILE=n
CONFIG_PACKAGE_kmod-mt7603=y
CONFIG_PACKAGE_kmod-mt76x2=y
CONFIG_PACKAGE_kmod-mt7615-firmware=y
CONFIG_PACKAGE_kmod-mt7615e=y
CONFIG_PACKAGE_luci=y
CONFIG_PACKAGE_luci-base=y
CONFIG_PACKAGE_luci-mod-admin-full=y
CONFIG_PACKAGE_luci-i18n-base-ar=y
CONFIG_PACKAGE_luci-i18n-base-en=y
CONFIG_PACKAGE_luci-i18n-opkg-ar=y
CONFIG_PACKAGE_luci-theme-bootstrap=y
CONFIG_PACKAGE_luci-app-sqm=y
CONFIG_PACKAGE_luci-i18n-sqm-ar=y
CONFIG_PACKAGE_luci-app-nlbwmon=y
CONFIG_PACKAGE_luci-app-commands=y
CONFIG_PACKAGE_luci-app-ttyd=y
CONFIG_PACKAGE_luci-app-watchcat=y
CONFIG_PACKAGE_luci-app-lldpd=y
CONFIG_PACKAGE_lldpd=y
CONFIG_PACKAGE_wpad-mesh-openssl=y
CONFIG_PACKAGE_kmod-batman-adv=y
CONFIG_PACKAGE_openssh-sftp-server=y
CONFIG_PACKAGE_dropbear=y
CONFIG_PACKAGE_curl=y
CONFIG_PACKAGE_jq=y
CONFIG_PACKAGE_ca-bundle=y
CONFIG_PACKAGE_iw=y
CONFIG_PACKAGE_iwinfo=y
CONFIG_PACKAGE_ethtool=y
CONFIG_PACKAGE_ip-full=y
CONFIG_PACKAGE_iptables-mod-extra=y
CONF

make defconfig
make toolchain/install -j"$(nproc)"

TOOLCHAIN_GCC=$(find staging_dir/toolchain-* -name "mipsel-openwrt-linux*-gcc" 2>/dev/null | head -n 1)
mkdir -p "$ROOT_DIR/files/usr/bin"
if [ -n "$TOOLCHAIN_GCC" ]; then
    "$TOOLCHAIN_GCC" -O2 -s "$ROOT_DIR/src/qwairah_mndp.c" -o "$ROOT_DIR/files/usr/bin/qwairah_mndp"
    chmod +x "$ROOT_DIR/files/usr/bin/qwairah_mndp"
fi

cp -rf "$ROOT_DIR/files/." files/

make -j"$(nproc)" || { make -j1 target/linux/install V=sc; exit 1; }

mkdir -p "$ROOT_DIR/artifacts_out"
cp -f bin/targets/ramips/mt7621/*km08-708h*initramfs* bin/targets/ramips/mt7621/*km08-708h*sysupgrade.bin bin/targets/ramips/mt7621/*km08-708h*kernel.bin "$ROOT_DIR/artifacts_out/" 2>/dev/null || true
ls -lh "$ROOT_DIR/artifacts_out/"
