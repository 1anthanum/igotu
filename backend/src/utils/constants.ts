// Achievement categories
export const CATEGORIES = [
  'self-care',   // 自我照顾
  'movement',    // 运动/出门
  'social',      // 社交
  'nutrition',   // 饮食
  'rest',        // 休息
  'hygiene',     // 卫生
  'productivity',// 做事
  'custom',      // 自定义
] as const;

export type Category = typeof CATEGORIES[number];

// Default achievement templates (seeded on user registration)
export const DEFAULT_TEMPLATES = [
  { title: '刷牙', emoji: '🪥', category: 'hygiene' as Category },
  { title: '喝水', emoji: '💧', category: 'nutrition' as Category },
  { title: '出门', emoji: '🚶', category: 'movement' as Category },
  { title: '吃饭', emoji: '🍚', category: 'nutrition' as Category },
  { title: '洗澡', emoji: '🛁', category: 'hygiene' as Category },
  { title: '睡觉', emoji: '😴', category: 'rest' as Category },
  { title: '运动', emoji: '💪', category: 'movement' as Category },
  { title: '联系朋友', emoji: '🤝', category: 'social' as Category },
  { title: '做家务', emoji: '🧹', category: 'productivity' as Category },
  { title: '看书', emoji: '📖', category: 'self-care' as Category },
  { title: '晒太阳', emoji: '☀️', category: 'movement' as Category },
  { title: '深呼吸', emoji: '🌬️', category: 'self-care' as Category },
];

// Encouragement messages — NEVER guilt-inducing
export const ENCOURAGEMENT = {
  first_achievement: [
    '你做到了！这是很棒的第一步 🌱',
    '好的开始！每一个成就都值得被记住',
    '你今天选择了记录，这本身就是一个成就 ✨',
  ],
  returning_after_break: [
    '欢迎回来！我们一直在这里等你 💙',
    '不管过了多久，你回来了，这就很棒',
    '没有什么"应该"的节奏，你的节奏就是最好的',
  ],
  streak_milestone: [
    '连续 {days} 天了！你在一步一步照顾自己 🔥',
    '{days} 天的坚持，每一天都不容易，你做到了',
  ],
  daily_summary: (count: number) => {
    if (count === 0) return '今天还没记录，没关系的，我们随时在这里 💙';
    if (count === 1) return `今天完成了 1 件事，这很好！`;
    if (count < 5) return `今天完成了 ${count} 件事，你在照顾自己 🌟`;
    return `今天完成了 ${count} 件事！好厉害！✨`;
  },
  weekly_summary: (count: number) => {
    if (count === 0) return '这周休息了一下，没关系。我们不急 💙';
    if (count < 5) return `这周完成了 ${count} 件事，每一件都算数！`;
    if (count < 15) return `这周完成了 ${count} 件事，你在变得更好 🌟`;
    return `这周完成了 ${count} 件事！你一直在努力 ✨`;
  },
  category_milestone: {
    'self-care': '照顾自己是最重要的事 🛀',
    'movement': '你动起来了，身体会感谢你 💪',
    'social': '和别人连接需要勇气，你做到了 🤝',
    'nutrition': '好好吃饭，你值得被善待 🥗',
    'rest': '休息不是偷懒，是给自己充电 😴',
    'hygiene': '打理自己就是爱自己 🪥',
    'productivity': '做了一件事就是胜利 📋',
    'custom': '你在用自己的方式进步 🌈',
  },
};
