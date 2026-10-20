import { describe, expect, it } from 'vitest';
import { normalizeUsername, validateUsername } from './username';

describe('normalizeUsername', () => {
  it('coi khác biệt hoa thường, dấu tiếng Việt và khoảng trắng là cùng một tên', () => {
    expect(normalizeUsername('  Kỳ   Anh  ')).toBe('ky-anh');
    expect(normalizeUsername('KỲ ANH')).toBe('ky-anh');
  });

  it('tạo khóa Firestore ổn định từ dấu phân cách', () => {
    expect(normalizeUsername('Sói_Đêm.01')).toBe('soi-dem-01');
  });
});

describe('validateUsername', () => {
  it('chấp nhận tên người chơi thông thường', () => {
    expect(validateUsername('Minh Anh 01')).toBeNull();
  });

  it('từ chối tên quá ngắn, quá dài hoặc chứa ký tự lạ', () => {
    expect(validateUsername('A')).toMatch(/ít nhất/);
    expect(validateUsername('a'.repeat(25))).toMatch(/không được quá/);
    expect(validateUsername('Minh/Anh')).toMatch(/chỉ nên gồm/);
  });
});
