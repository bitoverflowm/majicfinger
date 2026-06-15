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
  };
}
