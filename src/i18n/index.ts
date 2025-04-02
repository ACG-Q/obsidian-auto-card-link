// 导入翻译文件
import en from './locals/en.json';
import zh from './locals/zh.json';

// 支持的语言列表和类型
const supportedLanguages = ['en', 'zh'] as const;
export type Locale = typeof supportedLanguages[number];
export const DEFAULT_LOCALE: Locale = 'en';

// 存储键和语言包集合
const LOCALE_STORAGE_KEY = 'obsidian-auto-card-link-locale';
const locales: Record<Locale, Record<string, any>> = { en, zh };

// 初始化语言设置
let currentLocale: Locale = DEFAULT_LOCALE;
try {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale;
  currentLocale = supportedLanguages.includes(stored) ? stored : DEFAULT_LOCALE;
} catch (e) { 
  console.error('加载语言失败:', e); 
}

// 获取当前语言
export const getCurrentLocale = (): Locale => currentLocale;

/**
 * 翻译指定的键值
 * @param key 翻译键，支持点号分隔的嵌套键
 * @param locale 使用的语言，默认为当前语言
 * @param params 替换参数，用于替换翻译中的{key}占位符
 */
export function t(key: string, locale: Locale = currentLocale, params?: Record<string, string>): string {
  // 获取翻译对象，如果指定语言不存在则使用默认语言
  const translations = locales[locale] || locales[DEFAULT_LOCALE];
  
  // 使用点号分隔符查找嵌套键值
  const value = key.split('.').reduce<any>(
    (obj, k) => (obj && typeof obj === 'object' ? obj[k] : undefined), 
    translations
  );
  
  // 如果找到字符串值，处理参数替换；否则返回原键
  return typeof value === 'string'
    ? (params ? value.replace(/{(\w+)}/g, (_, k) => params[k] ?? '') : value)
    : key;
}

/**
 * 设置当前语言
 */
export function setLocale(locale: Locale): void {
  // 验证语言有效性
  if (!supportedLanguages.includes(locale)) {
    console.warn(`不支持的语言: ${locale}`);
    locale = DEFAULT_LOCALE;
  }

  // 更新当前语言并保存
  currentLocale = locale;
  try { 
    localStorage.setItem(LOCALE_STORAGE_KEY, locale); 
  } catch (e) { 
    console.error('保存语言设置失败:', e); 
  }
  
  // 触发语言变更事件
  document.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
}

/**
 * 获取Obsidian系统语言
 */
export const getObsidianLanguage = (): Locale => {
  try {
    const lang = window.localStorage.getItem('language') as Locale;
    return supportedLanguages.includes(lang) ? lang : DEFAULT_LOCALE;
  } catch (e) { 
    console.error('获取系统语言失败:', e);
    return DEFAULT_LOCALE;
  }
};

/**
 * 监听语言变更事件
 * @param callback 语言变更时的回调函数
 * @returns 取消监听的函数
 */
export const onLocaleChanged = (callback: (locale: Locale) => void): (() => void) => {
  const handler = (e: CustomEvent) => callback(e.detail.locale);
  document.addEventListener('locale-changed', handler as EventListener);
  return () => document.removeEventListener('locale-changed', handler as EventListener);
};