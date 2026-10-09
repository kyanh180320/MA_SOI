import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ICON_NAMES = [
  ['icon_moon', 'icon_sun', 'icon_skull'],
  ['icon_ballot', 'icon_ballot_wood', 'icon_eye'],
  ['icon_potion_heal', 'icon_potion_poison', 'icon_shield'],
  ['icon_swords', 'icon_wolf_paw', 'icon_wolf_paw_fire'],
  ['icon_swords_alt', 'icon_hourglass', 'icon_gear']
];

async function processIcons() {
  const src = 'design/reference/icon.png';
  const outDir = 'public/assets/icons';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const image = sharp(src);
  const { width, height } = await image.metadata();
  const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // Despill and clear chroma green
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (g > 115 && g > r * 1.35 && g > b * 1.35) {
      data[i + 3] = 0;
    } else if (g > 95 && g > r * 1.15 && g > b * 1.15) {
      const excess = g - Math.max(r, b);
      data[i + 1] = Math.max(0, g - excess);
    }
  }

  const colWidth = Math.floor(width / 3);
  const rowHeight = Math.floor(height / 5);

  const cleanBuffer = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const name = ICON_NAMES[row][col];
      const left = col * colWidth;
      const top = row * rowHeight;

      // Extract bounding box inside cell
      const cell = sharp(cleanBuffer).extract({ left, top, width: colWidth, height: rowHeight });
      const cellMeta = await cell.metadata();
      const { data: cellData } = await cell.raw().toBuffer({ resolveWithObject: true });

      let minX = colWidth, maxX = 0, minY = rowHeight, maxY = 0;
      for (let y = 0; y < rowHeight; y++) {
        for (let x = 0; x < colWidth; x++) {
          const a = cellData[(y * colWidth + x) * 4 + 3];
          if (a > 20) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX > minX && maxY > minY) {
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const outFile = path.join(outDir, `${name}.webp`);

        await sharp(cleanBuffer)
          .extract({ left: left + minX, top: top + minY, width: cropW, height: cropH })
          .resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 85 })
          .toFile(outFile);

        const stats = fs.statSync(outFile);
        console.log(`Saved icon: ${name}.webp (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    }
  }
}

processIcons().catch(console.error);
