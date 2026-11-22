<script lang="ts">
  import { Keyflow, key_presets } from '@legitminh/keyflow';
  import '@legitminh/keyflow/styles.css';
  let { children } = $props();
</script>

<Keyflow options={{ storagePrefix: 'sieuviet.site:', keys: key_presets.alphanumeric, lockstep: false }}>
  {@render children()}
</Keyflow>
