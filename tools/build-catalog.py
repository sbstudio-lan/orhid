#!/usr/bin/env python3
"""Собирает карточки каталога в catalog.html.

Цены, названия и состав живут в таблицах ниже — правим здесь, потом:

    python3 tools/build-catalog.py

Скрипт заменяет всё между <!-- CATALOG:START --> и <!-- CATALOG:END -->
в catalog.html. Остальная страница не трогается.

Названия расцветок условные — придуманы по рисунку, у магазина их нет.
Код поста — последняя часть ссылки instagram.com/p/<код>/, по нему
карточка ведёт на видео товара.
"""

import html
import pathlib
import re
import struct

ROOT = pathlib.Path(__file__).resolve().parent.parent
PHONE = '+992999999999'

SET_META = 'Сатин, 100 % хлопок'

# раздел | картинка | название | описание | цена | приписка к цене | код поста
SECTIONS = [
    ('sets', 'Полуторные комплекты',
     'В комплекте: пододеяльник 160×210, простыня 160×210, наволочка 50×75. '
     'Не выцветают и не покрываются катышками.',
     [
         ('set-roses', 'Розы', SET_META, '220', '', 'De45gUgIoIG'),
         ('set-tropic', 'Тропики', SET_META, '220', '', 'De6MxIHIyEq'),
         ('set-cosmos', 'Космея', SET_META, '220', '', 'De6Lzw6oy4j'),
         ('set-roses-pale', 'Чайная роза', SET_META, '220', '', 'De6JoGzo251'),
         ('set-iris', 'Ирис', SET_META, '220', '', 'De6G1VoI0U7'),
         ('print-magnolia', 'Магнолия', SET_META, '220', '', 'De6FPldoxMA'),
         ('set-herbs', 'Луговые травы', SET_META, '220', '', 'De6CkhoI4yy'),
         ('set-check-grey', 'Серая клетка', SET_META, '220', '', 'De5-NPOoDIu'),
         ('set-tulip', 'Тюльпаны', SET_META, '220', '', 'De58bcVoSvs'),
         ('set-bears', 'Мишки', SET_META, '220', '', 'De44L9ooj3_'),
         ('print-lily', 'Лилии', SET_META, '220', '', 'De43CRXICrC'),
         ('set-check-light', 'Светлая клетка', SET_META, '220', '', 'De409ncIDXR'),
         ('print-lemon', 'Лимонник', SET_META, '220', '', 'De4zBbZIzT4'),
         ('set-lavender', 'Лаванда', SET_META, '220', '', 'DejL9n7IAoh'),
         ('set-sunflower', 'Солнечный цветок', SET_META, '220', '', 'DejILsWIlUY'),
         ('set-blue', 'Небесный', SET_META, '220', '', 'DejD-lzI7rb'),
         ('set-leaves', 'Листья', SET_META, '220', '', 'Dei_T64oQhD'),
         ('set-pink', 'Цветение', SET_META, '220', '', 'Dei7_KsoXJt'),
         ('set-garden', 'Сад', SET_META, '220', '', 'Dei47DcIR6m'),
         ('set-hearts', 'Сердечки', SET_META, '220', '', 'Dei3I0zoxX0'),
         ('print-pomegranate', 'Гранат', SET_META, '220', '', 'De6PChQobEA'),
     ]),
    ('kids', 'Детские комплекты',
     'Хлопковый сатин. Полуторные с цифровой печатью — рисунок во весь пододеяльник; '
     'маленькие — для детской кроватки.',
     [
         ('kids-ariel', 'Ариэль', 'Полуторный · цифровая печать, 100 % хлопок', '260', '', 'DehXp_fI6dl'),
         ('kids-stars', 'Stars', 'Полуторный · цифровая печать, 100 % хлопок', '260', '', 'DehRtUHoKuv'),
         ('kids-beep', 'Машинки', 'В кроватку · сатин, 100 % хлопок', '160', '', 'DeUlaZxoR8i'),
         ('kids-fish', 'Рыбки', 'В кроватку · сатин, 100 % хлопок', '160', '', 'DeUm2tHoeMb'),
         ('kids-melon', 'Арбузик', 'В кроватку · сатин, 100 % хлопок', '160', '', 'DeUmKQOInNO'),
         ('kids-smile', 'Smile', 'В кроватку · сатин, 100 % хлопок', '160', '', 'DeUknfAoYSp'),
     ]),
    ('home', 'Подушки и пледы',
     'Подушки можно стирать в стиральной машине.',
     [
         ('pillow', 'Подушка', '50×75 или 70×70 · наполнитель «шелкопряд»', '170', 'за штуку', 'DXyY0QAiE5I'),
         ('hero-pled', 'Плед + покрывало', 'Хлопок · 210×230', '350', 'за набор', 'DYm4LRooFM3'),
     ]),
    ('cloths', 'Скатерти',
     'Клеёнка, полиэстер, под лён, кружево. У некоторых моделей два размера.',
     [
         ('cloth-strawberry', 'Земляника', '140×180 — 165 с. · 150×230 — 175 с.', '165', 'от', 'DeWU7k7oKHj'),
         ('cloth-lace', 'Кружево', 'Клеёнка · 150×230', '230', '', 'DehOKO7I9Ic'),
         ('cloth-lace-white', 'Белое кружево', 'Набивная, плотная · 150×230', '170', '', 'DeWPzfUIUxc'),
         ('cloth-pearl', 'Жемчуг', 'Клеёнка · 140×180', '170', '', 'DeidytLoZfg'),
         ('cloth-linen-blue', 'Синие цветы', 'Под лён · 140×180 — 140 с. · 150×220 — 170 с.', '140', 'от', 'DeWJKAAo_sH'),
         ('cloth-lace-grey', 'Ажур', '140×180', '140', '', 'DeWOD4qox1j'),
         ('cloth-ornament', 'Орнамент', 'Клеёнка, плотная мягкая · 130×180 — 125 с. · 150×230 — 170 с.', '125', 'от', 'DeWC44Bo5Rz'),
         ('cloth-roses', 'Цветочный луг', 'Клеёнка · 150×230', '120', '', 'DeWCKYmIEEn'),
         ('cloth-linen', 'Лён', 'Под лён · 140×180 — 110 с. · 150×230 — 130 с.', '110', 'от', 'DeWE5a0oPOo'),
         ('cloth-flowers', 'Пионы', 'Полиэстер · 150×220', '100', '', 'DeZhGlEIUn1'),
         ('cloth-pomegranate', 'Гранаты', 'Клеёнка · 140×180', '100', '', 'DeV9PTfo1Bv'),
         ('cloth-poppy', 'Маки', 'Полиэстер, не теряет цвет · 140×180', '90', '', 'DeZbRZkIfXO'),
     ]),
]


