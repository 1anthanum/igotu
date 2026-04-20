<script setup lang="ts">
/**
 * TherapyBridge — 治疗桥梁页面
 *
 * 两个 tab：
 * 1. 治疗作业 — therapist 布置的任务，勾选完成，可加笔记
 * 2. 本周摘要 — 自动生成，一键复制给治疗师
 *
 * 不是医疗功能，是"帮你记住这周发生了什么"的自我工具。
 */
import { ref, computed } from 'vue';
import { useMoodThemeStore } from '@/composables/useMoodTheme';
import { useTherapyBridge, type TherapySummary } from '@/composables/useTherapyBridge';
import { useI18n } from '@/i18n';

const { t } = useI18n();
const moodTheme = useMoodThemeStore();
const therapy = useTherapyBridge();

const activeTab = ref<'homework' | 'summary'>('homework');

// ── Homework input ──
const newHomeworkText = ref('');

function addHomework() {
  const text = newHomeworkText.value.trim();
  if (!text) return;
  therapy.addHomework(text);
  newHomeworkText.value = '';
}

// ── Note editing ──
const editingNoteId = ref<string | null>(null);
const noteInput = ref('');

function startNoteEdit(id: string, existingNote?: string) {
  editingNoteId.value = id;
  noteInput.value = existingNote || '';
}

function saveNote(id: string) {
  therapy.addHomeworkNote(id, noteInput.value);
  editingNoteId.value = null;
  noteInput.value = '';
}

// ── Summary ──
const summary = computed<TherapySummary>(() => therapy.generateWeeklySummary());

const copySuccess = ref(false);

async function copySummary() {
  const text = therapy.generateSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  }
}

// ── Mood emoji helper ──
const MOOD_EMOJI: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };
const DAY_NAMES = computed(() => t('therapy.dayNames') as unknown as string[]);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return t('therapy.dayPrefix', { day: DAY_NAMES.value[d.getDay()] });
}
</script>

