<script lang="ts">
  import { onMount } from 'svelte';
  import { Document } from '@legitminh/keyflow';
  import Nav, { type Page } from '$lib/sv/Nav.svelte';
  import IntroPage from '$lib/sv/IntroPage.svelte';
  import KeyboardsPage from '$lib/sv/KeyboardsPage.svelte';
  import TryPage from '$lib/sv/TryPage.svelte';
  import SettingsPage from '$lib/sv/SettingsPage.svelte';
  import { keyboards } from '$lib/sv/keyboards.svelte';
  import { ui } from '$lib/sv/copy.svelte';

  // One app, three pages plus settings: the website opens on the intro, the native apps on the keyboards.
  let page = $state<Page>('intro');
  let ready = $state(false);
  const fromHash = (): Page | null => {
    const hash = location.hash.slice(1);
    return hash === 'keyboards' || hash === 'try' || hash === 'settings' ? hash : hash === 'intro' ? 'intro' : hash === 'demo' ? 'try' : null;
  };

  onMount(() => {
    keyboards.load();
    page = fromHash() ?? (keyboards.platform === 'web' ? 'intro' : 'keyboards');
    ready = true;
    const sync = () => { const next = fromHash(); if (next) page = next; };
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  });
  $effect(() => { document.documentElement.lang = ui.language; });

  function go(next: Page) {
    page = next;
    history.replaceState(null, '', `#${next}`);
    scrollTo(0, 0);
  }
</script>

<svelte:head>
  <title>siêu việt · gõ tiếng việt bằng âm thanh</title>
  <meta name="description" content="siêu việt manages your keyboards and types vietnamese by sound in four choices. try every configured keyboard in your browser." />
</svelte:head>

{#snippet nav(exit?: () => void)}<Nav {page} {go} {exit} />{/snippet}

{#if page === 'try' && ready}
  <TryPage {nav} />
{:else}
  <Document>
    {@render nav()}
    {#if page === 'keyboards'}<KeyboardsPage />{:else if page === 'settings'}<SettingsPage />{:else}<IntroPage {go} />{/if}
  </Document>
{/if}
