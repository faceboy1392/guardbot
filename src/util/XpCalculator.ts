import { calculateXpToLevelUp } from "./calculateXpToLevelUp";

/**
 * Calculates xp, ranks, and total xp such that everything stays properly consistent
 */
export default class XpCalculator {
  private _xp: number;
  private _rank: number;

  /**
   * @param xp
   * @param rank
   */
  constructor(xp: number, rank: number) {
    this._xp = xp;
    this._rank = rank;
    if (xp > calculateXpToLevelUp(rank)) this.balanceXpAndRanks();
  }

  addXp(xp: number, overflowIntoRanks = true): XpCalculator {
    if (overflowIntoRanks) {
      this._xp += xp;
    } else {
      // clamp it between 0 and the max for this rank minus one, the 0 part is for negative numbers to work correctly
      this._xp = Math.max(Math.min(this._xp + xp, calculateXpToLevelUp(this._rank) - 1), 0);
    }
    this.balanceXpAndRanks();
    return this;
  }
  addRank(rank: number): XpCalculator {
    this._rank += rank;
    return this;
  }
  removeXp(xp: number, underflowIntoRank = true): XpCalculator {
    this.addXp(-xp, underflowIntoRank);
    return this;
  }
  removeRank(rank: number): XpCalculator {
    this.addRank(-rank);
    return this;
  }

  maxXp(xp: number): XpCalculator {
    if (this._xp > xp) this._xp = xp;
    this._xp = Math.max(this._xp, 0)
    return this;
  }
  maxRank(rank: number): XpCalculator {
    if (this._rank > rank) this._rank = rank;
    this._rank = Math.max(this._rank, 0)
    return this;
  }
  maxXpAndRank(xp: number, rank: number): XpCalculator {
    this.maxXp(xp);
    this.maxRank(rank);
    return this;
  }

  // chatgpt code because im stupid
  private balanceXpAndRanks() {
    let currentXpPerRank = calculateXpToLevelUp(this._rank);

    // Determine if there is excess XP
    let excess = this._xp;

    // Level up as needed
    while (excess >= currentXpPerRank) {
      excess -= currentXpPerRank;
      this._rank++;
      currentXpPerRank = calculateXpToLevelUp(this._rank);
    }

    // Level down as needed
    while (excess < 0 && this._rank > 0) {
      this._rank--;
      currentXpPerRank = calculateXpToLevelUp(this._rank);
      excess += currentXpPerRank;
    }

    this._xp = excess;
  }

  get xp(): number {
    return Math.round(this._xp);
  }
  get rank(): number {
    return this._rank;
  }
  // more chatgpt code because im stupid
  get totalXp(): number {
    let total = 0;

    for (let i = 0; i < this._rank; i++) {
      total += calculateXpToLevelUp(i);
    }

    return total + this._xp;
  }
}
