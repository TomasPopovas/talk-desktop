#!/usr/bin/env bash
# =============================================================================
# brand-talk-desktop.sh вЂ” Р±СЂРµРЅРґРёСЂРѕРІР°РЅРёРµ Nextcloud Talk Desktop РґР»СЏ РђРћ В«РЎР— В«РЈР­Р—В»
#
# РџСЂРёРјРµРЅСЏРµС‚ white-label РєРѕРјРїР»РµРєС‚ Рє С‡РµРєР°СѓС‚Сѓ talk-desktop:
#   1. .overrides/build.config.json  вЂ” РёРјСЏ РїСЂРёР»РѕР¶РµРЅРёСЏ, РґРѕРјРµРЅ, С„РёСЂРјРµРЅРЅС‹Рµ С†РІРµС‚Р°
#   2. img/*.svg                     вЂ” С„РёСЂРјРµРЅРЅС‹Рµ SVG-РёСЃС…РѕРґРЅРёРєРё РёРєРѕРЅРѕРє
#   3. img/icons/*                   вЂ” РіРѕС‚РѕРІС‹Рµ .ico/.png/.icns (РїРµСЂРµРіРµРЅРµСЂР°С†РёСЏ РЅРµ РЅСѓР¶РЅР°)
#   4. forge.config.js               вЂ” iconUrl РґР»СЏ Squirrel (РЈСЃС‚Р°РЅРѕРІРєР° Рё СѓРґР°Р»РµРЅРёРµ РїСЂРѕРіСЂР°РјРј)
#
# РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ:
#   ./brand-talk-desktop.sh /РїСѓС‚СЊ/Рє/talk-desktop            # РїСЂРёРјРµРЅРёС‚СЊ
#   ./brand-talk-desktop.sh /РїСѓС‚СЊ/Рє/talk-desktop --restore  # РѕС‚РєР°С‚РёС‚СЊ РёР· Р±СЌРєР°РїР°
#
# РЎРѕРІРјРµСЃС‚РёРјРѕ: nextcloud/talk-desktop v1.2+ (РјРµС…Р°РЅРёР·Рј .overrides), Windows 11 target.
# =============================================================================
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${1:?РЈРєР°Р¶РёС‚Рµ РїСѓС‚СЊ Рє С‡РµРєР°СѓС‚Сѓ talk-desktop}"
MODE="${2:-apply}"
BACKUP="$REPO/.branding-backup"

# Raw-URL РёРєРѕРЅРєРё РґР»СЏ Squirrel (РѕС‚РѕР±СЂР°Р¶Р°РµС‚СЃСЏ РІ В«РЈСЃС‚Р°РЅРѕРІРєР° Рё СѓРґР°Р»РµРЅРёРµ РїСЂРѕРіСЂР°РјРјВ»).
# Р—Р°РјРµРЅРёС‚Рµ РЅР° raw-СЃСЃС‹Р»РєСѓ СЃРІРѕРµРіРѕ С„РѕСЂРєР° РїРѕСЃР»Рµ РєРѕРјРјРёС‚Р° img/icons/icon.ico.
ICON_URL="https://raw.githubusercontent.com/TomasPopovas/talk-desktop/uez-branding/img/icons/icon.ico"

[[ -f "$REPO/forge.config.js" ]] || { echo "РћРЁРР‘РљРђ: $REPO РЅРµ РїРѕС…РѕР¶ РЅР° talk-desktop"; exit 1; }

if [[ "$MODE" == "--restore" ]]; then
    [[ -d "$BACKUP" ]] || { echo "РћРЁРР‘РљРђ: Р±СЌРєР°Рї $BACKUP РЅРµ РЅР°Р№РґРµРЅ"; exit 1; }
    cp -a "$BACKUP/img/." "$REPO/img/"
    cp "$BACKUP/forge.config.js" "$REPO/forge.config.js"
    rm -rf "$REPO/.overrides"
    echo "вњ… РћСЂРёРіРёРЅР°Р»СЊРЅРѕРµ РѕС„РѕСЂРјР»РµРЅРёРµ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРѕ, .overrides СѓРґР°Р»С‘РЅ."
    exit 0
fi

# --- Р‘СЌРєР°Рї РѕСЂРёРіРёРЅР°Р»РѕРІ (РѕРґРЅРѕРєСЂР°С‚РЅРѕ) ---
if [[ ! -d "$BACKUP" ]]; then
    mkdir -p "$BACKUP"
    cp -a "$REPO/img" "$BACKUP/img"
    cp "$REPO/forge.config.js" "$BACKUP/forge.config.js"
    echo "в†’ Р‘СЌРєР°Рї РѕСЂРёРіРёРЅР°Р»РѕРІ: $BACKUP"
fi

# --- 1. РљРѕРЅС„РёРі white-label ---
mkdir -p "$REPO/.overrides"
cp "$KIT_DIR/.overrides/build.config.json" "$REPO/.overrides/build.config.json"
echo "в†’ .overrides/build.config.json РїСЂРёРјРµРЅС‘РЅ (UEZ Talk, o.uez.ru, #016BB2)"

# --- 2. SVG-РёСЃС…РѕРґРЅРёРєРё ---
cp "$KIT_DIR"/img/*.svg "$REPO/img/"
echo "в†’ Р¤РёСЂРјРµРЅРЅС‹Рµ SVG СЃРєРѕРїРёСЂРѕРІР°РЅС‹ РІ img/"

# --- 3. Р“РѕС‚РѕРІС‹Рµ РёРєРѕРЅРєРё (.ico/.png/.icns) ---
mkdir -p "$REPO/img/icons"
cp "$KIT_DIR"/img/icons/* "$REPO/img/icons/"
echo "в†’ Р“РѕС‚РѕРІС‹Рµ РёРєРѕРЅРєРё СЃРєРѕРїРёСЂРѕРІР°РЅС‹ РІ img/icons/ (icon.ico: 16вЂ“256px)"

# --- 4. iconUrl РІ forge.config.js ---
if grep -q "raw.githubusercontent.com/nextcloud/talk-desktop" "$REPO/forge.config.js"; then
    sed -i.bak "s|https://raw.githubusercontent.com/nextcloud/talk-desktop/refs/heads/main/img/icons/icon.ico|$ICON_URL|" "$REPO/forge.config.js"
    rm -f "$REPO/forge.config.js.bak"
    echo "в†’ iconUrl РІ forge.config.js: $ICON_URL"
fi

echo
echo "вњ… Р‘СЂРµРЅРґРёСЂРѕРІР°РЅРёРµ РїСЂРёРјРµРЅРµРЅРѕ. РЎР±РѕСЂРєР° РїРѕРґ Windows 11 x64:"
echo "   npm ci"
echo "   git clone https://github.com/nextcloud/spreed && npm ci --prefix=spreed   # РёР»Рё TALK_PATH РІ .env"
echo "   npm run package:windows:x64"
echo
echo "РђСЂС‚РµС„Р°РєС‚С‹: out/make/ в†’ UEZ.Talk-windows-x64.exe (Squirrel) Рё .msi (WiX, РґР»СЏ GPO/MSI-РґРµРїР»РѕСЏ)"
echo "РџСЂРёРјРµС‡Р°РЅРёРµ: РїСЂРё РїРµСЂРµРіРµРЅРµСЂР°С†РёРё РёРєРѕРЅРѕРє (npm run generate-icons) РЅСѓР¶РµРЅ РїР°РєРµС‚ icon-gen."
