/**
 * The sheets of one Save and run, placed on the dashboard as each one lands.
 *
 * Every run path adds its sheets here instead of collecting them for the end, so a
 * sheet and its charts show up as soon as its rows are in. Reveals run one at a time,
 * in the order sheets were added. Each reveal passes every sheet added so far, because
 * the canvas lays out the list it is given below any block it was not given.
 */

const SPOTLIGHT_MS = 420;

function nextFrame() {
  if (typeof requestAnimationFrame !== "function") return Promise.resolve();
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {{
 *   reveal: (sheets: object[], options?: { holdChartsFor?: string, spotlightChartsFor?: string }) => void,
 *   opensChart?: (sheet: object) => boolean,
 *   frame?: () => Promise<void>,
 *   wait?: (ms: number) => Promise<void>,
 *   limit?: number,
 * }} options
 * `limit` caps how many sheets one run places. Sheets past it are dropped, so their charts never open.
 */
export function createRunSheetStage({ reveal, opensChart = () => false, frame = nextFrame, wait = sleep, limit = Infinity }) {
  /** @type {object[]} */
  const sheets = [];
  let queue = Promise.resolve();
  let waiting = 0;
  let dropped = 0;

  /** Add or replace a sheet by id, then place it. Resolves once it is on the canvas. */
  function put(sheet) {
    if (!sheet) return queue;
    const index = sheet.id ? sheets.findIndex((item) => item.id === sheet.id) : -1;
    const isNew = index < 0;
    if (isNew && sheets.length >= limit) {
      dropped += 1;
      return queue;
    }
    if (isNew) sheets.push(sheet);
    else sheets[index] = sheet;
    const snapshot = sheets.slice();
    waiting += 1;
    queue = queue.then(async () => {
      waiting -= 1;
      try {
        // A new chart opens after its sheet. When more sheets are already waiting, they skip the pause.
        if (!isNew || waiting > 0 || !sheet.id || !opensChart(sheet)) {
          reveal(snapshot);
          await frame();
          return;
        }
        reveal(snapshot, { holdChartsFor: sheet.id });
        await frame();
        await wait(SPOTLIGHT_MS);
        reveal(snapshot, { spotlightChartsFor: sheet.id });
        await wait(SPOTLIGHT_MS);
      } catch {
        // One sheet that cannot be drawn should not stop the sheets after it.
      }
    });
    return queue;
  }

  return {
    sheets,
    put,
    /** How many more new sheets fit under `limit`. */
    room: () => Math.max(0, limit - sheets.length),
    /** New sheets turned away by `limit`. */
    dropped: () => dropped,
    /** Resolves after every sheet added so far is on the canvas. */
    settle: () => queue,
  };
}
