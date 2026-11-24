<script lang="ts">
  import { Button } from '@legitminh/keyflow';
  import { t } from './copy.svelte';
  export type Page = 'intro' | 'keyboards' | 'try' | 'settings';
  let { page, go }: { page: Page; go: (page: Page) => void } = $props();
  const pages: Page[] = ['intro', 'keyboards', 'try'];
  const names = { intro: 'pageIntro', keyboards: 'pageKeyboards', try: 'pageTry', settings: 'pageSettings' } as const;
</script>

<nav class="sv-nav" aria-label="siêu việt">
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
  .spacer { flex: 1 1 auto; }
  .gear { font-size: 1.5em; line-height: 1; }
  .current { font-weight: 700; text-decoration: underline; text-underline-offset: .2em; }
</style>
