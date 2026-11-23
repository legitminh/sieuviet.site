import content from './content.json';

export type Language = 'vi' | 'en';
type Key = keyof typeof content;

/** Interface language, shared by every page. Vietnamese is the default, as in the native apps. */
export const ui = $state<{ language: Language }>({ language: 'vi' });

/** The shared Vietnamese/English catalog from vietmoi Design/content.json. */
export function t(key: Key, values: Record<string, string> = {}) {
  const entry = content[key] as Record<Language, string>;
  return entry[ui.language].replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? `{${name}}`);
}
