<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ButtonPositional, Document, KeyboardDisplay, LineText, Link, StaticButton, SubKeyframe,
    ThemeToggle, type KeyboardLayout, type VirtualKeyInput
  } from '@legitminh/keyflow';
  import {
    choose, complete, labelsFor, phaseLabel, phaseOf, preview,
    type Composition, type InputMode, type OutputMode
  } from '$lib/engine';
  import { predict } from '$lib/prediction';

  type Language = 'vi' | 'en';
  const qwerty = [['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l'], ['z','x','c','v','b','n','m']];
  const copy = {
    vi: {
      intro: 'gõ tiếng việt bằng âm thanh: chọn âm đầu, nguyên âm, âm cuối, rồi thanh.',
      demo: 'thử ngay', step: 'lượt', empty: 'bắt đầu bằng một phím trên bàn phím bên dưới.',
      clear: 'xóa bài thử', suggestions: 'gợi ý', settings: 'cài đặt', language: 'ngôn ngữ',
      input: 'chế độ nhập', output: 'chính tả đầu ra', prediction: 'gợi ý hoàn tất', on: 'bật', off: 'tắt',
      learn: 'cách hoạt động', use: 'dùng siêu việt', install: 'cài đặt',
      how: 'mỗi âm tiết có bốn lựa chọn. các nhãn trên cùng phím đổi theo lượt hiện tại. không cần bấm hợp âm.',
      example: 'ví dụ quốc → k · uô · c · sắc. phím c vẫn là âm cuối c.',
      smart: 'gợi ý hiện phần còn lại của từ và từ tiếp theo theo ngữ cảnh. dấu cách chọn gợi ý đầu tiên.',
      model: 'bản thử dùng bộ xếp hạng ngoại tuyến nhỏ, cùng ranh giới đầu vào/đầu ra với mô hình neural sau này. nó nhanh và riêng tư, nhưng chưa hiểu sâu như transformer đã huấn luyện.',
      mobile: 'trên điện thoại, giữ dấu cách rồi kéo để di chuyển con trỏ. chuyển nhanh sang ascii để gõ tiếng anh hoặc văn bản nguyên dạng.',
      modes: 'siêu việt là chế độ mặc định. quốc ngữ dùng các âm viết quen thuộc nhưng vẫn giữ quy trình bốn lượt.',
      download: 'mở mã nguồn và bản phát hành', repo: 'github', portfolio: 'minh.website'
    },
    en: {
      intro: 'type vietnamese by sound: choose an initial, vowel, final, then tone.',
      demo: 'try it now', step: 'round', empty: 'start with a key on the keyboard below.',
      clear: 'clear demo', suggestions: 'suggestions', settings: 'settings', language: 'language',
      input: 'input mode', output: 'output spelling', prediction: 'completion suggestions', on: 'on', off: 'off',
      learn: 'how it works', use: 'use siêu việt', install: 'install',
      how: 'each syllable takes four choices. labels on the same keys change for the current round. there are no chords to memorize.',
      example: 'quốc is k · uô · c · sắc. the c key remains the final c.',
      smart: 'suggestions show the rest of a word and contextual next words. space accepts the first suggestion.',
      model: 'this demo uses a tiny offline contextual ranker with the same input/output boundary as a future neural model. it is fast and private, but not yet as capable as a trained transformer.',
      mobile: 'on phones, hold space and drag to move the cursor. switch quickly to ascii for english or literal text.',
      modes: 'siêu việt is the default mode. quốc ngữ uses familiar written atoms while keeping the same four-round flow.',
      download: 'open source and releases', repo: 'github', portfolio: 'minh.website'
    }
  } as const;

  let language = $state<Language>('vi');
  let inputMode = $state<InputMode>('sieuviet');
  let outputMode = $state<OutputMode>('quocNgu');
  let suggestionsEnabled = $state(true);
  let text = $state('');
  let composition = $state<Composition>({});
  let phase = $derived(phaseOf(composition));
  let pending = $derived(preview(composition, inputMode));
  let visible = $derived(text + pending);
  let prefix = $derived(visible.match(/[\p{L}]+$/u)?.[0] ?? '');
  let suggestions = $derived(suggestionsEnabled ? predict(visible, prefix, 16) : []);
  let labels = $derived(labelsFor(inputMode, phase));
  let layout = $derived.by<KeyboardLayout>(() => ({
    id: `sieuviet-${inputMode}-${phase}`,
    label: 'siêu việt demo keyboard',
    rows: [
      ...qwerty.map((row) => row.map((key) => ({ key, label: labels[key] ?? key, disabled: labels[key] === undefined }))),
      [
        { key: 'backspace', label: '⌫', width: 1.4 },
        { key: ' ', label: 'dấu cách', width: 5 },
        { key: 'enter', label: '↵', width: 1.4 }
      ]
    ]
  }));
  let c = $derived(copy[language]);

  onMount(() => {
    const saved = localStorage.getItem('sieuviet.site:language');
    if (saved === 'vi' || saved === 'en') language = saved;
  });
  $effect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
    if (typeof localStorage !== 'undefined') localStorage.setItem('sieuviet.site:language', language);
  });

  function resetComposition() { composition = {}; }
  function clearDemo() { text = ''; resetComposition(); }
  function setInput(mode: InputMode) { inputMode = mode; resetComposition(); }

  function acceptSuggestion(suffix: string) {
    const base = visible.slice(0, visible.length - prefix.length);
    text = `${base}${prefix}${suffix} `;
    resetComposition();
  }

  function backspace() {
    if (phase !== 'initial') {
      if (composition.final !== undefined) composition = { initial: composition.initial, vowel: composition.vowel };
      else if (composition.vowel !== undefined) composition = { initial: composition.initial };
      else composition = {};
    } else text = text.slice(0, -1);
  }

  function space() {
    if (suggestions[0] && (prefix || text.endsWith(' '))) acceptSuggestion(suggestions[0]);
    else if (pending) { text += `${pending} `; resetComposition(); }
    else text += ' ';
  }

  function handleKey(event: VirtualKeyInput) {
    if (event.type !== 'keyup') return;
    const key = event.key.toLocaleLowerCase();
    if (key === 'backspace') { backspace(); return; }
    if (key === ' ') { space(); return; }
    if (key === 'enter') { text += pending ? `${pending}\n` : '\n'; resetComposition(); return; }
    if (phase === 'tone') {
      const word = complete(composition, inputMode, outputMode, key);
      if (word) { text += `${word} `; resetComposition(); }
      return;
    }
    const next = choose(composition, inputMode, key);
    if (next) composition = next;
  }
