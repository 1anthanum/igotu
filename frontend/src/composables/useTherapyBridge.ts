/**
 * IGOTU — Therapy Bridge（治疗桥梁）
 *
 * 连接 app 和真实治疗的中间层：
 * 1. 自动汇总本周情绪曲线、工具使用、标记时刻 → 生成"给治疗师看的摘要"
 * 2. 治疗作业追踪 — therapist 给的 homework 有地方记录和勾选
 *
 * 数据全部存 localStorage，不上传后端。
 */
import { ref, computed, watch } from 'vue';

// ── Types ──

export interface TherapyHomework {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  doneAt?: number;
  note?: string;
}

export interface WeeklyMoodEntry {
  date: string;       // YYYY-MM-DD
  avgMood: number;    // 1-5
  toolsUsed: string[];
  highlights: string[];
}

export interface TherapySummary {
  weekStart: string;
  weekEnd: string;
  entries: WeeklyMoodEntry[];
  overallAvg: number;
  toolFrequency: Record<string, number>;
  homeworkDone: number;
  homeworkTotal: number;
  topHighlights: string[];
}

// ── Storage Keys ──
const HW_KEY = 'igotu_therapy_homework';
const MOOD_LOG_KEY = 'igotu_daily_mood_log';
const HIGHLIGHTS_KEY = 'igotu_daily_highlights';

// ── Helper ──
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay();
}

/** Get Monday of the week containing `date` */
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0, 10);
}

