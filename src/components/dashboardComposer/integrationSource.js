import { BUILD_SOURCES } from "@/components/dashboardComposer/integrationBuildCatalog";
import { joinAdapterFor } from "@/components/dashboardComposer/integrationJoinAdapter";

const EMPTY = {
  id: "",
  label: "Source",
  lakeId: "",
  venue: "",
  historical: false,
  guidedTables: [],
  priceScale: null,
  priceColumns: [],
  join: null,
};

/** What a source can do. The workspace reads this instead of naming a lake. */
export function integrationProfile(integrationId) {
  const source = BUILD_SOURCES[integrationId];
  const flow = source?.flow;
  if (!source || !flow) return { ...EMPTY, id: integrationId || "", label: source?.name || EMPTY.label };
  return {
    id: integrationId,
    label: source.name || EMPTY.label,
    lakeId: flow.lakeId || "",
    venue: flow.venue || "",
    historical: !!flow.historical,
    guidedTables: Array.isArray(flow.guidedTables) ? flow.guidedTables : [],
    priceScale: flow.priceScale || null,
    priceColumns: Array.isArray(flow.priceColumns) ? flow.priceColumns : [],
    join: joinAdapterFor(flow.join),
  };
}
