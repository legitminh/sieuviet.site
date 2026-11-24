<script lang="ts">
  // The on-screen keyboard of the testing ground. Rows, key titles, Shift (hold for
  // capitals, tap for the next keyboard, double tap for caps lock) and the held
  // 123/#+= pages all come from the shared core, as on the iOS keyboard. This view
  // only draws them and reports touches.
  import { TouchAction } from './core/bridge';
  import { core } from './core/core.svelte';
  import { keyboards } from './keyboards.svelte';
  import { t } from './copy.svelte';
  import MobileSpaceKey from './MobileSpaceKey.svelte';
  import MobileDeleteKey from './MobileDeleteKey.svelte';

  let { send, pressed = new Set<string>() }: {
    /** Sends a touch to the core through the textbox. */
    send: (action: TouchAction, argument?: number, text?: string) => void;
    /** Physical keys held down, by position, to light their on-screen keys. */
    pressed?: Set<string>;
  } = $props();

  let view = $derived(core.state);
  let grid = $derived(view?.input === 'grid4x8' && !view.ascii && view.page === 0);
  let touching = $state<string | null>(null);
  let rows = $derived(!view ? [] : view.page !== 0
    ? (view.symbols[view.page - 1] ?? []).map((row) => [...row].map((character) => ({ position: character, code: -1, title: character as string | null })))
    : view.rows);
  const seconds = () => performance.now() / 1000;

  function keyDown(event: PointerEvent, position: string) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    touching = position;
  }
  function keyUp(position: string, symbol: boolean) {
    if (touching !== position) return;
    touching = null;
    if (symbol) send(TouchAction.literal, 0, position);
    else send(TouchAction.key, 0, position);
  }
  function shift(action: TouchAction) { send(action, 0, ''); }
  function page(action: TouchAction, which: 1 | 2) { send(action, which); }
</script>

{#if view}
  <section class="touch-keyboard" aria-label={t('keyboardsHeading')} data-layout={grid ? 'grid4x8' : view.language === 'vi' ? 'ascii+' : view.language}>
    {#each rows as row, rowIndex}
      <div class="row">
        {#each row as key}
          {#if key.code === 56}
            <button type="button" class="key shift" class:pressed={view.uppercase} aria-pressed={view.capsLock}
              aria-label={`${t('nextKeyboard')}: ${keyboards.displayName(keyboards.active)}`}
              onpointerdown={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); shift(TouchAction.shiftDown); }}
              onpointerup={() => shift(TouchAction.shiftUp)} onpointercancel={() => shift(TouchAction.shiftCancel)}>
              <span>{view.capsLock ? '⇪' : '⇧'}</span>
            </button>
          {:else}
            <button type="button" class="key" class:pressed={touching === key.position || pressed.has(key.position)}
              disabled={key.title === null} aria-label={key.title ? `${key.position}: ${key.title}` : key.position}
              onpointerdown={(event) => keyDown(event, key.position)} onpointerup={() => keyUp(key.position, view.page !== 0)}
              onpointercancel={() => { touching = null; }}>
              <span class:small={(key.title?.length ?? 0) > 3}>{key.title === 'Clear' ? t('clear') : key.title ?? ''}</span>
            </button>
          {/if}
        {/each}
        {#if !grid && rowIndex === rows.length - 1}
          <MobileDeleteKey ondelete={() => send(TouchAction.backspace)} pressed={pressed.has('Backspace')} label={t('backspace')} />
          <button type="button" class="key" class:pressed={pressed.has('Enter')} aria-label={t('return')}
            onpointerdown={(event) => event.preventDefault()} onclick={() => send(TouchAction.newline)}><span>↵</span></button>
        {/if}
      </div>
    {/each}
    <div class="row">
      <button type="button" class="key page" class:pressed={view.page === 1} aria-label={t('numbersSymbols')}
        onpointerdown={(event) => { event.preventDefault(); page(TouchAction.pageDown, 1); }} onpointerup={() => page(TouchAction.pageUp, 1)}>123</button>
      <button type="button" class="key page" class:pressed={view.page === 2} aria-label={t('moreSymbols')}
        onpointerdown={(event) => { event.preventDefault(); page(TouchAction.pageDown, 2); }} onpointerup={() => page(TouchAction.pageUp, 2)}>#+=</button>
      <MobileSpaceKey onpress={() => send(TouchAction.space)} ondragstart={() => send(TouchAction.cursorStart)}
        onmove={(steps) => send(TouchAction.cursorMove, steps)} onlines={(lines) => send(TouchAction.cursorLines, lines)}
        ondragend={() => send(TouchAction.cursorEnd)} pressed={pressed.has('Space')} label={t('space')} />
      {#if grid}
        <MobileDeleteKey ondelete={() => send(TouchAction.backspace)} pressed={pressed.has('Backspace')} label={t('backspace')} />
        <button type="button" class="key" class:pressed={pressed.has('Enter')} aria-label={t('return')}
          onpointerdown={(event) => event.preventDefault()} onclick={() => send(TouchAction.newline)}><span>↵</span></button>
      {:else}
        <button type="button" class="key" class:pressed={pressed.has(',')} aria-label={t('comma')}
          onpointerdown={(event) => event.preventDefault()} onclick={() => send(TouchAction.literal, 0, ',')}><span>,</span></button>
        <button type="button" class="key" class:pressed={pressed.has('.')} aria-label={t('period')}
          onpointerdown={(event) => event.preventDefault()} onclick={() => send(TouchAction.literal, 0, '.')}><span>.</span></button>
      {/if}
    </div>
  </section>
{/if}

<style>
  .touch-keyboard {
    display: flex; flex-direction: column; gap: 5px; padding: 5px; box-sizing: border-box; width: 100%;
    background: var(--background); font: 400 19px/1.1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --keyboard-key-height: 42px;
  }
  .row { display: flex; gap: 5px; min-height: 42px; }
  .key {
    flex: 1 1 0; min-width: 0; min-height: var(--keyboard-key-height); padding: .15rem; touch-action: none;
    border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent); border-radius: 4px;
    color: inherit; background: var(--background); font: inherit; cursor: pointer; user-select: none; -webkit-user-select: none;
  }
  .key:disabled { opacity: .3; cursor: default; }
  .key span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .key span.small { font-size: 11px; }
  .key.pressed, .key:not(:disabled):active { background: var(--primary); color: var(--background); }
  .shift, .page { flex: 1.4 1 0; font-size: 13px; }
  .shift { flex-grow: 2; }
  @media (min-width: 601px) { .touch-keyboard { --keyboard-key-height: 36px; } .row { min-height: 36px; } }
  @media (max-width: 430px) { .touch-keyboard { font-size: 16px; gap: 4px; } .row { gap: 4px; } }
</style>
