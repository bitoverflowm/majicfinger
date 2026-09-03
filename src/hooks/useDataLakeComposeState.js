"use client";

import { useState } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";

/**
 * Compose query state shared between Connect home inline editor and integrations panel (Kalshi connect flow).
 * @param {boolean} shareViaContext
 */
export function useDataLakeComposeState(shareViaContext) {
  const ctx = useMyStateV2() ?? {};

  const [localColumnComposeItems, setLocalColumnComposeItems] = useState([]);
  const [localColumnComposeOrderBy, setLocalColumnComposeOrderBy] = useState([]);
  const [localComposeLimitRuleOpen, setLocalComposeLimitRuleOpen] = useState(false);
  const [localComposeLimitRuleValue, setLocalComposeLimitRuleValue] = useState("");
  const [localComposeLimitScope, setLocalComposeLimitScope] = useState("primary");
  const [localComposeWhereFilters, setLocalComposeWhereFilters] = useState([]);
  const [localComposeHavingFilters, setLocalComposeHavingFilters] = useState([]);
  const [localComposeJoins, setLocalComposeJoins] = useState([]);
  const [localRandomSampleEnabled, setLocalRandomSampleEnabled] = useState(false);
  const [localRandomSampleSize, setLocalRandomSampleSize] = useState("");
  const [localRandomSampleSeeded, setLocalRandomSampleSeeded] = useState(true);
  const [localRandomSampleSeed, setLocalRandomSampleSeed] = useState("");

  if (shareViaContext) {
    return {
      columnComposeItems: ctx.dataLakeColumnComposeItems ?? [],
      setColumnComposeItems: ctx.setDataLakeColumnComposeItems,
      columnComposeOrderBy: ctx.dataLakeComposeOrderBy ?? [],
      setColumnComposeOrderBy: ctx.setDataLakeComposeOrderBy,
      composeLimitRuleOpen: !!ctx.dataLakeComposeLimitOpen,
      setComposeLimitRuleOpen: ctx.setDataLakeComposeLimitOpen,
      composeLimitRuleValue: ctx.dataLakeComposeLimitValue ?? "",
      setComposeLimitRuleValue: ctx.setDataLakeComposeLimitValue,
      composeLimitScope: ctx.dataLakeComposeLimitScope ?? "primary",
      setComposeLimitScope: ctx.setDataLakeComposeLimitScope,
      composeWhereFilters: ctx.dataLakeComposeWhereFilters ?? [],
      setComposeWhereFilters: ctx.setDataLakeComposeWhereFilters,
      composeHavingFilters: ctx.dataLakeComposeHavingFilters ?? [],
      setComposeHavingFilters: ctx.setDataLakeComposeHavingFilters,
      composeJoins: ctx.dataLakeComposeJoins ?? [],
      setComposeJoins: ctx.setDataLakeComposeJoins,
      randomSampleEnabled: !!ctx.dataLakeComposeRandomSampleEnabled,
      setRandomSampleEnabled: ctx.setDataLakeComposeRandomSampleEnabled,
      randomSampleSize: ctx.dataLakeComposeRandomSampleSize ?? "",
      setRandomSampleSize: ctx.setDataLakeComposeRandomSampleSize,
      randomSampleSeeded: ctx.dataLakeComposeRandomSampleSeeded !== false,
      setRandomSampleSeeded: ctx.setDataLakeComposeRandomSampleSeeded,
      randomSampleSeed: ctx.dataLakeComposeRandomSampleSeed ?? "",
      setRandomSampleSeed: ctx.setDataLakeComposeRandomSampleSeed,
    };
  }

  return {
    columnComposeItems: localColumnComposeItems,
    setColumnComposeItems: setLocalColumnComposeItems,
    columnComposeOrderBy: localColumnComposeOrderBy,
    setColumnComposeOrderBy: setLocalColumnComposeOrderBy,
    composeLimitRuleOpen: localComposeLimitRuleOpen,
    setComposeLimitRuleOpen: setLocalComposeLimitRuleOpen,
    composeLimitRuleValue: localComposeLimitRuleValue,
    setComposeLimitRuleValue: setLocalComposeLimitRuleValue,
    composeLimitScope: localComposeLimitScope,
    setComposeLimitScope: setLocalComposeLimitScope,
    composeWhereFilters: localComposeWhereFilters,
    setComposeWhereFilters: setLocalComposeWhereFilters,
    composeHavingFilters: localComposeHavingFilters,
    setComposeHavingFilters: setLocalComposeHavingFilters,
    composeJoins: localComposeJoins,
    setComposeJoins: setLocalComposeJoins,
    randomSampleEnabled: localRandomSampleEnabled,
    setRandomSampleEnabled: setLocalRandomSampleEnabled,
    randomSampleSize: localRandomSampleSize,
    setRandomSampleSize: setLocalRandomSampleSize,
    randomSampleSeeded: localRandomSampleSeeded,
    setRandomSampleSeeded: setLocalRandomSampleSeeded,
    randomSampleSeed: localRandomSampleSeed,
    setRandomSampleSeed: setLocalRandomSampleSeed,
  };
}
