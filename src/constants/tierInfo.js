export const TIER_INFO = {
  0: {
    name: 'Bronze',
    threshold: 10,
    reward: 50,
    cooldown: 48 * 60 * 60, // 48 hours
    color: '#cd7f32',
  },
  1: {
    name: 'Silver',
    threshold: 100,
    reward: 300,
    cooldown: 88 * 60 * 60, // 88 hours
    color: '#c0c0c0',
  },
  2: {
    name: 'Gold',
    threshold: 1000,
    reward: 900,
    cooldown: 178 * 60 * 60, // 178 hours
    color: '#ffd700',
  },
  3: {
    name: 'Platinum',
    threshold: 2000,
    reward: 1800,
    cooldown: 228 * 60 * 60, // 228 hours
    color: '#e5e4e2',
  },
};
