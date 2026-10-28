"use client";

import { useEffect, useRef, useState } from "react";

import { useInView, useReducedMotion } from "../features/feature-kit";
import { DataCardFrame } from "./data-card-frame";
import { useIntegrationVotes } from "./integration-votes";
import { LetterTile } from "./letter-tile";
import { VoteButton, VoteGrid } from "./vote-controls";

type Venue = { id: string; name: string; detail: string; mark: string; color: string };

const VENUES: readonly Venue[] = [
  { id: "limitless", name: "Limitless", detail: "Crypto and stock price markets on Base", mark: "L", color: "#111827" },
  { id: "novig", name: "Novig", detail: "Peer-to-peer sports exchange", mark: "N", color: "#7c3aed" },
  { id: "prophetx", name: "ProphetX", detail: "Sports event exchange", mark: "PX", color: "#0284c7" },
  { id: "og", name: "OG", detail: "Sports and event markets", mark: "OG", color: "#ea580c" },
  { id: "forecastex", name: "ForecastEx", detail: "Interactive Brokers' event contracts", mark: "FX", color: "#b91c1c" },
  { id: "predictit", name: "PredictIt", detail: "Political prediction markets", mark: "PI", color: "#15803d" },
  { id: "manifold", name: "Manifold", detail: "Play-money forecasting community", mark: "M", color: "#4f46e5" },
];

const VENUE_IDS = new Set(VENUES.map((v) => v.id));
const CYCLE_MS = 2600;

export function VenueVoteDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const { votes } = useIntegrationVotes();
  const voteCount = votes.filter((id) => VENUE_IDS.has(id)).length;

  const cycling = inView && !hovering && !reduced;
  useEffect(() => {
    if (!cycling) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % VENUES.length), CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [cycling]);

  const venue = VENUES[index];

  return (
    <DataCardFrame
      title="Next integrations"
      frameRef={rootRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative border-b border-border px-3.5 py-3">
        <div className="flex items-center gap-3">
          <div key={venue.id} className="ds-row-in flex min-w-0 flex-1 items-center gap-3">
            <LetterTile mark={venue.mark} color={venue.color} large />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-primary">{venue.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{venue.detail}</p>
            </div>
          </div>
          <VoteButton id={venue.id} name={venue.name} />
        </div>
        {cycling ? (
          <span
            key={`progress-${index}`}
            className="ds-progress absolute inset-x-0 bottom-0 h-px bg-[#2f6fed]/60"
            style={{ animationDuration: `${CYCLE_MS}ms` }}
            aria-hidden
          />
        ) : null}
      </div>

      <div className="flex items-center justify-between px-3.5 pb-1.5 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Vote for the next integration</span>
        <span className="normal-case tracking-normal">{voteCount ? `${voteCount} voted` : ""}</span>
      </div>

      <VoteGrid
        options={VENUES.map((v) => ({ id: v.id, name: v.name, tile: <LetterTile mark={v.mark} color={v.color} /> }))}
        active={index}
        onPick={setIndex}
        suggestPlaceholder="Which market?"
        suggestLabel="Suggest a prediction market"
      />
    </DataCardFrame>
  );
}
