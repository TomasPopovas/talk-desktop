#!/usr/bin/env bash
# =============================================================================
# brand-tsp-messenger.sh — брендирование Nextcloud Talk Desktop → TSP-Messenger
#
# Применяет white-label комплект к чекауту talk-desktop:
#   1. .overrides/build.config.json  — TSP-Messenger, cloud.okbtsp.com, #1090C0
#   2. img/*.svg                     — фирменные SVG (знак TSP)
#   3. img/icons/*                   — готовые .ico/.png/.icns
#   4. forge.config.js               — iconUrl для Squirrel
#
# Использование:
#   ./brand-tsp-messenger.sh /путь/к/talk-desktop            # применить
#   ./brand-tsp-messenger.sh /путь/к/talk-desktop --restore  # откатить
# =============================================================================
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${1:?Укажите путь к чекауту talk-desktop}"
MODE="${2:-apply}"
BACKUP="$REPO/.branding-backup-tsp"

# Raw-URL иконки для Squirrel («Установка и удаление программ»).
ICON_URL="https://raw.githubusercontent.com/TomasPopovas/talk-desktop/main/branding-tsp/img/icons/icon.ico"

[[ -f "$REPO/forge.config.js" ]] || { echo "ОШИБКА: $REPO не похож на talk-desktop"; exit 1; }

if [[ "$MODE" == "--restore" ]]; then
    [[ -d "$BACKUP" ]] || { echo "ОШИБКА: бэкап $BACKUP не найден"; exit 1; }
    cp -a "$BACKUP/img/." "$REPO/img/"
    cp "$BACKUP/forge.config.js" "$REPO/forge.config.js"
    rm -rf "$REPO/.overrides"
    echo "Оригинальное оформление восстановлено, .overrides удалён."
    exit 0
fi

# --- Бэкап оригиналов (однократно) ---
if [[ ! -d "$BACKUP" ]]; then
    mkdir -p "$BACKUP"
    cp -a "$REPO/img" "$BACKUP/img"
    cp "$REPO/forge.config.js" "$BACKUP/forge.config.js"
    echo "→ Бэкап оригиналов: $BACKUP"
fi

# --- 1. Конфиг white-label ---
mkdir -p "$REPO/.overrides"
cp "$KIT_DIR/.overrides/build.config.json" "$REPO/.overrides/build.config.json"
echo "→ .overrides/build.config.json применён (TSP-Messenger, cloud.okbtsp.com, #1090C0)"

# --- 2. SVG-исходники ---
cp "$KIT_DIR"/img/*.svg "$REPO/img/"
echo "→ Фирменные SVG скопированы в img/"

# --- 3. Готовые иконки (.ico/.png/.icns) ---
mkdir -p "$REPO/img/icons"
cp "$KIT_DIR"/img/icons/* "$REPO/img/icons/"
echo "→ Готовые иконки скопированы в img/icons/"

# --- 4. iconUrl в forge.config.js ---
if grep -q "raw.githubusercontent.com/nextcloud/talk-desktop" "$REPO/forge.config.js"; then
    sed -i.bak "s|https://raw.githubusercontent.com/nextcloud/talk-desktop/refs/heads/main/img/icons/icon.ico|$ICON_URL|" "$REPO/forge.config.js"
    rm -f "$REPO/forge.config.js.bak"
    echo "→ iconUrl в forge.config.js: $ICON_URL"
fi

echo
echo "Брендирование TSP-Messenger применено. Сборка:"
echo "   npm ci"
echo "   git clone https://github.com/nextcloud/spreed --branch stable34 && npm ci --prefix=spreed"
echo "   npm run package:windows:x64"
echo
echo "Артефакты: out/make/ → TSP.Messenger.Client-windows-x64.exe (Squirrel) и .msi (WiX)"
