<script lang="ts">
  import { LineText, Link, Button } from '@legitminh/keyflow';
  import { ui } from './copy.svelte';

  let { go }: { go: (page: 'keyboards' | 'try') => void } = $props();
  const copy = {
    vi: {
      intro: 'gõ tiếng việt bằng âm thanh: chọn âm đầu, nguyên âm, âm cuối, rồi thanh.',
      try: 'thử bàn phím', keyboards: 'quản lý bàn phím', install: 'cài đặt', guide: 'cách hoạt động',
      flow: 'mỗi âm tiết có bốn lựa chọn. nhãn trên cùng một phím đổi theo lựa chọn hiện tại.',
      example: 'quốc → k · uô · c · sắc',
      manage: 'siêu việt quản lý một danh sách bàn phím. mỗi bàn phím có ngôn ngữ, bố cục và cách viết riêng. chạm shift để chuyển sang bàn phím tiếp theo.',
      cursor: 'trên điện thoại, giữ dấu cách rồi kéo để di chuyển con trỏ. giữ shift để viết hoa, chạm hai lần để khóa chữ hoa.',
      modes: 'siêu việt là cách viết mặc định. quốc ngữ đổi từ đã hoàn tất sang chính tả chuẩn với cùng quy trình bốn lựa chọn.',
      download: 'mã nguồn và bản phát hành', source: 'mã nguồn', portfolio: 'minh.website'
    },
    en: {
      intro: 'type vietnamese by sound: choose an initial, vowel, final, then tone.',
      try: 'try the keyboard', keyboards: 'manage keyboards', install: 'install', guide: 'how it works',
      flow: 'each syllable takes four choices. the label on each physical key changes with the current choice.',
      example: 'quốc → k · uô · c · sắc',
      manage: 'siêu việt manages a list of keyboards. each keyboard has its own language, layout and output. tap shift to move to the next keyboard.',
      cursor: 'on phones, hold space and drag to move the cursor. hold shift for capitals; double tap for caps lock.',
      modes: 'siêu việt is the default output. quốc ngữ turns completed words into standard spelling with the same four-choice flow.',
      download: 'source and releases', source: 'source', portfolio: 'minh.website'
    },
    zh: {
      intro: '按读音输入越南语：依次选择声母、元音、韵尾和声调。',
      try: '试用键盘', keyboards: '管理键盘', install: '安装', guide: '工作原理',
      flow: '每个音节需要四次选择。每个实体键上的标签会随当前选择而变化。',
      example: 'quốc → k · uô · c · sắc',
      manage: 'siêu việt 管理一个键盘列表。每个键盘都有自己的语言、布局和输出。轻点 shift 切换到下一个键盘。',
      cursor: '在手机上，按住空格并拖动来移动光标。按住 shift 输入大写；连按两次锁定大写。',
      modes: 'siêu việt 是默认输出。quốc ngữ 用同样的四步流程把完成的词转换为标准拼写。',
      download: '源代码和发行版', source: '源代码', portfolio: 'minh.website'
    }
  } as const;
  let c = $derived(copy[ui.language]);
</script>

<main class="intro">
  <header class="hero">
    <LineText><p class="eyebrow">★ siêu việt</p></LineText>
    <LineText><h1>{c.intro}</h1></LineText>
    <div class="flow-line">
      <Button on_close={() => go('try')}>{c.try} →</Button> ·
      <Button on_close={() => go('keyboards')}>{c.keyboards} →</Button> ·
      <Link href="#install">{c.install} ↓</Link> · <Link href="https://github.com/legitminh/vietmoi">github ↗</Link>
    </div>
  </header>

  <section id="guide" aria-labelledby="guide-heading">
    <LineText><h2 id="guide-heading">{c.guide}</h2></LineText>
    <div class="guide-grid">
      <article><LineText><h3>1 → 2 → 3 → 4</h3></LineText><LineText><p>{c.flow}</p></LineText><LineText><p><code>{c.example}</code></p></LineText></article>
      <article><LineText><h3>⇧ → ⌨</h3></LineText><LineText><p>{c.manage}</p></LineText><LineText><p>{c.cursor}</p></LineText></article>
      <article><LineText><h3>siêu việt / quốc ngữ</h3></LineText><LineText><p>{c.modes}</p></LineText>
        <div class="flow-line"><Button on_close={() => go('try')}>{c.try} →</Button></div></article>
    </div>
  </section>

  <section id="install" aria-labelledby="install-heading">
    <LineText><h2 id="install-heading">{c.install}</h2></LineText>
    <LineText><p>macos · iphone / ipad · android · windows · ubuntu</p></LineText>
    <div class="flow-line">{c.download}: <Link href="https://github.com/legitminh/vietmoi/releases">github releases ↗</Link></div>
  </section>

  <footer>
    <div class="flow-line"><Link href="https://legitminh.github.io/">← {c.portfolio}</Link> · <Link href="https://github.com/legitminh/sieuviet.site">{c.source} ↗</Link></div>
  </footer>
</main>

<style>
  main { width: min(100%, 72rem); margin: 0 auto; padding: 0 calc(var(--min-box) / 2) calc(var(--min-box) * 2); box-sizing: border-box; }
  .hero { min-height: min(72vh, 42rem); display: flex; flex-direction: column; justify-content: center; }
  h1 { max-width: 20ch; margin: .2em 0; font-size: clamp(2rem, 7vw, 5.5rem); line-height: .98; letter-spacing: -.06em; }
  h2 { margin-top: 2.5em; font-size: clamp(1.5rem, 4vw, 3rem); }
  h3 { margin-bottom: 0; }
  .eyebrow { letter-spacing: .08em; }
  .flow-line { min-height: var(--min-box); display: flex; flex-wrap: wrap; align-items: center; gap: 0 .25rem; }
  .guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: .5rem 1.5rem; }
  .guide-grid article { border-top: 1px solid color-mix(in srgb, var(--primary) 35%, transparent); }
  code { white-space: normal; }
  footer { margin-top: calc(var(--min-box) * 2); border-top: 1px solid color-mix(in srgb, var(--primary) 35%, transparent); }
  @media (max-width: 540px) { main { padding-inline: calc(var(--min-box) / 4); } .hero { min-height: 62vh; } }
</style>
