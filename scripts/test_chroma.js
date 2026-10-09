import sharp from 'sharp';

async function testTransparentChroma(src, out) {
  const image = sharp(src);
  const { width, height } = await image.metadata();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // If green is dominant
    if (g > 110 && g > r * 1.35 && g > b * 1.35) {
      data[i + 3] = 0; // Transparent
    } else if (g > 90 && g > r * 1.15 && g > b * 1.15) {
      // Soft edge despill
      const greenExcess = g - Math.max(r, b);
      data[i + 1] = Math.max(0, g - greenExcess);
    }
  }

  // Now find bounding box of non-transparent pixels
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .resize(480, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile(out);

  console.log(`Saved transparent card to ${out}`);
}

testTransparentChroma('design/reference/wolf.png', 'public/assets/cards/card_wolf_test.webp').catch(console.error);
