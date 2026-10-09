import sharp from 'sharp';

async function extractHomeComponents() {
  const src = 'design/reference/home.png';
  const { width, height } = await sharp(src).metadata();

  // 1. Ruby brooch above Play Offline button (around center x, y: 1910 to 2070)
  // Center is x: 704
  await sharp(src)
    .extract({ left: 580, top: 1910, width: 248, height: 160 })
    .resize(120, 80, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile('public/assets/brooch_ruby.webp');

  // 2. Top Emblem (Howling Wolf + Wings + WEREWOLF banner)
  await sharp(src)
    .extract({ left: 40, top: 40, width: width - 80, height: 1040 })
    .resize(460, 360, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile('public/assets/home_emblem.webp');

  // 3. Moon Village Scene (y: 950 to 2000)
  await sharp(src)
    .extract({ left: 30, top: 960, width: width - 60, height: 1040 })
    .resize(600, 520, { fit: 'cover' })
    .webp({ quality: 85 })
    .toFile('public/assets/home_village.webp');

  console.log('Extracted home components successfully!');
}

extractHomeComponents().catch(console.error);
