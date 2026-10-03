function cloneStep(step) {
  return {
    ...step,
    args: step.args ? { ...step.args } : undefined,
    children: step.children ? step.children.map((child) => ({ ...child })) : undefined,
  };
}

/** Live sentences for an Athena compose poll. */
export function describeComposePhase(info, { table, limit } = {}) {
  const name = table || "this table";
  const phase = info?.phase;
  const processed = Number(info?.processed);
  const total = Number(info?.total ?? info?.rowLimit ?? limit);
  const hasProcessed = Number.isFinite(processed) && processed >= 0;
  const hasTotal = Number.isFinite(total) && total > 0;
  if (phase === "downloading" || phase === "downloading_page" || phase === "parsing_response") {
    if (hasProcessed && hasTotal) return `Downloading ${processed.toLocaleString()} of ${total.toLocaleString()} rows from ${name}`;
    if (hasProcessed) return `Downloading ${processed.toLocaleString()} rows from ${name}`;
    return `Downloading rows from ${name}`;
  }
  if (phase === "athena_succeeded") return `Athena finished composing ${name}. Downloading rows.`;
  if (phase === "download_complete") {
    const count = Number(info?.rowCount);
    if (Number.isFinite(count)) return `${count.toLocaleString()} rows from ${name}`;
  }
  if (info?.chunk && info?.chunks) return `Composing ${name} · part ${info.chunk} of ${info.chunks}`;
  return `Composing ${name}`;
}

export function createRunReporter(publish) {
  let feed = {
    id: `run-${Date.now().toString(36)}`,
    title: "Composing pull",
    status: "running",
    startedAt: Date.now(),
    steps: [],
  };
  const push = () => {
    publish?.({
      ...feed,
      steps: feed.steps.map(cloneStep),
    });
  };
  const find = (id) => feed.steps.find((step) => step.id === id);
  return {
    plan(steps, meta = {}) {
      feed = { ...feed, ...meta, status: "running", steps: steps.map(cloneStep) };
      push();
    },
    start(id) {
      const step = find(id);
      if (!step) return;
      step.status = "running";
      step.startedAt = step.startedAt || Date.now();
      push();
    },
    note(id, result) {
      const step = find(id);
      if (!step || !result || step.result === result) return;
      step.result = result;
      push();
    },
    succeed(id, patch = {}) {
      const step = find(id);
      if (!step) return;
      Object.assign(step, patch);
      step.status = "success";
      step.completedAt = Date.now();
      push();
    },
    fail(id, message) {
      const step = find(id) || feed.steps.find((item) => item.status === "running") || feed.steps.find((item) => item.status === "pending");
      if (step) {
        step.status = "error";
        step.result = message || "This step failed";
        step.completedAt = Date.now();
      }
      feed.status = "error";
      feed.completedAt = Date.now();
      push();
    },
    setChildren(id, children) {
      const step = find(id);
      if (!step) return;
      step.children = children.map((child) => ({ ...child }));
      push();
    },
    patchChild(id, childId, patch) {
      const step = find(id);
      const child = step?.children?.find((item) => item.id === childId);
      if (!child) return;
      const nextResult = patch.result;
      if (nextResult && child.result === nextResult && child.status === (patch.status || child.status)) return;
      Object.assign(child, patch);
      if (child.status === "running") child.startedAt = child.startedAt || Date.now();
      if (child.status === "success" || child.status === "error") child.completedAt = Date.now();
      push();
    },
    finish() {
      if (feed.status === "error") return;
      feed.status = "done";
      feed.completedAt = Date.now();
      push();
    },
  };
}
