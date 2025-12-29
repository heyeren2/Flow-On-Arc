export const TIER_INFO = {
  0: {
    name: 'Bronze',
    threshold: 10, // 10 USDC
    reward: 1000, // 1,000 tokens
    cooldown: 12 * 60 * 60, // 12 hours
    color: '#cd7f32',
  },
  1: {
    name: 'Silver',
    threshold: 100, // 100 USDC
    reward: 100000, // 100,000 tokens
    cooldown: 12 * 60 * 60, // 12 hours
    color: '#c0c0c0',
  },
  2: {
    name: 'Gold',
    threshold: 1000, // 1,000 USDC
    reward: 1000000, // 1,000,000 tokens
    cooldown: 24 * 60 * 60, // 1 day
    color: '#ffd700',
  },
  3: {
    name: 'Platinum',
    threshold: 2000, // 2,000 USDC
    reward: 10000000, // 10,000,000 tokens
    cooldown: 7 * 24 * 60 * 60, // 7 days
    color: '#e5e4e2',
  },
};

