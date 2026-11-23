<script lang="ts">
  let { ondelete, pressed = false }: { ondelete: () => void; pressed?: boolean } = $props();
  let delay: ReturnType<typeof setTimeout> | undefined;
  let repeat: ReturnType<typeof setInterval> | undefined;
  let held = $state(false);

  function stop() {
    if (delay) clearTimeout(delay);
    if (repeat) clearInterval(repeat);
    delay = undefined;
    repeat = undefined;
    held = false;
  }

  function start(event: PointerEvent) {
    event.preventDefault();
    held = true;
    event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId);
    ondelete();
    delay = setTimeout(() => { repeat = setInterval(ondelete, 90); }, 420);
  }
</script>

<button
  type="button"
  class:pressed={pressed || held}
  aria-label="xóa"
  onpointerdown={start}
  onpointerup={stop}
  onpointercancel={stop}
>⌫</button>

<style>
  button {
    flex: 1 1 0;
    min-width: 0;
    min-height: var(--keyboard-key-height, 42px);
    padding: .35rem .15rem;
    border: 1px solid var(--delete-color, color-mix(in srgb, hsl(22.5 65% 55%) 60%, var(--primary, #fff)));
    border-radius: 4px;
    color: var(--delete-color, currentColor);
    background: var(--keyboard-key-background, transparent);
    font: inherit;
    touch-action: none;
  }
  button:active, button.pressed { background: var(--delete-color, currentColor); color: var(--keyboard-pressed-color, #111); }
</style>
