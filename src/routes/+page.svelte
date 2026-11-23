<script lang="ts">
  import { onMount } from 'svelte';
  import { Document, LineText, Link, ThemeToggle } from '@legitminh/keyflow';
  import DemoScreen from '$lib/demo/DemoScreen.svelte';

  type Language = 'vi' | 'en';
  let language = $state<Language>('vi');
  let demoOpen = $state(false);

  const copy = {
    vi: {
      intro: 'gõ tiếng việt bằng âm thanh: chọn âm đầu, nguyên âm, âm cuối, rồi thanh.',
      try: 'thử bàn phím', install: 'cài đặt', guide: 'cách hoạt động',
      flow: 'mỗi âm tiết có bốn lựa chọn. nhãn trên cùng một phím đổi theo lựa chọn hiện tại.',
      example: 'quốc → k · uô · c · sắc',
      prediction: 'gợi ý hoàn tất ưu tiên từ đơn, dùng ngữ cảnh để đề xuất từ tiếp theo, và chạy hoàn toàn trên thiết bị.',
      cursor: 'giữ dấu cách rồi kéo để di chuyển con trỏ. phím ABC chuyển nhanh sang tiếng anh hoặc văn bản nguyên dạng.',
      modes: 'siêu việt là chế độ mặc định. quốc ngữ dùng các âm viết quen thuộc với cùng quy trình bốn lựa chọn.',
      download: 'mã nguồn và bản phát hành', source: 'mã nguồn', portfolio: 'minh.website', language: 'english'
    },
    en: {
      intro: 'type vietnamese by sound: choose an initial, vowel, final, then tone.',
      try: 'try the keyboard', install: 'install', guide: 'how it works',
      flow: 'each syllable takes four choices. the label on each physical key changes with the current choice.',
      example: 'quốc → k · uô · c · sắc',
      prediction: 'completion suggestions favor single words, use context for the next word, and run entirely on-device.',
      cursor: 'hold space and drag to move the cursor. the ABC key switches quickly to english or literal text.',
      modes: 'siêu việt is the default input mode. quốc ngữ uses familiar written sounds with the same four-choice flow.',
      download: 'source and releases', source: 'source', portfolio: 'minh.website', language: 'tiếng việt'
    }
  } as const;
  let c = $derived(copy[language]);

  onMount(() => {
    const saved = localStorage.getItem('sieuviet.site:language');
    if (saved === 'vi' || saved === 'en') language = saved;
    const syncHash = () => demoOpen = location.hash === '#demo';
    syncHash();
    addEventListener('hashchange', syncHash);
    return () => removeEventListener('hashchange', syncHash);
  });

  $effect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
    if (typeof localStorage !== 'undefined') localStorage.setItem('sieuviet.site:language', language);
  });

  function closeDemo() {
    if (typeof history !== 'undefined') history.replaceState(null, '', `${location.pathname}${location.search}`);
    demoOpen = false;
  }
</script>

<svelte:head>
  <title>siêu việt · gõ tiếng việt bằng âm thanh</title>
  <meta name="description" content="siêu việt is a four-choice vietnamese keyboard with contextual completion suggestions. try the mobile keyboard in your browser." />
</svelte:head>

{#if demoOpen}
  <DemoScreen onback={closeDemo} />
{:else}
  <Document>
    <main>
      <header class="hero">
        <LineText><p class="eyebrow">★ siêu việt</p></LineText>
        <LineText><h1>{c.intro}</h1></LineText>
        <div class="flow-line"><Link href="#demo">{c.try} →</Link> · <Link href="#install">{c.install} ↓</Link> · <Link href="https://github.com/legitminh/vietmoi">github ↗</Link></div>
      </header>

      <section id="guide" aria-labelledby="guide-heading">
        <LineText><h2 id="guide-heading">{c.guide}</h2></LineText>
        <div class="guide-grid">
          <article><LineText><h3>1 → 2 → 3 → 4</h3></LineText><LineText><p>{c.flow}</p></LineText><LineText><p><code>{c.example}</code></p></LineText></article>
          <article><LineText><h3>↗</h3></LineText><LineText><p>{c.prediction}</p></LineText><LineText><p>{c.cursor}</p></LineText></article>
          <article><LineText><h3>siêu việt / quốc ngữ</h3></LineText><LineText><p>{c.modes}</p></LineText><div class="flow-line"><Link href="#demo">{c.try} →</Link></div></article>
        </div>
      </section>

      <section id="install" aria-labelledby="install-heading">
        <LineText><h2 id="install-heading">{c.install}</h2></LineText>
        <LineText><p>macos · iphone / ipad · android</p></LineText>
        <div class="flow-line">{c.download}: <Link href="https://github.com/legitminh/vietmoi/releases">github releases ↗</Link></div>
      </section>

      <footer>
        <div class="flow-line"><Link href="https://legitminh.github.io/">← {c.portfolio}</Link> · <Link href="https://github.com/legitminh/sieuviet.site">{c.source} ↗</Link> · <button type="button" onclick={() => language = language === 'vi' ? 'en' : 'vi'}>{c.language}</button> · <ThemeToggle /></div>
      </footer>
    </main>
  </Document>
{/if}

<style>
  :global(:root) {
    --site-line: color-mix(in srgb, var(--primary, currentColor) 35%, transparent);
    --site-soft: color-mix(in srgb, var(--primary, currentColor) 7%, var(--background));
  }
  main { width: min(100%, 72rem); margin: 0 auto; padding: 0 calc(var(--min-box) / 2) calc(var(--min-box) * 2); box-sizing: border-box; }
  .hero { min-height: min(82vh, 46rem); display: flex; flex-direction: column; justify-content: center; }
  h1 { max-width: 20ch; margin: .2em 0; font-size: clamp(2rem, 7vw, 5.5rem); line-height: .98; letter-spacing: -.06em; }
  h2 { margin-top: 2.5em; font-size: clamp(1.5rem, 4vw, 3rem); }
  h3 { margin-bottom: 0; }
  .eyebrow { letter-spacing: .08em; }
  .flow-line { min-height: var(--min-box); display: flex; flex-wrap: wrap; align-items: center; gap: 0 .25rem; }
  .guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: .5rem 1.5rem; }
  .guide-grid article { border-top: 1px solid var(--site-line); }
  code { white-space: normal; }
  footer { margin-top: calc(var(--min-box) * 2); border-top: 1px solid var(--site-line); }
  footer button { padding: 0; border: 0; color: inherit; background: none; font: inherit; text-decoration: underline; }
  @media (max-width: 540px) { main { padding-inline: calc(var(--min-box) / 4); } .hero { min-height: 72vh; } }
</style>
