<script lang="ts">
  // Testing ground: a full text editor in its own Keyflow editing frame, typed
  // with the configured keyboards through the same input method as the apps.
  import { onMount, tick } from 'svelte';
  import { TextBox, type TextBoxController } from '@legitminh/keyflow';
  import { SieuvietInputMethod } from './input-method';
  import { keyboards } from './keyboards.svelte';
  import { t } from './copy.svelte';
  import TouchKeyboard from './TouchKeyboard.svelte';
  import { predict } from './prediction';

  let { nav }: { nav: import('svelte').Snippet } = $props();
  let text = $state('');
  let editor = $state<TextBoxController>();
  let keyboard = $state<TouchKeyboard>();
  let revision = $state(0);
  let pressed = $state(new Set<string>());
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  const method = new SieuvietInputMethod(
    () => keyboards.active,
    () => keyboards.next(),
    () => keyboards.state.shiftTapSeconds,
    () => keyboard?.isCapsLock() ?? false
  );
  method.onchange = () => { revision = method.revision; };
  // Suggestions are computed in idle time after the text changes, never on the
  // key path, so typing speed does not depend on them. Space types a space; only
  // Tab or a tap accepts a suggestion.
  // Each keyboard keeps its own suggestions setting, shared with the native keyboards.
  let suggestionsOn = $derived(keyboards.active.suggestionsEnabled && keyboards.active.language !== 'zh');
  let suggestions = $state<string[]>([]);
  const wordAtEnd = (value: string) => value.match(/\p{L}+$/u)?.[0] ?? '';
  $effect(() => {
    const value = text, enabled = suggestionsOn;
    if (!enabled) { suggestions = []; return; }
    const run = () => { suggestions = predict(value, wordAtEnd(value), 8); };
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(run, { timeout: 400 });
      return () => cancelIdleCallback(handle);
    }
    const handle = setTimeout(run, 60);
    return () => clearTimeout(handle);
  });
  function toggleSuggestions() {
    keyboards.update(keyboards.active.id, { suggestionsEnabled: !keyboards.active.suggestionsEnabled });
  }
  /** Complete the word at the caret with `suffix`, then a space. */
  function acceptInto(composition: import('@legitminh/keyflow').TextComposition, suffix: string) {
    const target = wordAtEnd(composition.value.slice(0, composition.selectionStart)) + suffix;
    method.finish(composition);
    const current = wordAtEnd(composition.value.slice(0, composition.selectionStart));
    if (target.toLocaleLowerCase('vi').startsWith(current.toLocaleLowerCase('vi'))) composition.insert(target.slice(current.length) + ' ');
    else { for (const _ of new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(current)) composition.deleteBackward(); composition.insert(target + ' '); }
    suggestions = [];
  }
  function accept(suffix: string) { editor?.edit((composition) => acceptInto(composition, suffix)); }
  method.onaccept = (composition) => {
    if (!suggestionsOn || !suggestions.length) return false;
    acceptInto(composition, suggestions[0]);
    return true;
  };
  // Touch screens always need the on-screen keyboard; computers follow the keyboard's guide setting.
  let showKeyboard = $derived(touch || keyboards.active.showVirtualKeyboard);

  onMount(() => {
    const press = (down: boolean) => (event: KeyboardEvent) => {
      const next = new Set(pressed);
      const key = event.key === ' ' ? ' ' : event.key.toLowerCase();
      if (down) next.add(key); else next.delete(key);
      pressed = next;
    };
    const down = press(true), up = press(false), clear = () => { pressed = new Set(); };
    addEventListener('keydown', down, true);
    addEventListener('keyup', up, true);
    addEventListener('blur', clear);
    void tick().then(() => editor?.enter());
    return () => { removeEventListener('keydown', down, true); removeEventListener('keyup', up, true); removeEventListener('blur', clear); };
  });
</script>

<div class="try-page">
  {@render nav()}
  <p class="status" aria-live="polite">{t('typingWith', { name: keyboards.displayName(keyboards.active) })} · {t('tryHelp')}</p>
  <div class="suggestions" aria-label={t('suggestions')} data-keyflow-textbox-keep-open>
    <button type="button" class="toggle" onpointerdown={(event) => event.preventDefault()} onclick={toggleSuggestions}>
      {suggestionsOn ? t('suggestionsOn') : t('suggestionsOff')}</button>
    {#if suggestionsOn}
      {#each suggestions as suggestion, index (suggestion)}
        <button type="button" class:first={index === 0} title={index === 0 ? t('acceptSuggestionHelp') : undefined}
          onpointerdown={(event) => event.preventDefault()} onclick={() => accept(suggestion)}>{wordAtEnd(text) + suggestion}</button>
      {/each}
    {/if}
  </div>
  <TextBox bind:this={editor} bind:value={text} inputMethod={method} label={t('tryTyping')} placeholder={t('tryTyping')}
    enterTrigger="t" rows={6} class="try-editor" spellcheck={false} autocomplete="off" autocapitalize="off"
    inputmode={touch ? 'none' : undefined} />
  {#if showKeyboard}
    <div class="dock" data-keyflow-textbox-keep-open><TouchKeyboard bind:this={keyboard} {method} {revision} {pressed} /></div>
  {/if}
</div>

<style>
  .try-page { position: fixed; inset: 0; z-index: 10; display: flex; flex-direction: column; height: 100dvh; overflow: hidden;
    background: var(--background); color: var(--primary); }
  .status { margin: 0; padding: .4rem calc(var(--min-box) / 4); font-size: 12px; line-height: 1.4; opacity: .7; }
  .try-page :global(.editor-status) { font-size: 12px; line-height: 1.4; opacity: .6; margin: .2rem 0; }
  .try-page :global(.try-editor) { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; margin: 0;
    padding: 0 calc(var(--min-box) / 4); }
  .try-page :global(.try-editor > section) { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
  .try-page :global(.try-editor textarea) { flex: 1 1 auto; min-height: 4rem; resize: none;
    font: 400 clamp(22px, 4vw, 32px)/1.42 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .try-page :global(.try-editor .text-entry) { flex: 1 1 auto; font: 400 clamp(22px, 4vw, 32px)/1.42 ui-monospace, monospace; }
  .suggestions { display: flex; gap: .35rem; overflow-x: auto; scrollbar-width: none; padding: .25rem calc(var(--min-box) / 4);
    font-size: 14px; min-height: 2.2rem; align-items: center; }
  .suggestions button { flex: 0 0 auto; font: inherit; color: inherit; background: transparent; cursor: pointer; white-space: nowrap;
    border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: 999px; padding: .2rem .65rem; }
  .suggestions button.first { border-color: var(--primary); }
  .suggestions button.toggle { opacity: .7; }
  .dock { flex: 0 0 auto; border-top: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
    padding-bottom: env(safe-area-inset-bottom, 0); }
  .dock :global(.touch-keyboard) { max-width: 46rem; margin: 0 auto; }
</style>
