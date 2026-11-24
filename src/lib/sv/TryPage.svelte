<script lang="ts">
  // Testing ground: a full text editor in its own Keyflow editing frame, typed with
  // the configured keyboards. Every key and touch goes through the shared Swift core
  // (WebAssembly), the same session the native keyboards run.
  import { onMount, tick, untrack } from 'svelte';
  import { TextBox, type TextBoxController } from '@legitminh/keyflow';
  import { CoreInputMethod, keyPosition } from './input-method';
  import { TouchAction } from './core/bridge';
  import { core } from './core/core.svelte';
  import { keyboards } from './keyboards.svelte';
  import { t } from './copy.svelte';
  import TouchKeyboard from './TouchKeyboard.svelte';

  let { nav }: { nav: import('svelte').Snippet } = $props();
  let text = $state('');
  let editor = $state<TextBoxController>();
  let pressed = $state(new Set<string>());
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  // A Shift tap moves the core to another keyboard; the list follows it.
  const method = new CoreInputMethod((id) => { if (id !== keyboards.state.activeID) keyboards.select(id); });
  const send = (action: TouchAction, argument = 0, value = '') =>
    editor?.edit((composition) => method.touch(composition, action, argument, value));

  // The keyboard list, the active keyboard and the Shift tap time go to the core on every change.
  $effect(() => {
    const snapshot = $state.snapshot(keyboards.state);
    if (core.ready) untrack(() => core.configure(snapshot));
  });
  let view = $derived(core.state);
  let suggestions = $derived(view?.suggestionsEnabled ? view.suggestions : []);
  let loadingDictionary = $derived(view?.language === 'zh' && !view.chineseDictionary);
  const wordAtEnd = (value: string) => value.match(/\p{L}+$/u)?.[0] ?? '';
  function toggleSuggestions() {
    keyboards.update(keyboards.active.id, { suggestionsEnabled: !keyboards.active.suggestionsEnabled });
  }
  // Touch screens always need the on-screen keyboard; computers follow the keyboard's guide setting.
  let showKeyboard = $derived(touch || keyboards.active.showVirtualKeyboard);

  onMount(() => {
    void core.load();
    const press = (down: boolean) => (event: KeyboardEvent) => {
      const next = new Set(pressed);
      const position = keyPosition(event.code, event.key);
      if (down) next.add(position); else next.delete(position);
      pressed = next;
    };
    const down = press(true), up = press(false);
    const clear = () => { pressed = new Set(); core.instance?.touch(TouchAction.cancelHolds); };
    addEventListener('keydown', down, true);
    addEventListener('keyup', up, true);
    addEventListener('blur', clear);
    void tick().then(() => editor?.enter());
    return () => { removeEventListener('keydown', down, true); removeEventListener('keyup', up, true); removeEventListener('blur', clear); };
  });
</script>

<div class="try-page">
  {@render nav()}
  <p class="status" aria-live="polite">{t('typingWith', { name: keyboards.displayName(keyboards.active) })} · {t('tryHelp')}
    {#if core.failed} · {t('coreFailed')}{:else if loadingDictionary} · {t('loadingDictionary')}{/if}</p>
  <div class="suggestions" aria-label={t('suggestions')} data-keyflow-textbox-keep-open>
    <button type="button" class="toggle" onpointerdown={(event) => event.preventDefault()} onclick={toggleSuggestions}>
      {keyboards.active.suggestionsEnabled ? t('suggestionsOn') : t('suggestionsOff')}</button>
    {#each suggestions as suggestion, index (index + suggestion)}
      <button type="button" class:first={index === 0} title={index === 0 && view?.language !== 'zh' ? t('acceptSuggestionHelp') : undefined}
        onpointerdown={(event) => event.preventDefault()} onclick={() => send(TouchAction.suggestion, index)}>
        {view?.language === 'zh' ? `${index % 9 + 1} ${suggestion}` : wordAtEnd(text) + suggestion}</button>
    {/each}
  </div>
  <TextBox bind:this={editor} bind:value={text} inputMethod={method} label={t('tryTyping')} placeholder={t('tryTyping')}
    enterTrigger="t" rows={6} class="try-editor" spellcheck={false} autocomplete="off" autocapitalize="off"
    inputmode={touch ? 'none' : undefined} />
  {#if showKeyboard}
    <div class="dock" data-keyflow-textbox-keep-open><TouchKeyboard {send} {pressed} /></div>
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
