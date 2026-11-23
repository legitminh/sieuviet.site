<script lang="ts">
  // Testing ground: a full text editor in its own Keyflow editing frame, typed
  // with the configured keyboards through the same input method as the apps.
  import { onMount, tick } from 'svelte';
  import { TextBox, type TextBoxController } from '@legitminh/keyflow';
  import { SieuvietInputMethod } from './input-method';
  import { keyboards } from './keyboards.svelte';
  import { t } from './copy.svelte';
  import TouchKeyboard from './TouchKeyboard.svelte';

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
  <TextBox bind:this={editor} bind:value={text} inputMethod={method} label={t('tryTyping')} placeholder={t('tryTyping')}
    enterTrigger="t" rows={6} class="try-editor" spellcheck={false} autocomplete="off" autocapitalize="off"
    inputmode={touch ? 'none' : undefined} />
  {#if showKeyboard}
    <div class="dock"><TouchKeyboard bind:this={keyboard} {method} {revision} {pressed} /></div>
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
  .dock { flex: 0 0 auto; border-top: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
    padding-bottom: env(safe-area-inset-bottom, 0); }
  .dock :global(.touch-keyboard) { max-width: 46rem; margin: 0 auto; }
</style>
