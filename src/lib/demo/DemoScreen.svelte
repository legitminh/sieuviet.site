<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    InputFrame, KeyboardDisplay, KeyboardKeyDisplay, set_input_frame_handler,
    type InputFrameController, type KeyboardKey, type KeyboardLayout,
    type KeyInput, type VirtualKeyInput
  } from '@legitminh/keyflow';
  import { choose, complete, labelsFor, phaseOf, preview, type Composition, type InputMode, type OutputMode } from '$lib/engine';
  import { predict } from '$lib/prediction';
  import {
    cancelMarkedText, commitMarkedText, createTextSession, deleteBackward, finishMarkedText,
    insertText, moveCursor, setSelection, updateMarkedText, type TextSession
  } from './text-session';
  import MobileDeleteKey from './MobileDeleteKey.svelte';
  import MobileSpaceKey from './MobileSpaceKey.svelte';

  let { onback }: { onback: () => void } = $props();

  const letterRows = [['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l',';'], ['shift','z','x','c','v','b','n','m']];
  const symbolRows = {
    numbers: ['1234567890', '-/:;()$&@"', ".,?!'[]_"],
    symbols: ['[]{}#%^*+=', '\\|~<>`_"\':', '!?@&$()-']
  } as const;

  let frame = $state<InputFrameController>();
  let editor = $state<HTMLTextAreaElement>();
  let candidateBar = $state<HTMLDivElement>();
  let session = $state<TextSession>(createTextSession());
  let composition = $state<Composition>({});
  let inputMode = $state<InputMode>('sieuviet');
  let outputMode = $state<OutputMode>('quocNgu');
  let ascii = $state(false);
  let suggestionsEnabled = $state(true);
  let symbolPage = $state<'letters' | 'numbers' | 'symbols'>('letters');
  let settingsOpen = $state(false);
  let pressed = $state(new Set<string>());
  let candidateLimit = $state(16);

  let phase = $derived(phaseOf(composition));
  let labels = $derived(labelsFor(inputMode, phase));
  let beforeCursor = $derived(session.text.slice(0, session.selectionStart));
  let prefix = $derived(beforeCursor.match(/[\p{L}]+$/u)?.[0] ?? '');
  let suggestions = $derived(suggestionsEnabled && !ascii ? predict(beforeCursor, prefix, 16) : []);
  let keyboard = $derived.by<KeyboardLayout>(() => buildLayout());

  onMount(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    let resizeObserver: ResizeObserver | undefined;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    void focusEditor();
    void tick().then(() => {
      if (!candidateBar) return;
      resizeObserver = new ResizeObserver(() => { void fitCandidates(); });
      resizeObserver.observe(candidateBar);
    });
    return () => {
      resizeObserver?.disconnect();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  });

  $effect(() => {
    if (!frame) return;
    return set_input_frame_handler(frame, routeInput);
  });

  $effect(() => {
    suggestions;
    void fitCandidates();
  });

  async function fitCandidates() {
    candidateLimit = 16;
    await tick();
    if (!candidateBar) return;
    const rightEdge = candidateBar.clientWidth - 5;
    let count = 0;
    for (const button of candidateBar.querySelectorAll('button')) {
      if (button.offsetLeft + button.offsetWidth > rightEdge) break;
      count++;
    }
    candidateLimit = Math.max(1, count);
  }

  function keyName(value: string) {
    return value === ' ' ? 'space' : value.toLocaleLowerCase();
  }

  function setPressed(key: string, down: boolean) {
    const next = new Set(pressed);
    if (down) next.add(keyName(key)); else next.delete(keyName(key));
    pressed = next;
  }

  async function focusEditor() {
    await tick();
    if (!editor) return;
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(session.selectionStart, session.selectionEnd);
    const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || 32;
    const caretLine = session.text.slice(0, session.selectionEnd).split('\n').length;
    editor.scrollTop = Math.max(0, caretLine * lineHeight - editor.clientHeight + lineHeight * 2);
  }

  function updateSession(next: TextSession) {
    session = next;
    void focusEditor();
  }

  function finishComposition() {
    if (composition.initial !== undefined) session = finishMarkedText(session);
    composition = {};
  }

  function captureSelection() {
    if (!editor) return;
    const moved = editor.selectionStart !== session.selectionStart || editor.selectionEnd !== session.selectionEnd;
    if (!moved) return;
    const hadMark = Boolean(session.mark);
    session = setSelection(session, editor.selectionStart, editor.selectionEnd);
    if (hadMark) composition = {};
  }

  function insert(value: string) {
    finishComposition();
    updateSession(insertText(session, value));
  }

  function pressPhonetic(key: string) {
    if (phase === 'tone') {
      const word = complete(composition, inputMode, outputMode, key);
      if (!word) return false;
      updateSession(commitMarkedText(session, `${word} `));
      composition = {};
      return true;
    }
    const next = choose(composition, inputMode, key);
    if (!next) return false;
    composition = next;
    updateSession(updateMarkedText(session, preview(next, inputMode)));
    return true;
  }

  function backspace() {
    if (composition.final !== undefined) {
      composition = { initial: composition.initial, vowel: composition.vowel };
      updateSession(updateMarkedText(session, preview(composition, inputMode)));
    } else if (composition.vowel !== undefined) {
      composition = { initial: composition.initial };
      updateSession(updateMarkedText(session, preview(composition, inputMode)));
    } else if (composition.initial !== undefined) {
      composition = {};
      updateSession(cancelMarkedText(session));
    } else updateSession(deleteBackward(session));
  }

  function acceptSuggestion(suffix: string) {
    finishComposition();
    updateSession(insertText(session, `${suffix} `));
  }

  function space() {
    if (suggestions[0] && (prefix || beforeCursor.endsWith(' '))) {
      acceptSuggestion(suggestions[0]);
      return;
    }
    finishComposition();
    updateSession(insertText(session, ' '));
  }

  function startCursorMovement() {
    finishComposition();
    session = finishMarkedText(session);
  }

  function moveBy(amount: number) {
    finishComposition();
    updateSession(moveCursor(session, amount));
  }

  function toggleASCII() {
    finishComposition();
    ascii = !ascii;
    symbolPage = 'letters';
  }

  function setInputMode(mode: InputMode) {
    finishComposition();
    inputMode = mode;
  }

  function setOutputMode(mode: OutputMode) {
    finishComposition();
    outputMode = mode;
  }

  function routeInput(type: 'keydown' | 'keyup', input: KeyInput): boolean {
    const key = keyName(input.key);
    setPressed(key, type === 'keydown');
    if (type === 'keyup') return true;
    if (input.metaKey || input.ctrlKey || input.altKey) return false;
    if (settingsOpen) {
      if (key === 'escape') settingsOpen = false;
      return true;
    }
    if (key === 'escape') { onback(); return true; }
    if (key === 'arrowleft') { moveBy(-1); return true; }
    if (key === 'arrowright') { moveBy(1); return true; }
    if (key === 'backspace' || key === 'delete') { backspace(); return true; }
    if (key === 'enter') { insert('\n'); return true; }
    if (key === 'shift') { if (!input.repeat) toggleASCII(); return true; }
    if (key === 'tab') { symbolPage = symbolPage === 'numbers' ? 'letters' : 'numbers'; return true; }
    if (key === 'capslock') { symbolPage = symbolPage === 'symbols' ? 'letters' : 'symbols'; return true; }
    if (key === 'space') { space(); return true; }
    if (symbolPage !== 'letters') {
      if (input.key.length === 1) insert(input.key);
      return true;
    }
    if (!ascii && /^[1-9]$/.test(key) && suggestions[Number(key) - 1]) {
      acceptSuggestion(suggestions[Number(key) - 1]);
      return true;
    }
    if (input.key.length !== 1) return true;
    if (ascii) insert(input.key);
    else if (!pressPhonetic(key) && key === ';') insert(';');
    return true;
  }

  function handleVirtual(event: VirtualKeyInput) {
    routeInput(event.type, event);
  }

  function buildLayout(): KeyboardLayout {
    const utility = (key: string, label: string, width = 1): KeyboardKey => ({ key, label, width });
    let rows: KeyboardKey[][];
    if (symbolPage === 'letters') {
      rows = letterRows.map((row, rowIndex) => row.map((key) => {
        if (key === 'shift') return utility('shift', ascii ? 'VIỆT' : 'ABC');
        const label = ascii ? key : labels[key];
        return { key, label: label === '' ? '∅' : (label ?? key), disabled: !ascii && label === undefined };
      }));
    } else {
      rows = symbolRows[symbolPage].map((row) => [...row].map((key) => utility(key, key)));
    }
    rows[2] = [...rows[2], utility('backspace', '⌫'), utility('enter', '↵')];
    rows.push([
      utility('tab', '123', 1.1), utility('capslock', '#+=', 1.1), utility('space', '', 5.6),
      utility(',', ',', 1.1), utility('.', '.', 1.1)
    ]);
    return { id: `mobile-${symbolPage}-${ascii ? 'ascii' : `${inputMode}-${phase}`}`, label: 'siêu việt mobile keyboard', rows };
  }

  function clearText() {
    composition = {};
    updateSession(createTextSession());
  }