</script>

<svelte:head>
  <title>siêu việt · gõ tiếng việt bằng âm thanh</title>
  <meta name="description" content="siêu việt is a four-round vietnamese keyboard with contextual completion suggestions. try the interactive keyflow demo." />
</svelte:head>

<Document>
  <main>
    <header class="hero">
      <LineText><p class="eyebrow">★ siêu việt</p></LineText>
      <LineText><h1>{c.intro}</h1></LineText>
      <div class="flow-line"><Link href="#demo">{c.demo} ↓</Link> · <Link href="#install">{c.install} ↓</Link> · <Link href="https://github.com/legitminh/vietmoi">{c.repo} ↗</Link></div>
    </header>

    <section id="demo" aria-labelledby="demo-heading">
      <LineText><h2 id="demo-heading">{c.demo}</h2></LineText>
      <div class="demo-shell">
        <div class="editor" aria-live="polite" aria-label="demo text">
          {#if visible}<span>{text}</span><mark>{pending}</mark><span class="caret" aria-hidden="true"></span>{:else}<span class="placeholder">{c.empty}</span>{/if}
        </div>

        <div class="round-status">
          <span>{c.step} {(['initial','vowel','final','tone'].indexOf(phase) + 1)}/4</span>
          <strong>{phaseLabel(phase, language)}</strong>
        </div>

        <div class="suggestion-bar" class:disabled={!suggestionsEnabled} aria-label={c.suggestions}>
          <span class="suggestion-label">{c.suggestions}</span>
          <div class="suggestions">
            {#each suggestions.slice(0, 9) as suggestion, index}
              <StaticButton keys={String(index + 1)} on_close={() => acceptSuggestion(suggestion)}>{suggestion}</StaticButton>
            {:else}
              <span>—</span>
            {/each}
          </div>
        </div>

        <div class="keyboard-wrap">
          <KeyboardDisplay {layout} onkey={handleKey} />
        </div>
        <div class="demo-actions"><ButtonPositional on_close={clearDemo}>{c.clear}</ButtonPositional></div>
      </div>
    </section>

    <section id="settings" aria-labelledby="settings-heading">
      <LineText><h2 id="settings-heading">{c.settings}</h2></LineText>
      <div class="settings-grid">
        <div class="flow-line"><SubKeyframe
          label={`${c.language}: ${language === 'vi' ? 'tiếng việt' : 'english'} ▾`}
          backLabel="←"
          items={[
            { id: 'vi', label: 'tiếng việt', on_select: () => language = 'vi' },
            { id: 'en', label: 'english', on_select: () => language = 'en' }
          ]}
        /></div>
        <div class="flow-line"><SubKeyframe
          label={`${c.input}: ${inputMode === 'sieuviet' ? 'siêu việt' : 'quốc ngữ'} ▾`}
          backLabel="←"
          items={[
            { id: 'sieuviet', label: 'siêu việt', on_select: () => setInput('sieuviet') },
            { id: 'quocNgu', label: 'quốc ngữ', on_select: () => setInput('quocNgu') }
          ]}
        /></div>
        <div class="flow-line"><SubKeyframe
          label={`${c.output}: ${outputMode === 'sieuviet' ? 'siêu việt' : 'quốc ngữ'} ▾`}
          backLabel="←"
          items={[
            { id: 'sieuviet', label: 'siêu việt', on_select: () => outputMode = 'sieuviet' },
            { id: 'quocNgu', label: 'quốc ngữ', on_select: () => outputMode = 'quocNgu' }
          ]}
        /></div>
        <div class="flow-line"><ButtonPositional on_close={() => suggestionsEnabled = !suggestionsEnabled}>{c.prediction}: {suggestionsEnabled ? c.on : c.off}</ButtonPositional></div>
        <div class="flow-line"><ThemeToggle /></div>
      </div>
    </section>

    <section id="guide" aria-labelledby="guide-heading">
      <LineText><h2 id="guide-heading">{c.learn}</h2></LineText>
      <div class="guide-grid">
        <article><LineText><h3>1 → 2 → 3 → 4</h3></LineText><LineText><p>{c.how}</p></LineText><LineText><p><code>{c.example}</code></p></LineText></article>
        <article><LineText><h3>{c.suggestions}</h3></LineText><LineText><p>{c.smart}</p></LineText><LineText><p>{c.model}</p></LineText></article>
        <article><LineText><h3>{c.use}</h3></LineText><LineText><p>{c.modes}</p></LineText><LineText><p>{c.mobile}</p></LineText></article>
      </div>
    </section>

    <section id="install" aria-labelledby="install-heading">
      <LineText><h2 id="install-heading">{c.install}</h2></LineText>
      <LineText><p>macos · iphone / ipad · android</p></LineText>
      <div class="flow-line">{c.download}: <Link href="https://github.com/legitminh/vietmoi/releases">github releases ↗</Link></div>
    </section>

    <footer><div class="flow-line"><Link href="https://legitminh.github.io/">← {c.portfolio}</Link> · <Link href="https://github.com/legitminh/sieuviet.site">source ↗</Link></div></footer>
  </main>
</Document>

<style>
  :global(:root) {
    --site-line: color-mix(in srgb, var(--primary, currentColor) 35%, transparent);
    --site-soft: color-mix(in srgb, var(--primary, currentColor) 7%, var(--background));
    --keyboard-background: transparent;
    --keyboard-key-background: var(--background);
    --keyboard-key-height: clamp(2.5rem, 7vw, 3.5rem);
    --keyboard-gap: clamp(.2rem, 1vw, .45rem);
    --keyboard-padding: 0;
  }
  main { width: min(100%, 72rem); margin: 0 auto; padding: 0 calc(var(--min-box) / 2) calc(var(--min-box) * 2); box-sizing: border-box; }
  .hero { min-height: min(72vh, 38rem); display: flex; flex-direction: column; justify-content: center; }
  h1 { max-width: 20ch; font-size: clamp(2rem, 7vw, 5.5rem); line-height: .98; letter-spacing: -.06em; margin: .2em 0; }
  h2 { font-size: clamp(1.5rem, 4vw, 3rem); margin-top: 2.5em; }
  h3 { margin-bottom: 0; }
  .eyebrow { letter-spacing: .08em; }
  .flow-line { min-height: var(--min-box); display: flex; flex-wrap: wrap; align-items: center; gap: 0 .25rem; }
  .demo-shell { border: 1px solid var(--site-line); border-radius: .5rem; overflow: hidden; background: var(--background); box-shadow: .5rem .5rem 0 var(--site-soft); }
  .editor { min-height: 8rem; padding: clamp(1rem, 4vw, 2rem); font-size: clamp(1.5rem, 5vw, 3rem); line-height: 1.35; white-space: pre-wrap; overflow-wrap: anywhere; }
  .editor mark { background: transparent; color: var(--primary); text-decoration: underline; text-decoration-style: dotted; text-underline-offset: .2em; }
  .placeholder { opacity: .55; font-size: 1rem; }
  .caret { display: inline-block; height: 1em; border-right: .08em solid currentColor; animation: blink 1s steps(1) infinite; vertical-align: -.1em; }
  @keyframes blink { 50% { opacity: 0; } }
  .round-status { display: flex; justify-content: space-between; gap: 1rem; padding: .65rem 1rem; border-top: 1px solid var(--site-line); font-size: .85rem; }
  .suggestion-bar { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .75rem; min-height: 3.5rem; padding: .35rem .75rem; border-block: 1px solid var(--site-line); background: var(--site-soft); }
  .suggestion-bar.disabled { opacity: .5; }
  .suggestion-label { font-size: .75rem; opacity: .65; }
  .suggestions { display: flex; gap: .75rem; overflow: hidden; white-space: nowrap; align-items: center; min-width: 0; }
  .suggestions :global(button) { flex: 0 0 auto; }
  .keyboard-wrap { padding: clamp(.5rem, 2vw, 1rem); }
  .keyboard-wrap :global(.keyflow-key span) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
  .demo-actions { padding: 0 1rem 1rem; }
  .settings-grid, .guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: .5rem 1.5rem; }
  .settings-grid :global(.subkeyframe-panel) { position: absolute; z-index: 5; background: var(--background); border: 1px solid var(--site-line); padding: .5rem; }
  .guide-grid article { border-top: 1px solid var(--site-line); }
  code { white-space: normal; }
  footer { margin-top: calc(var(--min-box) * 2); border-top: 1px solid var(--site-line); }
  @media (max-width: 540px) {
    main { padding-inline: calc(var(--min-box) / 4); }
    .hero { min-height: 65vh; }
    .suggestion-bar { grid-template-columns: 1fr; gap: .15rem; }
    :global(:root) { --keyboard-font-size: .68rem; --keyboard-key-height: 2.7rem; }
  }
  @media (prefers-reduced-motion: reduce) { .caret { animation: none; } }
</style>
