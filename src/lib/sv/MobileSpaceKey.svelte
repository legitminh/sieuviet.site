<script lang="ts">
  let { onpress, ondragstart, onmove, onlines, ondragend, pressed = false, label = "space" }: {
    label?: string;
    onpress: () => void;
    ondragstart: () => void;
    /** Horizontal drag: move the caret by characters. */
    onmove: (steps: number) => void;
    /** Vertical drag: move the caret by lines. */
    onlines?: (lines: number) => void;
    ondragend?: () => void;
    pressed?: boolean;
  } = $props();

  let timer: ReturnType<typeof setTimeout> | undefined;
  let dragging = $state(false);
  let lastX = 0;
  let lastY = 0;
  let remainder = 0;
  let vertical = 0;
  let pointer = -1;

  function reset() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (dragging) ondragend?.();
    dragging = false;
    remainder = 0;
    vertical = 0;
    pointer = -1;
  }

  function down(event: PointerEvent) {
    event.preventDefault();
    pointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    remainder = 0;
    vertical = 0;
    event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(pointer);
    timer = setTimeout(() => {
      dragging = true;
      ondragstart();
    }, 350);
  }

  function move(event: PointerEvent) {
    if (!dragging || event.pointerId !== pointer) return;
    remainder += event.clientX - lastX;
    lastX = event.clientX;
    const steps = Math.trunc(remainder / 12);
    if (steps) {
      remainder -= steps * 12;
      onmove(steps);
    }
    vertical += event.clientY - lastY;
    lastY = event.clientY;
    const lines = Math.trunc(vertical / 24);
    if (lines && onlines) {
      vertical -= lines * 24;
      onlines(lines);
    }
  }

  function up(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    const wasDragging = dragging;
    reset();
    if (!wasDragging) onpress();
  }
</script>

<button
  type="button"
  class:pressed={pressed || dragging}
  aria-label={label}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={reset}
></button>

<style>
  button {
    flex: 5.6 1 0;
    min-width: 0;
    min-height: var(--keyboard-key-height, 42px);
    padding: 0;
    border: 1px solid var(--space-color, color-mix(in srgb, hsl(5.625 65% 55%) 60%, var(--primary, #fff)));
    border-radius: 4px;
    color: var(--space-color, currentColor);
    background: var(--keyboard-key-background, transparent);
    touch-action: none;
  }
  button:active, button.pressed {
    background: var(--space-color, currentColor);
  }
</style>
