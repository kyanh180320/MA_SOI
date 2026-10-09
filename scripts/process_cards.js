import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const CARDS = [
  { id: 'wolf', src: 'design/reference/wolf.png', out: 'public/assets/cards/card_wolf.webp', hasGreen: true },
  { id: 'wolf_demon', src: 'design/reference/demonWolf.png', out: 'public/assets/cards/card_wolf_demon.webp', hasGreen: true },
  { id: 'guard', src: 'design/reference/guardian.png', out: 'public/assets/cards/card_guard.webp', hasGreen: true },
  { id: 'villager', src: 'design/reference/human.png', out: 'public/assets/cards/card_villager.webp', hasGreen: true },
  { id: 'hunter', src: 'design/reference/hunter.png', out: 'public/assets/cards/card_hunter.webp', hasGreen: true },
  { id: 'seer', src: 'design/reference/seer.png', out: 'public/assets/cards/card_seer.webp', hasGreen: true },
  { id: 'witch', src: 'design/reference/witch.png', out: 'public/assets/cards/card_witch.webp', hasGreen: true },
  { id: 'back', src: 'design/reference/back_card.png', out: 'public/assets/cards/card_back.webp', hasGreen: false }
];

async function processCard({ src, out, hasGreen }) {
  const outDir = path.dirname(out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  if (!hasGreen) {
    await sharp(src)
      .resize(480, 720, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(out);
  } else {
    const image = sharp(src);
    const { width, height } = await image.metadata();
    const { data } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (g > 110 && g > r * 1.35 && g > b * 1.35) {
        data[i + 3] = 0; // Transparent
      } else if (g > 90 && g > r * 1.15 && g > b * 1.15) {
        const greenExcess = g - Math.max(r, b);
        data[i + 1] = Math.max(0, g - greenExcess);
      }
    }

    // Bounding box of card
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
  }

  const stats = fs.statSync(out);
  console.log(`Processed: ${out} (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function run() {
  for (const c of CARDS) {
    await processCard(c);
  }
  console.log('ALL 8 CARDS READY!');
}

run().catch(console.error);