<template>
  <div class="pt-6 space-y-5">
    <!-- Header -->
    <div class="animate-float-in">
      <router-link to="/" class="text-xs" style="color: var(--text-muted);">← {{ t('therapy.backHome') }}</router-link>
      <h1 class="text-xl font-medium mt-2" style="color: var(--text-primary);">
        🌉 {{ t('therapy.title') }}
      </h1>
      <p class="text-xs mt-1" style="color: var(--text-muted);">
        {{ t('therapy.subtitle') }}
      </p>
    </div>

    <!-- Tab switcher -->
    <div class="tab-switcher">
      <button
        :class="['tab-btn', { active: activeTab === 'homework' }]"
        :style="activeTab === 'homework' ? { color: moodTheme.palette.navActiveText, borderColor: moodTheme.palette.accent } : {}"
        @click="activeTab = 'homework'"
      >
        📝 {{ t('therapy.tabHomework') }}
        <span v-if="therapy.activeHomework.value.length > 0" class="tab-badge">
          {{ therapy.activeHomework.value.length }}
        </span>
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'summary' }]"
        :style="activeTab === 'summary' ? { color: moodTheme.palette.navActiveText, borderColor: moodTheme.palette.accent } : {}"
        @click="activeTab = 'summary'"
      >
        📋 {{ t('therapy.tabSummary') }}
      </button>
    </div>

    <!--
      ═══ TAB 1: Homework ═══
    -->
    <div v-if="activeTab === 'homework'" class="space-y-4 animate-float-in">
      <!-- Add homework -->
      <div class="card">
        <p class="text-xs mb-2" style="color: var(--text-muted);">
          {{ t('therapy.hwDesc') }}
        </p>
        <div class="hw-input-row">
          <input
            v-model="newHomeworkText"
            type="text"
            :placeholder="t('therapy.hwPlaceholder')"
            maxlength="200"
            class="hw-input"
            @keyup.enter="addHomework"
          />
          <button
            class="hw-add-btn"
            :style="{ background: moodTheme.palette.navActive, color: moodTheme.palette.navActiveText }"
            :disabled="!newHomeworkText.trim()"
            @click="addHomework"
          >
            +
          </button>
        </div>
      </div>

      <!-- Active homework list -->
      <div v-if="therapy.activeHomework.value.length > 0" class="space-y-2">
        <div
          v-for="hw in therapy.activeHomework.value"
          :key="hw.id"
          class="card hw-card"
        >
          <div class="hw-main">
            <button
              class="hw-check"
              :style="{ borderColor: moodTheme.palette.accent + '60' }"
              @click="therapy.toggleHomework(hw.id)"
            >
            </button>
            <div class="hw-content">
              <p class="hw-text">{{ hw.text }}</p>
              <!-- Note -->
              <template v-if="editingNoteId === hw.id">
                <div class="hw-note-edit">
                  <input
                    v-model="noteInput"
                    type="text"
                    :placeholder="t('therapy.noteHint')"
                    class="hw-note-input"
                    @keyup.enter="saveNote(hw.id)"
                  />
                  <button class="hw-note-save" @click="saveNote(hw.id)">✓</button>
                </div>
              </template>
              <template v-else>
                <p v-if="hw.note" class="hw-note" @click="startNoteEdit(hw.id, hw.note)">
                  📝 {{ hw.note }}
                </p>
                <button v-else class="hw-add-note" @click="startNoteEdit(hw.id)">
                  + {{ t('therapy.addNote') }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Done homework (collapsible) -->
      <details v-if="therapy.doneHomework.value.length > 0" class="done-section">
        <summary class="done-summary" style="color: var(--text-muted);">
          ✅ {{ t('therapy.completed', { count: therapy.doneHomework.value.length }) }}
        </summary>
        <div class="space-y-2 mt-2">
          <div
            v-for="hw in therapy.doneHomework.value"
            :key="hw.id"
            class="card hw-card done"
          >
            <div class="hw-main">
              <button
                class="hw-check checked"
                :style="{ background: moodTheme.palette.accent + '30', borderColor: moodTheme.palette.accent }"
                @click="therapy.toggleHomework(hw.id)"
              >
                ✓
              </button>
              <div class="hw-content">
                <p class="hw-text done-text">{{ hw.text }}</p>
                <p v-if="hw.note" class="hw-note">📝 {{ hw.note }}</p>
              </div>
              <button class="hw-delete" @click="therapy.removeHomework(hw.id)">✕</button>
            </div>
          </div>
        </div>
      </details>

      <!-- Empty state -->
      <div v-if="therapy.homework.value.length === 0" class="empty-state">
        <div class="text-2xl mb-2">📝</div>
        <p class="text-sm" style="color: var(--text-secondary);">{{ t('therapy.emptyHw') }}</p>
        <p class="text-xs" style="color: var(--text-muted);">
          {{ t('therapy.emptyHwHint') }}
        </p>
      </div>
    </div>

    <!--
      ═══ TAB 2: Weekly Summary ═══
    -->
    <div v-if="activeTab === 'summary'" class="space-y-4 animate-float-in">
      <!-- Summary card -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-medium" style="color: var(--text-primary);">
              {{ summary.weekStart }} ~ {{ summary.weekEnd }}
            </h3>
            <p class="text-xs" style="color: var(--text-muted);">{{ t('therapy.summaryAutoGen') }}</p>
          </div>
          <button
            class="copy-btn"
            :style="{ background: moodTheme.palette.navActive, color: moodTheme.palette.navActiveText }"
            @click="copySummary"
          >
            {{ copySuccess ? t('therapy.copied') : t('therapy.copy') }}
          </button>
        </div>

        <!-- Mood trend mini chart -->
        <div class="mood-week-row">
          <div
            v-for="entry in summary.entries"
            :key="entry.date"
            class="mood-day"
          >
            <span class="mood-day-label">{{ formatDate(entry.date) }}</span>
            <span class="mood-day-emoji">
              {{ entry.avgMood > 0 ? (MOOD_EMOJI[Math.round(entry.avgMood)] || '·') : '·' }}
            </span>
            <span class="mood-day-score">
              {{ entry.avgMood > 0 ? entry.avgMood.toFixed(1) : '' }}
            </span>
          </div>
        </div>

        <!-- Overall -->
        <div v-if="summary.overallAvg > 0" class="overall-mood">
          <span>{{ t('therapy.avgMood') }}</span>
          <span :style="{ color: moodTheme.palette.accent }">
            {{ MOOD_EMOJI[Math.round(summary.overallAvg)] }} {{ summary.overallAvg.toFixed(1) }}
          </span>
        </div>
      </div>

      <!-- Tools used -->
      <div v-if="Object.keys(summary.toolFrequency).length > 0" class="card">
        <h3 class="text-sm font-medium mb-2" style="color: var(--text-primary);">🧰 {{ t('therapy.usedTools') }}</h3>
        <div class="tool-chips">
          <span
            v-for="(count, tool) in summary.toolFrequency"
            :key="tool"
            class="tool-chip"
            :style="{ borderColor: moodTheme.palette.accent + '30' }"
          >
            {{ tool }} × {{ count }}
          </span>
        </div>
      </div>

      <!-- Homework progress -->
      <div v-if="summary.homeworkTotal > 0" class="card">
        <h3 class="text-sm font-medium mb-2" style="color: var(--text-primary);">📝 {{ t('therapy.hwProgress') }}</h3>
        <div class="hw-progress">
          <div class="hw-progress-bar">
            <div
              class="hw-progress-fill"
              :style="{
                width: (summary.homeworkDone / summary.homeworkTotal * 100) + '%',
                background: moodTheme.palette.accent,
              }"
            />
          </div>
          <span class="text-xs" style="color: var(--text-muted);">
            {{ summary.homeworkDone }} / {{ summary.homeworkTotal }}
          </span>
        </div>
      </div>

      <!-- Highlights -->
      <div v-if="summary.topHighlights.length > 0" class="card">
        <h3 class="text-sm font-medium mb-2" style="color: var(--text-primary);">✨ {{ t('therapy.highlights') }}</h3>
        <ul class="highlight-list">
          <li v-for="(h, i) in summary.topHighlights" :key="i" class="highlight-item">
            {{ h }}
          </li>
        </ul>
      </div>

      <!-- Empty summary state -->
      <div v-if="summary.overallAvg === 0 && summary.homeworkTotal === 0" class="empty-state">
        <div class="text-2xl mb-2">📋</div>
        <p class="text-sm" style="color: var(--text-secondary);">{{ t('therapy.emptySummary') }}</p>
        <p class="text-xs" style="color: var(--text-muted);">
          {{ t('therapy.emptySummaryHint') }}
        </p>
      </div>

      <!-- Disclaimer -->
      <p class="text-[10px] text-center" style="color: var(--text-muted); opacity: 0.5;">
        {{ t('therapy.disclaimer') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.tab-switcher {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-subtle);
}
.tab-btn {
  flex: 1;
  padding: 0.6rem 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: none;
}
.tab-btn.active {
  font-weight: 500;
}
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.1rem;
  height: 1.1rem;
  font-size: 0.65rem;
  border-radius: 999px;
  background: var(--mood-accent);
  color: var(--bg-primary);
  margin-left: 0.3rem;
}

