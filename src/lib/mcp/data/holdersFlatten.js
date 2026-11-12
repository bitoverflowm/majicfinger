/** v2 holders payload is MetaHolder[] nested under data; flatten to one row per wallet. */
export function flattenPolymarketHoldersV2(body, { conditionId = "" } = {}) {
  const groups = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const rows = [];
  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    const token = String(group.token_id || group.token || "");
    const holders = Array.isArray(group.holders) ? group.holders : null;
    if (!holders) {
      if (group.proxy_wallet || group.proxyWallet || group.amount != null) {
        rows.push({
          condition_id: conditionId || null,
          token_id: token || null,
          proxy_wallet: group.proxy_wallet || group.proxyWallet || null,
          name: group.name || null,
          pseudonym: group.pseudonym || null,
          amount: Number(group.amount),
          outcome_index: group.outcome_index ?? group.outcomeIndex ?? null,
          verified: !!group.verified,
        });
      }
      continue;
    }
    for (const h of holders) {
      if (!h || typeof h !== "object") continue;
      const amount = Number(h.amount);
      const outcomeIndex = h.outcome_index ?? h.outcomeIndex ?? null;
      rows.push({
        condition_id: conditionId || null,
        token_id: token || String(h.token_id || "") || null,
        proxy_wallet: h.proxy_wallet || h.proxyWallet || null,
        name: h.name || null,
        pseudonym: h.pseudonym || null,
        amount: Number.isFinite(amount) ? amount : null,
        outcome_index: outcomeIndex,
        outcome: outcomeIndex === 1 ? "NO" : outcomeIndex === 0 ? "YES" : null,
        verified: !!h.verified,
        display_username_public: h.display_username_public ?? null,
      });
    }
  }
  return rows.filter((row) => row.proxy_wallet || Number.isFinite(row.amount));
}
