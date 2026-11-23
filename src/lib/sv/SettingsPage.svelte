<script lang="ts">
  // App settings: color theme, keypath display and box size. The interface language
  // is picked from the title dropdown in the nav.
  // The theme, keypath and box-size controls are Keyflow's required implementer settings.
  import { Button, LineText, NumberBox, keypath_visibility, min_box, set_theme_id, state_theme, themes,
    type ThemeId } from '@legitminh/keyflow';
  import { t } from './copy.svelte';

  const defaultBox = 48;
  const boxRange = [32, 96] as const;
  let box = $state(min_box.value);
  $effect(() => { box = min_box.value; });
  const setBox = (value: number) => min_box.set(Math.min(boxRange[1], Math.max(boxRange[0], Math.round(value))));
  const themeName = (id: ThemeId) => id === 'system' ? t('themeSystem')
    : themes[id].colorScheme === 'dark' ? t('themeDark') : themes[id].colorScheme === 'light' ? t('themeLight') : themes[id].name;
  let themeIds = $derived<ThemeId[]>([...themes.map((_, index) => index), 'system']);
</script>

<section class="settings">
  <LineText><h1>{t('settings')}</h1></LineText>

  <div class="field" role="group" aria-label={t('theme')}>
    <span class="label">{t('theme')}</span>
    {#each themeIds as id}
      <Button on_close={() => set_theme_id(id)}><span class:chosen={state_theme.theme_id === id}>{themeName(id)}</span></Button>
    {/each}
  </div>

  <div class="field" role="group" aria-label={t('keypaths')}>
    <span class="label">{t('keypaths')}</span>
    <Button on_close={() => keypath_visibility.set(true)}><span class:chosen={keypath_visibility.visible}>{t('keypathsShown')}</span></Button>
    <Button on_close={() => keypath_visibility.set(false)}><span class:chosen={!keypath_visibility.visible}>{t('keypathsHidden')}</span></Button>
  </div>
  <LineText><p class="muted">{t('keypathsHelp')}</p></LineText>

  <div class="field" role="group" aria-label={t('boxSize')}>
    <span class="label">{t('boxSize')}</span>
    <Button on_close={() => setBox(min_box.value - 4)}>−</Button>
    <NumberBox bind:value={box} min={boxRange[0]} max={boxRange[1]} step={1} label={t('boxSize')} format={(value) => `${value} px`}
      onchange={setBox} />
    <Button on_close={() => setBox(min_box.value + 4)}>+</Button>
    <Button on_close={() => setBox(defaultBox)}>{t('reset')}</Button>
  </div>
  <LineText><p class="muted">{t('boxSizeHelp', { size: String(defaultBox) })}</p></LineText>
</section>

<style>
  .settings { width: min(100%, 46rem); margin: 0 auto; padding: 0 calc(var(--min-box) / 2) calc(var(--min-box) * 2); box-sizing: border-box; }
  .field { display: flex; flex-wrap: wrap; align-items: center; gap: 0 .5rem; min-height: var(--min-box); }
  .label { min-width: 14ch; font-size: .8em; opacity: .65; }
  .muted { opacity: .65; font-size: .9em; }
  .chosen { font-weight: 700; text-decoration: underline; text-underline-offset: .2em; }
</style>
