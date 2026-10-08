import { RULES } from "./config";

/**
 * Xử lý kết quả bỏ phiếu ban ngày
 */
export function resolveVote(tally: Record<string, number>): string | undefined {
  if (Object.keys(tally).length === 0) return undefined;

  let maxVotes = -1;
  let candidates: string[] = [];

  for (const [id, votes] of Object.entries(tally)) {
    if (votes > maxVotes) {
      maxVotes = votes;
      candidates = [id];
    } else if (votes === maxVotes) {
      candidates.push(id);
    }
  }

  if (candidates.length > 1 && RULES.tieVoteEliminatesNobody) {
    return undefined; // Hòa phiếu không ai chết
  }
  
  if (candidates.length > 0) {
    return candidates[0];
  }

  return undefined;
}