</script>

<InputFrame active={true} name="siêu việt demo" bind:controller={frame}>
  <main class="demo-screen">
    <section class="phone-stage" aria-label="siêu việt keyboard demo">
      <header class="demo-bar">
        <button class="bar-button back" type="button" onclick={onback} aria-label="quay lại">←</button>
        <strong>siêu việt</strong>
        <div class="bar-actions">
          <button class="bar-button clear" type="button" onclick={clearText}>xóa</button>
          <button class="bar-button" type="button" onclick={() => settingsOpen = true} aria-label="cài đặt">⚙</button>
        </div>
      </header>

      <textarea
        bind:this={editor}
        class="editor"
        value={session.text}
        readonly
        inputmode="none"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        aria-label="vùng nhập thử"
        placeholder="gõ thử…"
        onselect={captureSelection}
        onpointerup={captureSelection}
        onkeyup={captureSelection}
      ></textarea>

      <section class="keyboard-dock" aria-label="bàn phím">
        {#if suggestions.length}
          <div class="candidate-bar" bind:this={candidateBar}>
            {#each suggestions.slice(0, candidateLimit) as suggestion, index}
              <button type="button" onclick={() => acceptSuggestion(suggestion)} aria-keyshortcuts={index < 9 ? String(index + 1) : undefined}>{suggestion}</button>
            {/each}
          </div>
        {/if}
        <KeyboardDisplay layout={keyboard} onkey={handleVirtual} class="mobile-keyboard">
          {#snippet keyDisplay(key: KeyboardKey)}
            {#if key.key === 'space'}
              <MobileSpaceKey onpress={space} ondragstart={startCursorMovement} onmove={moveBy} pressed={pressed.has('space')} />
            {:else if key.key === 'backspace'}
              <MobileDeleteKey ondelete={backspace} pressed={pressed.has('backspace')} />
            {:else}
              <KeyboardKeyDisplay {...key} onkey={handleVirtual} pressed={pressed.has(keyName(key.key))}>
                <span class:small={(key.label?.length ?? 0) > 3}>{key.label}</span>
              </KeyboardKeyDisplay>
            {/if}
          {/snippet}
        </KeyboardDisplay>
      </section>

      {#if settingsOpen}
        <div class="settings-sheet" role="dialog" aria-modal="true" aria-label="cài đặt bàn phím">
          <header><button type="button" onclick={() => settingsOpen = false}>←</button><strong>cài đặt</strong><span></span></header>
          <fieldset>
            <legend>chế độ nhập</legend>
            <button class:chosen={inputMode === 'sieuviet'} onclick={() => setInputMode('sieuviet')}>siêu việt</button>
            <button class:chosen={inputMode === 'quocNgu'} onclick={() => setInputMode('quocNgu')}>quốc ngữ</button>
          </fieldset>
          <fieldset>
            <legend>chính tả đầu ra</legend>
            <button class:chosen={outputMode === 'quocNgu'} onclick={() => setOutputMode('quocNgu')}>quốc ngữ</button>
            <button class:chosen={outputMode === 'sieuviet'} onclick={() => setOutputMode('sieuviet')}>siêu việt</button>
          </fieldset>
          <label class="setting-toggle"><span>gợi ý hoàn tất</span><input type="checkbox" bind:checked={suggestionsEnabled} /></label>
        </div>
      {/if}
    </section>
  </main>
</InputFrame>

<style>
  :global(body:has(.demo-screen)) { overscroll-behavior: none; }
  .demo-screen {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: stretch center;
    height: 100dvh;
    overflow: hidden;
    background: color-mix(in srgb, var(--background) 94%, var(--primary) 6%);
    color: var(--primary);
  }
  .phone-stage {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(100%, 46rem);
    min-width: 0;
    height: 100%;
    overflow: hidden;
    background: var(--background);
    border-inline: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
  }
  .demo-bar {
    flex: 0 0 48px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: env(safe-area-inset-top, 0) 8px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
    background: var(--background);
  }
  .demo-bar strong { font-size: 14px; font-weight: 600; letter-spacing: .02em; }
  .bar-actions { display: flex; justify-content: flex-end; align-items: center; gap: 2px; }
  .bar-button, .settings-sheet button {
    min-width: 40px;
    min-height: 40px;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
  }
  .bar-button.back { justify-self: start; font-size: 22px; }
  .bar-button.clear { font-size: 12px; }
  .editor {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    resize: none;
    overflow: auto;
    box-sizing: border-box;
    padding: clamp(18px, 5vw, 32px);
    border: 0;
    border-radius: 0;
    outline: 0;
    color: var(--primary);
    background: var(--background);
    font: 400 clamp(24px, 5vw, 34px)/1.42 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    caret-color: currentColor;
  }
  .editor::placeholder { color: color-mix(in srgb, var(--primary) 38%, transparent); }
  .keyboard-dock {
    flex: 0 0 auto;
    min-width: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
    border-top: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
    background: var(--background);
  }
  .candidate-bar {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 38px;
    padding: 3px 5px;
    box-sizing: border-box;
    overflow: hidden;
    border-bottom: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
    background: var(--background);
  }
  .candidate-bar button {
    flex: 0 0 auto;
    max-width: 55%;
    height: 32px;
    overflow: hidden;
    padding: 0 13px;
    border: 1px solid color-mix(in srgb, var(--primary) 52%, transparent);
    border-radius: 4px;
    color: inherit;
    background: var(--background);
    font: 500 15px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(.mobile-keyboard) {
    --keyboard-background: var(--background);
    --keyboard-key-background: var(--background);
    --keyboard-key-height: 42px;
    --keyboard-key-radius: 4px;
    --keyboard-gap: 5px;
    --keyboard-padding: 5px;
    --keyboard-font-size: 19px;
    --keyboard-pressed-color: var(--background);
  }
  :global(.mobile-keyboard .keyboard-row) { min-height: 42px; }
  :global(.mobile-keyboard .keyflow-key) { padding: .15rem; }
  :global(.mobile-keyboard .keyflow-key span) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(.mobile-keyboard .keyflow-key span.small) { font-size: 11px; }
  .settings-sheet {
    position: absolute;
    inset: 0;
    z-index: 3;
    overflow: auto;
    padding: env(safe-area-inset-top, 0) 18px env(safe-area-inset-bottom, 18px);
    background: var(--background);
    font: 400 16px/1.25 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  .settings-sheet header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    min-height: 48px;
    border-bottom: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
  }
  .settings-sheet header button { justify-self: start; font-size: 22px; }
  .settings-sheet header strong { font-size: 17px; font-weight: 600; }
  .settings-sheet fieldset { margin: 28px 0 0; padding: 0; border: 0; }
  .settings-sheet legend { margin-bottom: 8px; font-size: 12px; opacity: .65; }
  .settings-sheet fieldset button {
    width: 100%;
    min-height: 48px;
    padding: 0 12px;
    border-top: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
    text-align: left;
    font-size: 16px;
  }
  .settings-sheet fieldset button:last-child { border-bottom: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); }
  .settings-sheet button.chosen::after { content: '✓'; float: right; }
  .setting-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 48px;
    margin-top: 28px;
    padding: 0 12px;
    border-block: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  }
  @media (min-width: 601px) {
    :global(.mobile-keyboard) { --keyboard-key-height: 36px; }
    :global(.mobile-keyboard .keyboard-row) { min-height: 36px; }
  }
  @media (max-width: 430px) {
    .phone-stage { border-inline: 0; }
    :global(.mobile-keyboard) { --keyboard-font-size: 17px; --keyboard-gap: 4px; }
  }
</style>
