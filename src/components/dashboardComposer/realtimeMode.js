import { realtimeTargetForBlock } from "@/lib/realtime/sheetRealtime";

/** Sheets on a tab that can open a live pull. Charts follow the sheet they are attached to. */
export function realtimeSheets(blocks) {
  return (blocks || []).filter((block) => block?.type === "sheet" && realtimeTargetForBlock(block));
}

/**
 * The arrow menu shows up once realtime is still running on a tab you are not looking at.
 * On the tab where it was turned on, the play control itself becomes stop.
 * @param {{ current?: boolean, on?: boolean }[]} tabs
 */
export function showRealtimeMenu(tabs) {
  const list = Array.isArray(tabs) ? tabs : [];
  return list.some((tab) => tab?.on && !tab?.current);
}