def jpeg_size(path):
    """Ширина и высота JPEG без сторонних библиотек."""
    with open(path, 'rb') as f:
        data = f.read()
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', data[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack('>H', data[i + 2:i + 4])[0]
    raise ValueError(f'не JPEG: {path}')


def card(img, title, meta, price, unit, code):
    w, h = jpeg_size(ROOT / 'img' / f'{img}.jpg')
    t = html.escape(title)
    pre = f'<small>{unit}</small> ' if unit == 'от' else ''
    post = f' <small>{unit}</small>' if unit and unit != 'от' else ''
    return f'''        <article class="product js-card">
          <div class="product-img"><picture><source type="image/webp" srcset="img/{img}-480.webp 480w, img/{img}.webp {w}w" sizes="(max-width: 380px) 92vw, (max-width: 760px) 46vw, (max-width: 1100px) 31vw, 290px"><img src="img/{img}.jpg" width="{w}" height="{h}" alt="{t}" loading="lazy"></picture></div>
          <div class="product-body">
            <h3>{t}</h3>
            <p class="product-meta">{html.escape(meta)}</p>
            <p class="product-price">{pre}{price} смн{post}</p>
            <div class="product-actions">
              <a class="btn btn-primary btn-sm" href="tel:{PHONE}" aria-label="Позвонить и заказать «{t}»"><svg aria-hidden="true"><use href="#ic-phone"></use></svg><span>Заказать</span></a>
              <a class="product-ig" href="https://www.instagram.com/p/{code}/" target="_blank" rel="noopener" aria-label="Видео «{t}» в Instagram"><svg aria-hidden="true"><use href="#ic-ig"></use></svg></a>
            </div>
          </div>
        </article>'''


def main():
    parts = []
    for sid, title, lead, items in SECTIONS:
        cards = '\n'.join(card(*it) for it in items)
        parts.append(f'''    <section class="shelf" id="{sid}" aria-labelledby="{sid}-title">
      <div class="wrap">
        <div class="shelf-head">
          <h2 id="{sid}-title" class="js-reveal">{title}</h2>
          <p class="js-reveal">{lead}</p>
        </div>
        <div class="products">
{cards}
        </div>
      </div>
    </section>''')

    page = ROOT / 'catalog.html'
    src = page.read_text(encoding='utf-8')
    new, n = re.subn(r'(<!-- CATALOG:START -->).*?(<!-- CATALOG:END -->)',
                     lambda m: m.group(1) + '\n' + '\n\n'.join(parts) + '\n  ' + m.group(2),
                     src, flags=re.S)
    if not n:
        raise SystemExit('В catalog.html нет меток CATALOG:START / CATALOG:END')
    page.write_text(new, encoding='utf-8')
    total = sum(len(s[3]) for s in SECTIONS)
    print(f'catalog.html: {total} товаров в {len(SECTIONS)} разделах')


if __name__ == '__main__':
    main()
