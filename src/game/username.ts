const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 24;

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function validateUsername(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return `Tên cần ít nhất ${USERNAME_MIN_LENGTH} ký tự.`;
  }
  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return `Tên không được quá ${USERNAME_MAX_LENGTH} ký tự.`;
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(trimmed)) {
    return 'Tên chỉ nên gồm chữ, số, khoảng trắng, dấu chấm, gạch ngang hoặc gạch dưới.';
  }
  if (!normalizeUsername(trimmed)) {
    return 'Tên này không thể sử dụng.';
  }
  return null;
}
