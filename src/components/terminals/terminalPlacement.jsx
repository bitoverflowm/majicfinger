"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FolderPlus, Loader2, PanelsTopLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useWorkspaceProject } from "@/components/projects/workspaceProjectContext";
import { openTerminalTab, terminalProjectDraft } from "@/components/terminals/openTerminalTab";
import { createWorkspaceProject, updateWorkspaceProject } from "@/lib/workspaceDashboardClient";
import { findTerminal } from "@/lib/workspaceTerminals";

const listeners = new Set();

/**
 * Opens a terminal the way the open project calls for: straight into an empty project, otherwise
 * after asking whether to add it here or start a new project. Falls back to adding a tab when no
 * placement host is mounted.
 */
export function requestTerminalPlacement(request, fallback) {
  if (!listeners.size) {
    fallback?.();
    return;
  }
  for (const listener of listeners) listener(request);
}

function ChoiceButton({ icon: Icon, title, body, busy, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-border/70 p-3 text-left transition-colors hover:border-[#0d99ff]/60 hover:bg-[#0d99ff]/[0.04] disabled:opacity-60"
    >
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Icon className="size-4" aria-hidden />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{body}</span>
      </span>
    </button>
  );
}

export function TerminalPlacementHost() {
  const ctx = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const project = useWorkspaceProject();
  const user = useUser();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState("");

  const accountId = user?.userId || "";
  const addHere = (request) => openTerminalTab({ ...request, ctx, canvas, accountId });

  const adoptTerminal = (terminalId) => {
    const terminal = findTerminal(terminalId);
    if (!terminal) return;
    if (!canvas?.dashboardName || canvas.dashboardName === "Untitled") canvas?.renameDashboard?.(terminal.title);
    if (!project?.id) return;
    project.update?.({ kind: "terminal" });
    void updateWorkspaceProject(project.id, { kind: "terminal" });
  };

  const handle = (request) => {
    if (ctx?.landingDemo || !project) {
      addHere(request);
      return;
    }
    const tabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
    const occupied = !!canvas?.hasContent || tabs.some((tab) => tab?.terminal);
    if (!occupied) {
      addHere(request);
      adoptTerminal(request.terminalId);
      return;
    }
    setPending(request);
  };
  const handleRef = useRef(handle);
  handleRef.current = handle;

  useEffect(() => {
    const listener = (request) => handleRef.current(request);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [handleRef]);

  const chooseHere = () => {
    if (!pending) return;
    addHere(pending);
    setPending(null);
  };

  const chooseNew = async () => {
    if (!pending || busy) return;
    const draft = terminalProjectDraft(pending.terminalId, pending.subject);
    if (!draft) return;
    setBusy("new");
    const created = await createWorkspaceProject(draft);
    if (!created.ok) {
      setBusy("");
      if (created.status === 402) {
        toast.message("New projects need a membership, so this terminal opened in your current project.");
        chooseHere();
        return;
      }
      toast.error(created.message);
      return;
    }
    await canvas?.saveNow?.();
    setBusy("");
    setPending(null);
    project?.open?.({ id: created.data.id, scope: created.data.localScope });
  };

  const terminal = findTerminal(pending?.terminalId);
  const projectName = canvas?.dashboardName || "this project";

  return (
    <Dialog open={!!pending} onOpenChange={(next) => !next && !busy && setPending(null)}>
      <DialogContent className="max-w-md gap-5">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Open {terminal?.title || "terminal"}</DialogTitle>
          <DialogDescription className="text-[13px]">
            {projectName} already has tabs. Add the terminal here, or keep it in a project of its own.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <ChoiceButton
            icon={PanelsTopLeft}
            title={`Add terminal tabs to ${projectName}`}
            body="Opens as a new tab beside your current ones."
            disabled={!!busy}
            onClick={chooseHere}
          />
          <ChoiceButton
            icon={FolderPlus}
            title="Start a new project"
            body="A terminal project of its own, listed in your files."
            busy={busy === "new"}
            disabled={!!busy}
            onClick={() => void chooseNew()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}