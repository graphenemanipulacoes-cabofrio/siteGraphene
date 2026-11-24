#!/usr/bin/env bash
# Gera os ícones do app do painel admin (public/admin.webmanifest) a partir do favicon do site.
# Uso: bash scripts/admin-app-icons.sh   (precisa do ImageMagick: comando convert)
# Rode de novo ao trocar o favicon. O resultado entra no commit.
set -euo pipefail
cd "$(dirname "$0")/.."

SOURCE=public/favicon.png
OUT=public/assets/app
BACKGROUND='#010f12' # fundo do favicon
mkdir -p "$OUT"

# O favicon é um quadrado arredondado com cantos brancos: o recorte central fica só com o fundo escuro.
crop() { convert "$SOURCE" -crop 800x800+112+112 +repage "$@"; }

crop -resize 192x192 -strip "$OUT/admin-192.png"
crop -resize 512x512 -strip "$OUT/admin-512.png"
crop -resize 180x180 -strip "$OUT/admin-180.png"
# Maskable: o Android corta em círculo ou gota; o símbolo fica dentro dos 80% centrais.
crop -resize 400x400 -background "$BACKGROUND" -gravity center -extent 512x512 -strip "$OUT/admin-maskable-512.png"

echo "Ícones gerados em $OUT"
