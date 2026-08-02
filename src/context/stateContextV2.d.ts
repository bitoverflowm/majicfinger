import type { Context, ReactNode } from "react";

/** V2 app state — JS provider exposes many fields; index signature keeps TS consumers unblocked. */
export type StateContextV2Value = {
  setLiveStreamActions?: (actions: unknown) => void;
  setLiveStreamState?: (state: unknown) => void;
  setLiveFeedActions?: (actions: unknown) => void;
  setLiveFeedState?: (state: unknown) => void;
  setSheetData?: (data: unknown) => void;
  setConnectedData?: (data: unknown) => void;
  setDataSheets?: (sheets: unknown) => void;
  setActiveSheetId?: (id: string) => void;
  liveStreamActions?: {
    start: (...args: unknown[]) => void;
    stop: (...args: unknown[]) => void;
    pause: (...args: unknown[]) => void;
    resume: (...args: unknown[]) => void;
    restart: (...args: unknown[]) => void;
  };
  liveStreamState?: { streamsBySheetId: Record<string, unknown> };
  liveFeedActions?: {
    start: (...args: unknown[]) => unknown;
    stop: (...args: unknown[]) => void;
    pause: (...args: unknown[]) => void;
    resume: (...args: unknown[]) => void;
    restart: (...args: unknown[]) => void;
  };
  liveFeedState?: { feedsById: Record<string, unknown> };
  [key: string]: unknown;
};

export const StateContextV2: Context<StateContextV2Value>;

export function useMyStateV2(): StateContextV2Value;

export function StateProviderV2(props: {
  children: ReactNode;
  initialSettings?: Record<string, unknown>;
}): JSX.Element;
