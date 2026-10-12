export const RULES = {
  minPlayers: 4,
  maxPlayers: 20,
  witch: { saveCount: 1, poisonCount: 1 },
  witchCanSaveSelf: true,
  witchCanUseBothInOneNight: false,
  tieVoteEliminatesNobody: true,
} as const;
