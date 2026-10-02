"use client";

import { useEffect, useRef, useState } from "react";

function TypingGhost({ examples }) {
  const list = examples == null ? ["= Yes Price + No Price"] : examples;
  const key = list.join("\n");
  const [text, setText] = useState("");
  const indexRef = useRef(0);
  const countRef = useRef(0);
  const deletingRef = useRef(false);

  useEffect(() => {
    if (!key) return undefined;
    const samples = key.split("\n");
    const timer = window.setInterval(() => {
      const sample = samples[indexRef.current % samples.length];
      if (!deletingRef.current) {
        countRef.current += 1;
        setText(sample.slice(0, countRef.current));
        if (countRef.current >= sample.length) deletingRef.current = true;
        return;
      }
      countRef.current -= 1;
      setText(sample.slice(0, Math.max(0, countRef.current)));
      if (countRef.current <= 0) {
        deletingRef.current = false;
        indexRef.current += 1;
      }
    }, 70);
    return () => window.clearInterval(timer);
  }, [key]);

  if (!list.length) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center truncate px-2 font-mono text-[12px] text-[#0b3a66]/70 dark:text-[#e8f4ff]/70">
      {text}
      <span className="ml-px inline-block h-3 w-px animate-pulse bg-current" />
    </span>
  );
}

function SuggestionList({ suggestions, anchor, onPick }) {
  if (!suggestions?.length || !anchor) return null;
  return (
    <ul
      className="fixed z-[30] max-h-64 overflow-auto rounded-lg border border-border/70 bg-background py-1 text-left shadow-lg"
      style={{ left: anchor.left, top: anchor.bottom + 4, width: anchor.width || 320 }}
    >
      {suggestions.map((item) => (
        <li key={item.name}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(item)}
            className="flex w-full flex-col px-2.5 py-1.5 text-left hover:bg-[#0d99ff]/10"
          >
            <span className="font-mono text-[12px] font-semibold text-foreground">{item.format}</span>
            <span className="text-[11px] leading-snug text-muted-foreground">{item.description}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function FormulaHeaderEditor({
  box,
  bar = false,
  value,
  error,
  examples,
  suggestions,
  focusToken = 0,
  onChange,
  onFocus,
  onBlur,
  onCaret,
  onPickSuggestion,
  onCommit,
  placeholder,
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    if (!focusToken) return;
    inputRef.current?.focus();
  }, [focusToken]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !focused) {
      setAnchor(null);
      return undefined;
    }
    const place = () => {
      const rect = input.getBoundingClientRect();
      const host = input.closest("[data-sheet-grid]") || input.closest("[role='dialog']") || document.documentElement;
      const bounds = host.getBoundingClientRect();
      const width = Math.min(320, Math.max(180, bounds.width - 24));
      const left = Math.max(bounds.left + 12, Math.min(rect.left, bounds.right - width - 12));
      setAnchor({ left, bottom: rect.bottom, width });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [focused, value, box, bar]);

  const field = (
    <>
      <div className={bar ? "relative h-8" : "relative h-full min-h-8"}>
        {!focused && !value ? <TypingGhost examples={examples} /> : null}
        <input
          ref={inputRef}
          value={value}
          aria-label="Equation"
          spellCheck={false}
          onChange={(event) => {
            onChange(event.target.value);
            onCaret(event.target.selectionStart || 0);
          }}
          onFocus={() => {
            setFocused(true);
            onFocus();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur();
          }}
          onSelect={(event) => onCaret(event.target.selectionStart || 0)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            onCommit?.();
          }}
          onKeyUp={(event) => onCaret(event.currentTarget.selectionStart || 0)}
          placeholder={focused ? (placeholder ?? "= Yes Price + No Price") : ""}
          className="h-full w-full border border-[#0d99ff] bg-[#d7ebff]/95 px-2 font-mono text-[12px] text-[#0b3a66] outline-none placeholder:text-[#0b3a66]/45 dark:bg-[#0d99ff]/25 dark:text-[#e8f4ff] dark:placeholder:text-[#e8f4ff]/50"
        />
      </div>
      <SuggestionList suggestions={focused ? suggestions : []} anchor={anchor} onPick={onPickSuggestion} />
      {error && !(focused && suggestions?.length) ? (
        <p className="mt-1 max-w-sm rounded-md bg-background/95 px-2 py-1 text-[11px] leading-snug text-red-600 shadow-sm dark:text-red-400">
          {error}
        </p>
      ) : null}
    </>
  );

  if (bar) {
    return <div>{field}</div>;
  }

  if (!box) return null;
  return (
    <div className="absolute z-20" style={{ left: box.x, top: box.y, width: Math.max(box.width, 220), minHeight: box.height }}>
      {field}
    </div>
  );
}
