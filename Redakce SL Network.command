#!/bin/zsh
# Redakční režim SL Network – dvojklikem spustí redakční verzi webu a otevře ji v prohlížeči.
# Ukončení: zavřít toto okno Terminálu (nebo Ctrl+C).
cd "${0:A:h}" || exit 1   # funguje i přes zástupce na Ploše
PORT=4400
URL="http://localhost:$PORT/sl-network/"

echo "SL Network – redakční režim"
echo "--------------------------------"
if ! command -v npm >/dev/null 2>&1; then
  echo "Chybí Node.js. Nainstalujte ho z https://nodejs.org (verze 22 nebo novější) a spusťte znovu."
  read -k1 "?Stiskněte libovolnou klávesu…"; exit 1
fi
if [ ! -d node_modules ]; then
  echo "První spuštění – instaluji potřebné balíčky (chvíli to potrvá)…"
  npm install || { read -k1 "?Instalace selhala. Stiskněte libovolnou klávesu…"; exit 1; }
fi

( for i in {1..30}; do curl -s -o /dev/null "$URL" && { open "$URL"; exit 0; }; sleep 1; done ) &
echo "Otevírám $URL"
echo "Změny v článcích se v prohlížeči projeví samy. Pro ukončení zavřete toto okno."
echo
npm run dev -- --port $PORT
