import sharp from 'sharp';

async function checkCard(filePath) {
  const image = sharp(filePath);
  const { width, height } = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  
  // Find bounding box where pixel is NOT green
  // Green is roughly: G > 180 and R < 100 and B < 100
  function isGreen(r, g, b) {
    return g > 150 && g > r * 1.5 && g > b * 1.5;
  }

  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (!isGreen(r, g, b)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`${filePath}: width=${width}, height=${height}, bbox=[x:${minX}, y:${minY}, w:${maxX - minX + 1}, h:${maxY - minY + 1}]`);
}

async function run() {
  const files = [
    'design/reference/wolf.png',
    'design/reference/demonWolf.png',
    'design/reference/guardian.png',
    'design/reference/human.png',
    'design/reference/hunter.png',
    'design/reference/seer.png',
    'design/reference/witch.png',
    'design/reference/back_card.png'
  ];
  for (const f of files) {
    await checkCard(f);
  }
}

run().catch(console.error);
