<script lang="ts">
  // Keyboard management, matching the Mac settings window: the list switched
  // by a Shift tap, each keyboard's language, input and output, and the tap limit.
  import { Button, LineText, NumberBox, SubKeyframe, type SubKeyframeItem } from '@legitminh/keyflow';
  import { keyboards, paradigms, defaultShiftTapSeconds, shiftTapRange, type KeyboardLanguage, type OutputType } from './keyboards.svelte';
  import { t, ui } from './copy.svelte';

  const languageName = (language: KeyboardLanguage) => t(language === 'vi' ? 'vietnamese' : language === 'en' ? 'english' : 'keyboardLanguage.chinese');
  const suggestionsHelp = (language: KeyboardLanguage) => t(language === 'vi' ? 'suggestionsHelp.vietnamese' : language === 'en' ? 'suggestionsHelp.english' : 'suggestionsHelp.chinese');
  const outputName = (output: OutputType) => output === 'literal' ? t('literalOutput') : output === 'sieuviet' ? 'siêu việt'
    : output === 'Simplified Chinese' ? t('simplifiedChinese') : output;
  /** Each keyboard's language is a dropdown of the languages this app offers. */
  const languageItems = (id: string, current: KeyboardLanguage): SubKeyframeItem[] => keyboards.languages.map((language) => ({
    id: language, label: `${current === language ? '✓ ' : ''}${languageName(language)}`,
    on_select: () => keyboards.update(id, { language })
  }));
  let seconds = $state(keyboards.state.shiftTapSeconds);
  $effect(() => { seconds = keyboards.state.shiftTapSeconds; });
</script>

<section class="keyboards" aria-labelledby="keyboards-heading">
  <LineText><h1 id="keyboards-heading">★ siêu việt</h1></LineText>
  <LineText><p class="muted">{t('tagline')}</p></LineText>
  <div class="heading-row">
    <LineText><h2>{t('keyboardsHeading')}</h2></LineText>
    <Button on_close={() => keyboards.add()}>+ {t('addKeyboard')}</Button>
  </div>
  <LineText><p class="muted">{t('keyboardsHelp')}</p></LineText>

  <ol class="list">
    {#each keyboards.state.profiles as profile (profile.id)}
      {@const name = keyboards.displayName(profile)}
      {@const active = profile.id === keyboards.state.activeID}
      <li class="card" class:active aria-current={active ? 'true' : undefined}>
        <div class="card-head">
          <strong>{name}</strong>
          <span class="actions">
            {#if active}<span class="selected">✓ {t('selected')}</span>
            {:else}<Button on_close={() => keyboards.select(profile.id)}>{t('select')}</Button>{/if}
            {#if keyboards.state.profiles.length > 1}
              <Button on_close={() => keyboards.remove(profile.id)}>− {t('removeKeyboard')}</Button>
            {/if}
          </span>
        </div>
        <div class="field" role="group" aria-label={t('languageProfile', { name })}>
          <span class="label">{t('keyboardLanguage')}</span>
          <SubKeyframe label={t('languageProfile', { name })} items={languageItems(profile.id, profile.language)}
            backLabel={t('back')} class="language-menu">
            {#snippet triggerContent()}<span class="chosen">{languageName(profile.language)}</span> ▾{/snippet}
          </SubKeyframe>
        </div>
        {#if paradigms[profile.language].inputs.length > 1}
          <div class="field" role="group" aria-label={t('inputProfile', { name })}>
            <span class="label">{t('inputLabel')}</span>
            {#each paradigms[profile.language].inputs as inputType}
              <Button on_close={() => keyboards.update(profile.id, { inputType })}>
                <span class:chosen={profile.inputType === inputType}>{inputType}</span>
              </Button>
            {/each}
          </div>
        {/if}
        {#if paradigms[profile.language].outputs.length > 1}
          <div class="field" role="group" aria-label={t('outputProfile', { name })}>
            <span class="label">{t('outputLabel')}</span>
            {#each paradigms[profile.language].outputs as outputType}
              <Button on_close={() => keyboards.update(profile.id, { outputType })}>
                <span class:chosen={profile.outputType === outputType}>{outputName(outputType)}</span>
              </Button>
            {/each}
          </div>
        {/if}
        <div class="field" role="group" aria-label={t('showProfile', { name })}>
          <span class="label">{t('showKeyboard')}</span>
          <Button on_close={() => keyboards.update(profile.id, { showVirtualKeyboard: !profile.showVirtualKeyboard })}>
            <span class:chosen={profile.showVirtualKeyboard}>{profile.showVirtualKeyboard ? '✓' : '○'} {t('showKeyboard')}</span>
          </Button>
        </div>
        <div class="field" role="group" aria-label={t('suggestions') + ': ' + name}>
          <span class="label">{t('suggestions')}</span>
          <Button on_close={() => keyboards.update(profile.id, { suggestionsEnabled: !profile.suggestionsEnabled })}>
            <span class:chosen={profile.suggestionsEnabled}>{profile.suggestionsEnabled ? t('suggestionsOn') : t('suggestionsOff')}</span>
          </Button>
        </div>
        <LineText><p class="muted">{suggestionsHelp(profile.language)}</p></LineText>
      </li>
    {/each}
  </ol>

  <LineText><p class="muted">{t('roundHelp')}</p></LineText>
  <div class="field" role="group" aria-label={t('shiftLimit')}>
    <span class="label">{t('shiftLimit')}</span>
    <NumberBox bind:value={seconds} min={shiftTapRange[0]} max={shiftTapRange[1]} step={0.01} label={t('shiftLimit')}
      onchange={(value) => keyboards.setShiftTapSeconds(value)} />
    <span>{t('seconds')}</span>
    <Button on_close={() => keyboards.setShiftTapSeconds(defaultShiftTapSeconds)}>{t('reset')}</Button>
  </div>
  <LineText><p class="muted">{t('shiftLimitHelp')}</p></LineText>
</section>

<style>
  /* Drop the language menu over the card instead of pushing the fields apart. */
  .keyboards :global(.language-menu .subkeyframe-panel) { position: absolute; top: 100%; left: 0; z-index: 20; min-width: 16rem; white-space: nowrap; }
  .keyboards { width: min(100%, 46rem); margin: 0 auto; padding: 0 calc(var(--min-box) / 2) calc(var(--min-box) * 2); box-sizing: border-box; }
  h1 { margin-bottom: 0; }
  .muted { opacity: .65; font-size: .9em; }
  .heading-row, .card-head, .field { display: flex; flex-wrap: wrap; align-items: center; gap: 0 .5rem; min-height: var(--min-box); }
  .heading-row { justify-content: space-between; }
  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .75rem; }
  .card { border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); border-radius: 4px; padding: 0 .75rem .25rem; }
  .card.active { border-color: var(--primary); }
  .card-head { justify-content: space-between; }
  .actions { display: inline-flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
  .label { min-width: 11ch; font-size: .8em; opacity: .65; }
  .chosen { font-weight: 700; text-decoration: underline; text-underline-offset: .2em; }
  .selected { font-size: .9em; }
</style>
