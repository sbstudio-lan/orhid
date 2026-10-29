#!/usr/bin/env bash
# Готовит фото для лендинга и каталога из выгрузки Instagram.
#
#   img/src/NN_<code>.jpg  ->  img/<name>.jpg        (фолбэк)
#                              img/<name>.webp       (исходная ширина, ≤1080)
#                              img/<name>-480.webp   (мобильный)
#
# Почти все посты — обложки рилсов 640×852: сверху коробка VEVE «Lily»,
# снизу сама ткань на зелёном газоне. Берём только ткань: полосу задаём
# долями высоты (верх, низ), из неё вырезаем кадр нужной пропорции по центру.
# Если полоса уже пропорции — кадр сужается по ширине, а не растягивается.
# По бокам срезаем по 3 %: у кадров из рилсов на краях бывает чёрная рамка.
#
# Крупнее 640px Instagram для рилсов не отдаёт, поэтому не увеличиваем.
#
# Запуск: bash tools/build-images.sh

set -uo pipefail
cd "$(dirname "$0")/.."

SRC=img/src
OUT=img
[ -d "$SRC" ] || { echo "Нет папки $SRC — сначала выгрузите фото из Instagram"; exit 1; }

# номер | имя | пропорция Ш:В | верх (доля) | низ (доля) | центр по X (доля) [| левый край | правый край]
#
# Номер — префикс файла в img/src (NN_<код>.jpg) или путь вида hl/<хайлайт>/NN
# для сторис из хайлайтов. У сторис фото обычно вставлено в рамку, поэтому
# для них задаются ещё левый и правый край (доли ширины).
MAP='
02|hero-pled|4:5|0.12|0.90|0.5
04|print-pomegranate|4:5|0|1|0.5
09|print-magnolia|4:5|0|1|0.5
15|print-lily|4:5|0|1|0.5
17|print-lemon|4:5|0.06|1|0.5
05|set-tropic|4:3|0.54|1|0.5
06|set-cosmos|4:3|0.47|1|0.5
07|set-roses-pale|4:3|0.51|1|0.5
08|set-iris|4:3|0.54|1|0.5
10|set-herbs|4:3|0.50|1|0.5
11|set-check-grey|4:3|0.52|0.96|0.5
12|set-tulip|4:3|0.44|1|0.5
13|set-roses|4:3|0.51|1|0.5
14|set-bears|4:3|0.55|1|0.5
16|set-check-light|4:3|0.54|1|0.5
18|set-lavender|4:3|0.53|1|0.5
19|set-sunflower|4:3|0.56|1|0.5
21|set-blue|4:3|0.47|1|0.5
22|set-leaves|4:3|0.42|1|0.5
23|set-pink|4:3|0.53|1|0.5
24|set-garden|4:3|0.54|1|0.5
25|set-hearts|4:3|0.47|1|0.5
32|kids-ariel|4:5|0.05|0.75|0.5
33|kids-stars|4:3|0.45|0.93|0.5
45|kids-fish|4:3|0.55|1|0.5
46|kids-melon|4:3|0.52|1|0.5
47|kids-beep|4:3|0.53|1|0.5
48|kids-smile|4:3|0.50|1|0.5
01|pillow|4:3|0.25|1|0.5
31|cloth-pearl|4:3|0.05|0.75|0.5
34|cloth-lace|4:3|0.10|0.90|0.5
35|cloth-flowers|4:3|0.10|0.90|0.5
36|cloth-poppy|4:3|0.05|0.85|0.5
37|cloth-strawberry|4:3|0.05|0.95|0.5
38|cloth-lace-white|4:3|0.10|0.95|0.5
39|cloth-lace-grey|4:3|0.05|0.80|0.5
40|cloth-linen-blue|4:3|0.15|0.95|0.5
41|cloth-linen|4:3|0.10|0.90|0.5
42|cloth-ornament|4:3|0.10|0.90|0.5
43|cloth-roses|4:3|0.10|0.90|0.5
44|cloth-pomegranate|4:3|0.10|0.90|0.5
hl/dvuspalnye/03|hero-bedroom|4:5|0.195|0.77|0.5|0.105|0.885
hl/dvuspalnye/03|dv-lavender|4:3|0.195|0.77|0.5|0.105|0.885
hl/dvuspalnye/12|dv-peach|4:3|0.29|0.74|0.5|0.12|0.88
hl/dvuspalnye/13|dv-graphite|4:3|0.29|0.74|0.5|0.12|0.88
hl/dvuspalnye/14|dv-mint|4:3|0.29|0.74|0.5|0.12|0.88
hl/dvuspalnye/15|dv-peony|4:3|0.29|0.74|0.5|0.12|0.88
hl/dvuspalnye/16|dv-cappuccino|4:3|0.29|0.74|0.5|0.12|0.88
hl/dvuspalnye/17|dv-watercolor|4:3|0.29|0.74|0.5|0.12|0.88
hl/dvuspalnye/18|dv-champagne|4:3|0.16|0.82|0.5|0.12|0.88
hl/otzyvy/08|rev-navy|4:5|0.14|0.96|0.5
hl/otzyvy/05|rev-butterfly|4:5|0.22|0.83|0.5
hl/otzyvy/07|rev-kids|4:5|0.215|0.80|0.5
'