function weekEnd(startStr: string): string {
  const d = new Date(startStr + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

// ── Composable ──

export function useTherapyBridge() {
  // ── Homework ──
  const homework = ref<TherapyHomework[]>([]);

  function loadHomework() {
    try {
      const raw = localStorage.getItem(HW_KEY);
      homework.value = raw ? JSON.parse(raw) : [];
    } catch { homework.value = []; }
  }

  function saveHomework() {
    localStorage.setItem(HW_KEY, JSON.stringify(homework.value));
  }

  function addHomework(text: string) {
    const item: TherapyHomework = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text.trim(),
      done: false,
      createdAt: Date.now(),
    };
    homework.value.unshift(item);
    saveHomework();
  }

  function toggleHomework(id: string) {
    const item = homework.value.find(h => h.id === id);
    if (item) {
      item.done = !item.done;
      item.doneAt = item.done ? Date.now() : undefined;
      saveHomework();
    }
  }

  function addHomeworkNote(id: string, note: string) {
    const item = homework.value.find(h => h.id === id);
    if (item) {
      item.note = note;
      saveHomework();
    }
  }

  function removeHomework(id: string) {
    homework.value = homework.value.filter(h => h.id !== id);
    saveHomework();
  }

  const activeHomework = computed(() => homework.value.filter(h => !h.done));
  const doneHomework = computed(() => homework.value.filter(h => h.done));

  // ── Daily Mood Log (lightweight, for summary) ──
  // Format: { "2026-04-18": { avg: 3, tools: ["breathing", "chat"], highlights: ["..."] } }

  function logDailyMood(mood: number) {
    try {
      const data = JSON.parse(localStorage.getItem(MOOD_LOG_KEY) || '{}');
      const today = todayStr();
      if (!data[today]) {
        data[today] = { scores: [], tools: [] };
      }
      data[today].scores.push(mood);
      localStorage.setItem(MOOD_LOG_KEY, JSON.stringify(data));
    } catch { /* silently fail */ }
  }

  function logToolUsage(toolName: string) {
    try {
      const data = JSON.parse(localStorage.getItem(MOOD_LOG_KEY) || '{}');
      const today = todayStr();
      if (!data[today]) {
        data[today] = { scores: [], tools: [] };
      }
      if (!data[today].tools.includes(toolName)) {
        data[today].tools.push(toolName);
      }
      localStorage.setItem(MOOD_LOG_KEY, JSON.stringify(data));
    } catch { /* silently fail */ }
  }

  function addHighlight(text: string) {
    try {
      const data = JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || '{}');
      const today = todayStr();
      if (!data[today]) data[today] = [];
      data[today].push(text);
      localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(data));
    } catch { /* silently fail */ }
  }

  // ── Weekly Summary Generation ──

  function generateWeeklySummary(): TherapySummary {
    const today = todayStr();
    const ws = weekStart(today);
    const we = weekEnd(ws);

    const moodData = JSON.parse(localStorage.getItem(MOOD_LOG_KEY) || '{}');
    const highlightsData = JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || '{}');

    const entries: WeeklyMoodEntry[] = [];
    const toolFreq: Record<string, number> = {};
    const allHighlights: string[] = [];
    let totalMood = 0;
    let moodDays = 0;

    // Iterate 7 days of this week
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      if (dateStr > today) break;

      const dayData = moodData[dateStr];
      const dayHighlights = highlightsData[dateStr] || [];

      let avgMood = 0;
      let tools: string[] = [];

      if (dayData) {
        const scores: number[] = dayData.scores || [];
        tools = dayData.tools || [];

        if (scores.length > 0) {
          avgMood = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10;
          totalMood += avgMood;
          moodDays++;
        }

        tools.forEach((t: string) => {
          toolFreq[t] = (toolFreq[t] || 0) + 1;
        });
      }

      allHighlights.push(...dayHighlights);

      entries.push({
        date: dateStr,
        avgMood,
        toolsUsed: tools,
        highlights: dayHighlights,
      });
    }

    const hwDone = homework.value.filter(h => h.done).length;
    const hwTotal = homework.value.length;

    return {
      weekStart: ws,
      weekEnd: we,
      entries,
      overallAvg: moodDays > 0 ? Math.round(totalMood / moodDays * 10) / 10 : 0,
      toolFrequency: toolFreq,
      homeworkDone: hwDone,
      homeworkTotal: hwTotal,
      topHighlights: allHighlights.slice(0, 5),
    };
  }

  /** Generate plain text summary for copy/share */
  function generateSummaryText(): string {
    const s = generateWeeklySummary();
    const lines: string[] = [];

    lines.push(`📋 IGOTU 本周情绪摘要`);
    lines.push(`${s.weekStart} ~ ${s.weekEnd}`);
    lines.push('');

    // Mood trend
    lines.push('📊 情绪趋势:');
    const moodEmojis: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    for (const entry of s.entries) {
      const d = new Date(entry.date + 'T00:00:00');
      const dayName = '周' + dayNames[d.getDay()];
      const emoji = entry.avgMood > 0 ? (moodEmojis[Math.round(entry.avgMood)] || '·') : '·';
      lines.push(`  ${dayName} ${emoji} ${entry.avgMood > 0 ? entry.avgMood.toFixed(1) : '未记录'}`);
    }
    lines.push(`  平均: ${s.overallAvg > 0 ? s.overallAvg.toFixed(1) : '—'}`);
    lines.push('');

    // Tools used
    if (Object.keys(s.toolFrequency).length > 0) {
      lines.push('🧰 使用的工具:');
      const toolLabels: Record<string, string> = {
        breathing: '呼吸练习', grounding: '扎根练习',
        chat: 'AI 对话', cognitive: '认知重构', mood: '心情记录',
      };
      for (const [tool, count] of Object.entries(s.toolFrequency)) {
        lines.push(`  ${toolLabels[tool] || tool}: ${count}次`);
      }
      lines.push('');
    }

    // Homework
    if (s.homeworkTotal > 0) {
      lines.push(`📝 治疗作业: ${s.homeworkDone}/${s.homeworkTotal} 完成`);
      lines.push('');
    }

    // Highlights
    if (s.topHighlights.length > 0) {
      lines.push('✨ 本周亮点:');
      for (const h of s.topHighlights) {
        lines.push(`  · ${h}`);
      }
      lines.push('');
    }

    lines.push('—— 来自 IGOTU 情绪陪伴');

    return lines.join('\n');
  }

  // Init
  loadHomework();

  return {
    // Homework
    homework,
    activeHomework,
    doneHomework,
    addHomework,
    toggleHomework,
    addHomeworkNote,
    removeHomework,

    // Daily logging
    logDailyMood,
    logToolUsage,
    addHighlight,

    // Summary
    generateWeeklySummary,
    generateSummaryText,
  };
}
