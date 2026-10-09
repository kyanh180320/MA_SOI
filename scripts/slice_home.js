import sharp from 'sharp';
import fs from 'fs';

async function sliceHome() {
  const src = 'design/reference/home.png';
  const image = sharp(src);
  const { width, height } = await image.metadata();
  console.log(`home.png: ${width}x${height}`);

  // 1. Top Emblem (Howling wolf + ribbon): roughly top 38%
  // y: 60 to 1150
  await sharp(src)
    .extract({ left: 60, top: 40, width: width - 120, height: 1080 })
    .resize(500, 420, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile('public/assets/home_emblem.webp');

  // 2. Center Village art: y: 950 to 2050
  await sharp(src)
    .extract({ left: 40, top: 960, width: width - 80, height: 1080 })
    .resize(600, 500, { fit: 'cover' })
    .webp({ quality: 85 })
    .toFile('public/assets/home_village.webp');

  // 3. Full Background optimized for mobile (750x1334)
  await sharp(src)
    .resize(750, 1620, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile('public/assets/bg_home_full.webp');

  console.log('Home assets sliced successfully!');
}

sliceHome().catch(console.error);
