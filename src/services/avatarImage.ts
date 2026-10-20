const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 256;

export async function prepareAvatarImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Vui lòng chọn đúng định dạng ảnh.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Ảnh cần nhỏ hơn 5 MB.');

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.round((image.naturalWidth - cropSize) / 2);
    const sourceY = Math.round((image.naturalHeight - cropSize) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Thiết bị không thể xử lý ảnh này.');
    context.drawImage(
      image,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Không thể tối ưu ảnh đại diện.')),
        'image/webp',
        0.82,
      );
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
