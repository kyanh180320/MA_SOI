import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISCUSSION_MINUTES,
  formatDiscussionTime,
  getRemainingSeconds,
  sanitizeDiscussionMinutes,
} from "./discussionTimer";

describe("discussion timer", () => {
  it("giới hạn cấu hình trong khoảng 1 đến 30 phút", () => {
    expect(sanitizeDiscussionMinutes(0)).toBe(1);
    expect(sanitizeDiscussionMinutes(12.6)).toBe(13);
    expect(sanitizeDiscussionMinutes(99)).toBe(30);
    expect(sanitizeDiscussionMinutes(Number.NaN)).toBe(DEFAULT_DISCUSSION_MINUTES);
  });

  it("tính thời gian còn lại theo deadline để không trôi khi tab chạy nền", () => {
    expect(getRemainingSeconds(10_001, 10_000)).toBe(1);
    expect(getRemainingSeconds(11_500, 10_000)).toBe(2);
    expect(getRemainingSeconds(9_000, 10_000)).toBe(0);
  });

  it("định dạng đồng hồ mm:ss", () => {
    expect(formatDiscussionTime(0)).toBe("00:00");
    expect(formatDiscussionTime(65)).toBe("01:05");
    expect(formatDiscussionTime(1_800)).toBe("30:00");
  });
});