made=0; skipped=0

while IFS='|' read -r num name ratio top bot xc left right; do
  [ -z "${num:-}" ] && continue
  left=${left:-0}; right=${right:-1}
  if [[ "$num" == */* ]]; then src="$SRC/$num.jpg"; [ -f "$src" ] || src=''
  else src=$(ls "$SRC/${num}_"*.jpg 2>/dev/null | head -1); fi
  if [ -z "$src" ]; then
    echo "  пропуск: $name (нет исходника $num)"
    skipped=$((skipped+1)); continue
  fi

  read -r W H < <(identify -format "%w %h" "$src")
  # Кадр: максимальный прямоугольник нужной пропорции внутри полосы.
  read -r cw ch x0 y0 < <(awk -v W="$W" -v H="$H" -v r="$ratio" -v t="$top" -v b="$bot" -v xc="$xc" -v L="$left" -v R="$right" 'BEGIN{
    split(r, p, ":"); a = p[1] / p[2];
    ox = W * L; W = W * (R - L);
    inset = W * 0.03; W -= 2 * inset;
    y0 = H * t; bh = H * (b - t);
    cw = bh * a; ch = bh;
    if (cw > W) { cw = W; ch = W / a; y0 += (bh - ch) / 2 }
    x0 = W * xc - cw / 2; if (x0 < 0) x0 = 0; if (x0 + cw > W) x0 = W - cw;
    x0 += inset + ox;
    printf "%d %d %d %d", cw, ch, x0, y0 }')

  tmp=$(mktemp /tmp/bi-XXXXXX.png)
  convert "$src" -crop "${cw}x${ch}+${x0}+${y0}" +repage "$tmp"

  convert "$tmp" -resize 1080x\> -strip -quality 86 -sampling-factor 4:2:0 -interlace Plane "$OUT/$name.jpg"
  convert "$tmp" -resize 1080x\> -strip -quality 82 -define webp:method=6 "$OUT/$name.webp"
  convert "$tmp" -resize  480x\> -strip -quality 80 -define webp:method=6 "$OUT/$name-480.webp"
  rm -f "$tmp"

  echo "  ok: $name  $(identify -format '%wx%h' "$OUT/$name.jpg")  jpg $(du -h "$OUT/$name.jpg" | cut -f1) / webp $(du -h "$OUT/$name.webp" | cut -f1)"
  made=$((made+1))
done <<< "$MAP"

echo
echo "Готово: $made обработано, $skipped пропущено."
