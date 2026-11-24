<script lang="ts">
  import { Button, SubKeyframe, type SubKeyframeItem } from '@legitminh/keyflow';
  import { keyboards } from './keyboards.svelte';
  import { t, ui, languages, languageNames } from './copy.svelte';
  export type Page = 'intro' | 'keyboards' | 'try' | 'settings';
  let { page, go }: { page: Page; go: (page: Page) => void } = $props();
  const pages: Page[] = ['intro', 'keyboards', 'try'];
  // The title is the interface-language picker.
  let languageItems = $derived<SubKeyframeItem[]>(languages.map((language) => ({
    id: language, label: `${ui.language === language ? '✓ ' : ''}${languageNames[language]}`,
    on_select: () => keyboards.setInterfaceLanguage(language)
  })));
  const names = { intro: 'pageIntro', keyboards: 'pageKeyboards', try: 'pageTry', settings: 'pageSettings' } as const;
</script>

<nav class="sv-nav" aria-label="siêu việt">
  <SubKeyframe label={t('language')} items={languageItems} backLabel={t('back')} presentation="overlay" class="brand">
    {#snippet triggerContent()}<strong>★ siêu việt</strong> <span class="current-language">{languageNames[ui.language]} ▾</span>{/snippet}
  </SubKeyframe>
  {#each pages as item, index}
    <Button priority={index} on_close={() => go(item)}>
      <span class:current={page === item} aria-current={page === item ? 'page' : undefined}>{t(names[item])}</span>
    </Button>
  {/each}
  <span class="spacer"></span>
  <Button priority={3} on_close={() => go('settings')}>
    <span class="gear" class:current={page === 'settings'} aria-current={page === 'settings' ? 'page' : undefined}
      role="img" aria-label={t('settings')} title={t('settings')}>⚙</span>
  </Button>
</nav>

<style>
  .sv-nav { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 0 .5rem;
    min-height: var(--min-box); padding: env(safe-area-inset-top, 0) calc(var(--min-box) / 4) 0; background: var(--background);
    border-bottom: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); font-size: 15px; line-height: 1.2; }
  .sv-nav :global(*) { font-size: inherit; }
  .sv-nav :global(.brand) { letter-spacing: .04em; margin-right: .25rem; }
  .current-language { opacity: .65; font-size: .85em; }
  .spacer { flex: 1 1 auto; }
  .gear { font-size: 1.5em; line-height: 1; }
  .current { font-weight: 700; text-decoration: underline; text-underline-offset: .2em; }
</style>