/* ── Homework ── */
.hw-input-row {
  display: flex;
  gap: 0.5rem;
}
.hw-input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
}
.hw-input:focus {
  border-color: var(--mood-accent);
}
.hw-add-btn {
  width: 2.5rem;
  border-radius: 0.75rem;
  font-size: 1.1rem;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.hw-add-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.hw-card {
  padding: 0.75rem;
}
.hw-card.done {
  opacity: 0.6;
}
.hw-main {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}
.hw-check {
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  border: 2px solid var(--border-subtle);
  flex-shrink: 0;
  cursor: pointer;
  margin-top: 0.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  background: none;
  color: var(--mood-accent);
  transition: all 0.2s;
}
.hw-check.checked {
  font-weight: bold;
}
.hw-content {
  flex: 1;
  min-width: 0;
}
.hw-text {
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.4;
}
.hw-text.done-text {
  text-decoration: line-through;
  color: var(--text-muted);
}
.hw-note {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  cursor: pointer;
}
.hw-add-note {
  font-size: 0.7rem;
  color: var(--text-muted);
  opacity: 0.5;
  cursor: pointer;
  margin-top: 0.2rem;
  background: none;
  border: none;
  padding: 0;
}
.hw-add-note:hover { opacity: 0.8; }
.hw-note-edit {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.3rem;
}
.hw-note-input {
  flex: 1;
  padding: 0.3rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.75rem;
  outline: none;
}
.hw-note-save {
  padding: 0.2rem 0.5rem;
  border-radius: 0.5rem;
  background: var(--mood-accent);
  color: var(--bg-primary);
  font-size: 0.75rem;
  border: none;
  cursor: pointer;
}
.hw-delete {
  font-size: 0.7rem;
  color: var(--text-muted);
  opacity: 0.4;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0.2rem;
}
.hw-delete:hover { opacity: 0.8; }

.done-section {
  margin-top: 0.5rem;
}
.done-summary {
  font-size: 0.8rem;
  cursor: pointer;
  list-style: none;
  padding: 0.3rem 0;
}
.done-summary::-webkit-details-marker { display: none; }

/* ── Summary ── */
.copy-btn {
  padding: 0.35rem 0.75rem;
  border-radius: 0.6rem;
  font-size: 0.75rem;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.mood-week-row {
  display: flex;
  justify-content: space-between;
  gap: 0.3rem;
  margin: 0.75rem 0;
}
.mood-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  flex: 1;
}
.mood-day-label {
  font-size: 0.65rem;
  color: var(--text-muted);
}
.mood-day-emoji {
  font-size: 1rem;
}
.mood-day-score {
  font-size: 0.6rem;
  color: var(--text-muted);
  min-height: 0.8em;
}

.overall-mood {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-subtle);
}

.tool-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.tool-chip {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

.hw-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.hw-progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-primary);
  overflow: hidden;
}
.hw-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.highlight-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.highlight-item {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--border-subtle);
}
.highlight-item:last-child {
  border-bottom: none;
}

.empty-state {
  text-align: center;
  padding: 2rem 0;
}

@media (prefers-reduced-motion: reduce) {
  .copy-btn, .hw-check, .hw-add-btn { transition: none !important; }
}
</style>
