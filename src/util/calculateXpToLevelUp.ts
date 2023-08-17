// separate file so it stays consistent

export const baseXpPerRank = 2000;

export function calculateXpToLevelUp(rank: number): number {
  const result = Math.min((rank / 13) ** 2 + (0.2 * rank + 1), 0.45 * rank + 1) * baseXpPerRank;
  // \left(\frac{x}{13}\right)^{2}+1\ +\left(0.2x\right)
  // on desmos
  return Math.round(result);
}