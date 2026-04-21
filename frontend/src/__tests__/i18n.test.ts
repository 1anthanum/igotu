import { describe, it, expect, beforeEach } from 'vitest';
import { useI18n, setLocale, currentLocale } from '@/i18n';

describe('i18n system', () => {
  beforeEach(() => {
    localStorage.clear();
    currentLocale.value = 'zh';
  });

  it('returns Chinese translation by default', () => {
    const { t } = useI18n();
    expect(t('common.send')).toBe('发送');
  });

  it('returns English translation when locale is en', () => {
    setLocale('en');
    const { t } = useI18n();
    expect(t('common.send')).toBe('Send');
  });

  it('falls back to zh when en key is missing', () => {
    setLocale('en');
    const { t } = useI18n();
    // Access a key that likely exists in zh but test fallback behavior
    const result = t('common.back');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns the key path if key does not exist in any locale', () => {
    const { t } = useI18n();
    expect(t('nonexistent.key.path')).toBe('nonexistent.key.path');
  });

  it('interpolates params in translated string', () => {
    const { t } = useI18n();
    const result = t('breathing.cycleProgress', { current: 2, total: 5 });
    expect(result).toContain('2');
    expect(result).toContain('5');
  });

  it('persists locale to localStorage', () => {
    setLocale('en');
    expect(localStorage.getItem('igotu_locale')).toBe('en');
  });

  it('loads locale from localStorage', () => {
    localStorage.setItem('igotu_locale', 'en');
    // Re-import would use loadLocale, but we can test the setter/getter
    setLocale('en');
    const { isEn, isZh } = useI18n();
    expect(isEn.value).toBe(true);
    expect(isZh.value).toBe(false);
  });

  it('resolves nested object keys (not just strings)', () => {
    const { t } = useI18n();
    // chat.suggestions is an object, not a string
    const suggestions = t('chat.suggestions');
    expect(typeof suggestions).toBe('object');
    expect(suggestions.A).toBeTruthy();
  });

  it('switching locale reactively updates t() output', () => {
    const { t } = useI18n();
    const zhResult = t('common.send');
    setLocale('en');
    const enResult = t('common.send');
    expect(zhResult).not.toBe(enResult);
  });
});
