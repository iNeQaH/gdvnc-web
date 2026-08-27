export type LevelTagFlags = {
  isVN: boolean;
  isChallenge: boolean;
};

export function levelTagFlags(level: { isVN?: boolean | null; isChallenge?: boolean | null }): LevelTagFlags {
  return {
    isVN: !!level.isVN,
    isChallenge: !!level.isChallenge,
  };
}
