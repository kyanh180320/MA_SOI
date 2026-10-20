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

const ICONS_WITH_ADJACENT_SPRITE_PIXELS = new Set([
  'icon_sun',
  'icon_eye',
  'icon_wolf_paw',
  'icon_wolf_paw_fire',
]);

// Giữ vòng huy hiệu ở tâm; chỉ cân lại artwork bên trong các thiết kế bất đối xứng.
const ICON_INNER_OFFSETS = {
  icon_eye: { x: 2.5, y: 0 },
  icon_potion_heal: { x: -2, y: 0 },
  icon_shield: { x: 3, y: 0 },
  icon_swords_alt: { x: -2, y: 3 },
  icon_wolf_paw_fire: { x: 3, y: 0 },
};

async function shiftInnerArtwork(iconBuffer, offset) {
  const { data, info } = await sharp(iconBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(data.length);
  const centerX = (info.width - 1) / 2;
  const centerY = (info.height - 1) / 2;
  const fullShiftRadius = 52;
  const fixedRimRadius = 70;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const distance = Math.hypot(x - centerX, y - centerY);
      const transition = Math.max(0, Math.min(1,
        (fixedRimRadius - distance) / (fixedRimRadius - fullShiftRadius),
      ));
      const weight = transition * transition * (3 - 2 * transition);
      const sourceX = Math.max(0, Math.min(info.width - 1, x - offset.x * weight));
      const sourceY = Math.max(0, Math.min(info.height - 1, y - offset.y * weight));
      const x0 = Math.floor(sourceX);
      const y0 = Math.floor(sourceY);
      const x1 = Math.min(info.width - 1, x0 + 1);
      const y1 = Math.min(info.height - 1, y0 + 1);
      const mixX = sourceX - x0;
      const mixY = sourceY - y0;
      const outputIndex = (y * info.width + x) * 4;

      for (let channel = 0; channel < 4; channel++) {
        const topLeft = data[(y0 * info.width + x0) * 4 + channel];
        const topRight = data[(y0 * info.width + x1) * 4 + channel];
        const bottomLeft = data[(y1 * info.width + x0) * 4 + channel];
        const bottomRight = data[(y1 * info.width + x1) * 4 + channel];
        const top = topLeft + (topRight - topLeft) * mixX;
        const bottom = bottomLeft + (bottomRight - bottomLeft) * mixX;
        output[outputIndex + channel] = Math.round(top + (bottom - top) * mixY);
      }
    }
  }

  return sharp(output, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

function findLargestOpaqueBounds(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let largest = null;

  for (let start = 0; start < width * height; start++) {
    if (visited[start] || data[start * 4 + 3] <= 20) continue;

    let head = 0;
    let tail = 0;
    let size = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      size++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width];
      for (const neighbor of neighbors) {
        const neighborX = neighbor % width;
        if (
          neighbor < 0 ||
          neighbor >= width * height ||
          Math.abs(neighborX - x) > 1 ||
          visited[neighbor] ||
          data[neighbor * 4 + 3] <= 20
        ) continue;

        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }

    if (!largest || size > largest.size) {
      largest = { size, minX, maxX, minY, maxY };
    }
  }

  return largest;
}

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
      const { data: cellData } = await cell.raw().toBuffer({ resolveWithObject: true });

      let minX = colWidth, maxX = 0, minY = rowHeight, maxY = 0;
      if (ICONS_WITH_ADJACENT_SPRITE_PIXELS.has(name)) {
        const bounds = findLargestOpaqueBounds(cellData, colWidth, rowHeight);
        if (bounds) {
          ({ minX, maxX, minY, maxY } = bounds);
        }
      } else {
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
      }

      if (maxX > minX && maxY > minY) {
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;
        const outFile = path.join(outDir, `${name}.webp`);

        const normalizedIcon = await sharp(cleanBuffer)
          .extract({ left: left + minX, top: top + minY, width: cropW, height: cropH })
          .resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();

        const innerOffset = ICON_INNER_OFFSETS[name];
        const finalIcon = innerOffset
          ? await shiftInnerArtwork(normalizedIcon, innerOffset)
          : normalizedIcon;

        await sharp(finalIcon)
          .webp({ quality: 85 })
          .toFile(outFile);

        const stats = fs.statSync(outFile);
        console.log(`Saved icon: ${name}.webp (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    }
  }
}

processIcons().catch(console.error);
