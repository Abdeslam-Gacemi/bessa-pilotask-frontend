import { computed, ref } from "vue";

/**
 * Create / update / delete requests in flight. While any runs, sheets and
 * dialogs refuse to be dismissed (backdrop, ×, Escape, Back, pull-down), so a
 * save can't be cut off half-way or its result land in a closed form.
 */
const count = ref(0);

export const writesPending = computed(() => count.value > 0);

/** Marks one write as started; call the returned function (any number of times) when it settles. */
export function beginWrite(): () => void {
  count.value++;
  let done = false;
  const release = () => {
    if (done) return;
    done = true;
    count.value = Math.max(0, count.value - 1);
  };
  // Safety net: never keep the screen locked longer than the client's own timeout.
  setTimeout(release, 30_000);
  return release;
}
