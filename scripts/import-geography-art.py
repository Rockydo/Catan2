"""Crop approved geography illustration sheets. No synthesized or filtered artwork."""
from pathlib import Path
from PIL import Image
from os import environ
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(environ.get('GEOGRAPHY_ART_SOURCE', '/home/alvinh/.codex/generated_images/01a08f98-8940-7a73-8503-27e8f35fd62d'))
DEST=ROOT/'public/assets/geography'
DEST.mkdir(exist_ok=True)
sheets=[('exec-d3c925ec-d18b-4277-8ce4-ec5086c3baf3.png',['river','delta-gardens','mountain-pass','reef']),('exec-cf9322b7-7b3b-4f2a-80f4-ecba45c81fcd.png',['flood-wheat','flood-rice','flood-sorghum','wild-grassland'])]
for name,rows in sheets:
 image=Image.open(SOURCE/name).convert('RGB');w,h=image.size
 for row,kind in enumerate(rows):
  for col,season in enumerate(['spring','summer','autumn','winter']):
   crop=image.crop((round(col*w/4)+2,round(row*h/4)+2,round((col+1)*w/4)-2,round((row+1)*h/4)-2))
   crop.save(DEST/f'{kind}-{season}.webp',quality=87,method=6)
   if col==1:crop.save(ROOT/f'public/assets/terrain-{kind}-v1.webp',quality=87,method=6)
image=Image.open(SOURCE/'exec-1ef67228-74ed-4445-a9a4-e099bc9807f9.png').convert('RGB');w,h=image.size
for row,kind in enumerate(['hunter','riverboat']):
 for col in range(4):
  image.crop((round(col*w/4)+2,round(row*h/2)+2,round((col+1)*w/4)-2,round((row+1)*h/2)-2)).resize((256,256),Image.Resampling.LANCZOS).save(ROOT/f'public/assets/portrait-{kind}-{col+1}-v1.webp',quality=88,method=6)
image=Image.open(SOURCE/'exec-645f5631-3dc4-4c9e-9503-edcf9bde3167.png').convert('RGB');w,h=image.size
for i,kind in enumerate(['thermal-spring','natural-harbor','fertile-basin','mineral-vein','ancient-grove','lake','flood-meadow','flooded']):
 row,col=divmod(i,4)
 crop=image.crop((round(col*w/4)+2,round(row*h/2)+2,round((col+1)*w/4)-2,round((row+1)*h/2)-2))
 crop.save(DEST/f'{kind}.webp',quality=87,method=6)
 if kind in ['lake','flood-meadow']:crop.save(ROOT/f'public/assets/terrain-{kind}-v1.webp',quality=87,method=6)
Image.open(DEST/'reef-summer.webp').save(ROOT/'public/assets/terrain-shoal-v1.webp',quality=87,method=6)
image=Image.open(SOURCE/'exec-00c5ff0f-d66d-467d-ac15-4db4085e95cc.png').convert('RGB');w,h=image.size
for row,kind in enumerate(['lake','flood-meadow','desert-river','tropical-river']):
 for col,season in enumerate(['spring','summer','autumn','winter']):
  image.crop((round(col*w/4)+2,round(row*h/4)+2,round((col+1)*w/4)-2,round((row+1)*h/4)-2)).save(DEST/f'{kind}-{season}.webp',quality=87,method=6)
image=Image.open(SOURCE/'exec-0f63de84-efbb-4e39-95f9-015a40af014f.png').convert('RGB');w,h=image.size
for i,kind in enumerate(['wet-pass','desert-pass','warm-lake','warm-meadow']):
 row,col=divmod(i,2)
 image.crop((round(col*w/2)+2,round(row*h/2)+2,round((col+1)*w/2)-2,round((row+1)*h/2)-2)).resize((384,384),Image.Resampling.LANCZOS).save(DEST/f'{kind}.webp',quality=87,method=6)
