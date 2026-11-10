# Gera as versões leves (WebP) das imagens locais do site. As originais continuam no lugar:
# elas seguem valendo para compartilhamento (og:image) e para o feed de produtos.
# Uso: python scripts/optimize-images.py   (precisa do Pillow: pip install Pillow)
# Rode de novo ao trocar ou incluir uma imagem em public/assets. O resultado entra no commit.
from pathlib import Path
from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / 'public' / 'assets'
QUALITY = 80


def save(source, target, width):
    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        return False
    image = Image.open(source)
    image = image.convert('RGBA' if image.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if image.width > width:
        image = image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
    image.save(target, 'WEBP', quality=QUALITY, method=6)
    return True


jobs = [(photo, photo.with_suffix('.webp'), 800) for photo in sorted((ASSETS / 'products').glob('*.png'))]
banner = ASSETS / 'graphene_banner_top.png'
jobs += [(banner, ASSETS / 'graphene_banner_top.webp', 2048), (banner, ASSETS / 'graphene_banner_top-900.webp', 900)]
lab = ASSETS / 'graphene_pharmacist_lab.jpg'
jobs += [(lab, lab.with_suffix('.webp'), 1200)]

before = after = made = 0
for source, target, width in jobs:
    made += save(source, target, width)
    before += source.stat().st_size
    after += target.stat().st_size
print(f'{made} arquivo(s) gerado(s) de {len(jobs)}. Originais: {before / 1048576:.1f} MB. Versões leves: {after / 1048576:.1f} MB.')
