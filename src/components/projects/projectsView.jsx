"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Clock,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  listWorkspaceProjects,
  updateWorkspaceProject,
  workspaceProjectThumbnailUrl,
} from "@/lib/workspaceDashboardClient";
import { forgetWorkspaceProject, rememberWorkspaceProject } from "@/lib/workspaceProjectScope";
import { dashboardUrlForProject } from "@/components/projects/workspaceProjectContext";
import { cn } from "@/lib/utils";

const VIEW_KEY = "lycheeProjectsView";
const KIND_FILTERS = [
  { id: "all", label: "All" },
  { id: "dashboard", label: "Dashboards" },
  { id: "terminal", label: "Terminals" },
];
const KIND_META = {
  dashboard: { label: "Dashboard", Icon: LayoutDashboard, tint: "bg-[#0d99ff] text-white" },
  terminal: { label: "Terminal", Icon: SquareTerminal, tint: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" },
};

const RELATIVE = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }) : null;
const STEPS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

function timeAgo(value) {
  const at = value ? new Date(value).getTime() : 0;
  if (!at) return "";
  const seconds = Math.round((at - Date.now()) / 1000);
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return RELATIVE ? RELATIVE.format(Math.round(seconds / size), unit) : "";
  }
  return "just now";
}

function recency(project) {
  return new Date(project.openedAt || project.updatedAt || 0).getTime();
}

function readView() {
  if (typeof localStorage === "undefined") return "grid";
  return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
}

function membershipToast(message) {
  toast.error(message || "Saving more projects needs a membership.", {
    action: { label: "See plans", onClick: () => window.location.assign("/dashboard?view=billing") },
  });
}

function KindIcon({ kind, className }) {
  const meta = KIND_META[kind] || KIND_META.dashboard;
  return (
    <span className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-md", meta.tint, className)}>
      <meta.Icon className="size-3.5" aria-hidden />
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );
}

function PublishedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#0d99ff]/12 px-1.5 py-0.5 text-[11px] font-medium text-[#0b7fd4] dark:text-[#5cb8ff]">
      <Globe className="size-3" aria-hidden />
      Published
    </span>
  );
}

function Thumbnail({ project, className }) {
  const url = workspaceProjectThumbnailUrl(project);
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className={cn("size-full object-cover object-left-top", className)} />
    );
  }
  const meta = KIND_META[project.kind] || KIND_META.dashboard;
  return (
    <div className={cn("flex size-full items-center justify-center bg-neutral-100 dark:bg-neutral-800/60", className)}>
      <meta.Icon className="size-8 text-neutral-300 dark:text-neutral-600" aria-hidden />
    </div>
  );
}

function ProjectMenu({ project, onOpen, onRename, onStar, onDelete, children }) {
  const openingDialog = useRef(false);
  const withDialog = (open) => () => {
    openingDialog.current = true;
    open();
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44"
        onCloseAutoFocus={(event) => {
          if (!openingDialog.current) return;
          openingDialog.current = false;
          event.preventDefault();
        }}
      >
        <DropdownMenuItem onSelect={onOpen} className="text-[13px]">Open</DropdownMenuItem>
        <DropdownMenuItem onSelect={withDialog(onRename)} className="gap-2 text-[13px]">
          <Pencil className="size-3.5" aria-hidden />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onStar} className="gap-2 text-[13px]">
          <Star className="size-3.5" aria-hidden />
          {project.starred ? "Remove from starred" : "Add to starred"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={withDialog(onDelete)} className="gap-2 text-[13px] text-red-600 focus:text-red-600 dark:text-red-400">
          <Trash2 className="size-3.5" aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StarButton({ starred, onClick, className }) {
  return (
    <button
      type="button"
      aria-label={starred ? "Remove from starred" : "Add to starred"}
      aria-pressed={starred}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-black/[0.05] dark:hover:bg-white/10",
        starred ? "text-amber-500" : "text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100",
        className,
      )}
    >
      <Star className={cn("size-3.5", starred && "fill-current")} aria-hidden />
    </button>
  );
}

function ProjectCard({ project, actions }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <button
        type="button"
        onClick={actions.onOpen}
        className="relative aspect-[16/10] w-full overflow-hidden border-b border-border/60 bg-muted/40 text-left"
        aria-label={`Open ${project.name}`}
      >
        <Thumbnail project={project} />
        {project.live || project.published ? (
          <span className="absolute left-2 top-2 flex gap-1">
            {project.live ? <LiveBadge /> : null}
            {project.published ? <PublishedBadge /> : null}
          </span>
        ) : null}
      </button>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <KindIcon kind={project.kind} />
        <button type="button" onClick={actions.onOpen} className="min-w-0 flex-1 text-left">
          <div className="truncate text-[13px] font-medium text-foreground">{project.name}</div>
          <div className="truncate text-[12px] text-muted-foreground">Edited {timeAgo(project.updatedAt)}</div>
        </button>
        <StarButton starred={project.starred} onClick={actions.onStar} />
        <ProjectMenu project={project} {...actions}>
          <button
            type="button"
            aria-label="Project options"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-black/[0.05] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 dark:hover:bg-white/10"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </button>
        </ProjectMenu>
      </div>
    </div>
  );
}

function ProjectRow({ project, actions }) {
  const meta = KIND_META[project.kind] || KIND_META.dashboard;
  return (
    <tr className="group border-b border-border/50 hover:bg-muted/40">
      <td className="py-2 pl-3 pr-2">
        <button type="button" onClick={actions.onOpen} className="flex min-w-0 items-center gap-3 text-left">
          <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40">
            <Thumbnail project={project} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-foreground">{project.name}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {project.tabCount} {project.tabCount === 1 ? "tab" : "tabs"}
            </span>
          </span>
        </button>
      </td>
      <td className="px-2 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <meta.Icon className="size-3.5" aria-hidden />
          {meta.label}
        </span>
      </td>
      <td className="px-2">{project.live ? <LiveBadge /> : <span className="text-[12px] text-muted-foreground">—</span>}</td>
      <td className="px-2">
        {project.published ? <PublishedBadge /> : <span className="text-[12px] text-muted-foreground">Private</span>}
      </td>
      <td className="whitespace-nowrap px-2 text-[13px] text-muted-foreground">{timeAgo(project.updatedAt)}</td>
      <td className="w-20 pr-2">
        <span className="flex items-center justify-end">
          <StarButton starred={project.starred} onClick={actions.onStar} />
          <ProjectMenu project={project} {...actions}>
            <button
              type="button"
              aria-label="Project options"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-black/[0.05] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 dark:hover:bg-white/10"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
          </ProjectMenu>
        </span>
      </td>
    </tr>
  );
}

function SidebarItem({ active, icon: Icon, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px]",
        active ? "bg-[#0d99ff]/10 font-medium text-foreground" : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/5",
      )}
    >
      <Icon className="size-4" aria-hidden />
      <span className="flex-1">{label}</span>
      {count ? <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span> : null}
    </button>
  );
}

/** Figma-style files page: every project the user has, as cards or a list. */
export default function ProjectsView({ user }) {
  const router = useRouter();
  const userId = String(user?.userId || "");
  const [projects, setProjects] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [section, setSection] = useState("recents");
  const [kind, setKind] = useState("all");
  const [view, setView] = useState("grid");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => setView(readView()), []);

  const load = useCallback(async () => {
    const result = await listWorkspaceProjects();
    if (result.unauthorized) {
      router.replace("/login");
      return;
    }
    if (!result.ok) {
      setLoadError(result.message);
      setProjects((prev) => prev || []);
      return;
    }
    setLoadError("");
    setProjects(result.data);
  }, [router]);

  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [load]);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private mode; the choice lasts this visit.
    }
  };

  const shown = useMemo(() => {
    const list = (projects || [])
      .filter((project) => section !== "starred" || project.starred)
      .filter((project) => kind === "all" || project.kind === kind);
    return list.sort((a, b) => recency(b) - recency(a));
  }, [kind, projects, section]);

  const patchLocal = (id, fields) => setProjects((prev) => (prev || []).map((item) => (item.id === id ? { ...item, ...fields } : item)));

  const open = (project) => {
    rememberWorkspaceProject(userId, { id: project.id, scope: project.localScope });
    router.push(dashboardUrlForProject(project.id));
  };

  const toggleStar = async (project) => {
    const starred = !project.starred;
    patchLocal(project.id, { starred });
    const saved = await updateWorkspaceProject(project.id, { starred });
    if (!saved.ok) {
      patchLocal(project.id, { starred: !starred });
      toast.error(saved.message);
    }
  };

  const commitRename = async () => {
    const project = renaming;
    const name = renameDraft.trim().slice(0, 120);
    setRenaming(null);
    if (!project || !name || name === project.name) return;
    patchLocal(project.id, { name });
    const saved = await updateWorkspaceProject(project.id, { name });
    if (!saved.ok) {
      patchLocal(project.id, { name: project.name });
      toast.error(saved.message);
    }
  };

  const confirmDelete = async () => {
    const project = deleting;
    setDeleteOpen(false);
    if (!project) return;
    const removed = await deleteWorkspaceProject(project.id);
    if (!removed.ok) {
      toast.error(removed.message);
      return;
    }
    forgetWorkspaceProject(userId, project);
    setProjects((prev) => (prev || []).filter((item) => item.id !== project.id));
    toast.success(`Deleted “${project.name}”`);
  };

  const createDashboard = async () => {
    if (creating) return;
    setCreating(true);
    const created = await createWorkspaceProject({ name: "Untitled", kind: "dashboard" });
    setCreating(false);
    if (!created.ok) {
      if (created.status === 402) membershipToast(created.message);
      else toast.error(created.message);
      return;
    }
    open(created.data);
  };

  const actionsFor = (project) => ({
    onOpen: () => open(project),
    onStar: () => void toggleStar(project),
    onRename: () => {
      setRenameDraft(project.name);
      setRenaming(project);
    },
    onDelete: () => {
      setDeleting(project);
      setDeleteOpen(true);
    },
  });

  const starredCount = (projects || []).filter((project) => project.starred).length;
  const title = section === "starred" ? "Starred" : "Recents";

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border/70 px-3 py-3 md:flex">
        <div className="flex items-center gap-2 px-1 pb-4">
          <span className="flex size-6 shrink-0 overflow-hidden rounded-full">
            <Image src="/logo.png" width={24} height={24} alt="Lychee" className="size-full object-cover" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{user?.name || user?.email || "Your files"}</span>
          <UserAvatar src={user?.profile_pic} name={user?.name} email={user?.email} size={24} />
        </div>
        <nav className="flex flex-col gap-0.5">
          <SidebarItem active={section === "recents"} icon={Clock} label="Recents" onClick={() => setSection("recents")} />
          <SidebarItem
            active={section === "starred"}
            icon={Star}
            label="Starred"
            count={starredCount}
            onClick={() => setSection("starred")}
          />
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/70 bg-background/95 px-6 backdrop-blur">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h1>
          <div className="flex-1" />
          <Button size="sm" onClick={createDashboard} disabled={creating} className="h-8 gap-1.5 bg-[#0d99ff] text-[13px] text-white hover:bg-[#0b87e0]">
            {creating ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
            New dashboard
          </Button>
        </header>

        <div className="flex items-center gap-3 px-6 pt-4">
          <div role="tablist" aria-label="Project type" className="flex items-center gap-1">
            {KIND_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={kind === filter.id}
                onClick={() => setKind(filter.id)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-[13px]",
                  kind === filter.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center rounded-md border border-border/70 p-0.5">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => changeView("grid")}
              className={cn("inline-flex size-7 items-center justify-center rounded", view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground")}
            >
              <LayoutGrid className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => changeView("list")}
              className={cn("inline-flex size-7 items-center justify-center rounded", view === "list" ? "bg-muted text-foreground" : "text-muted-foreground")}
            >
              <List className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <section className="px-6 pb-10 pt-4">
          {loadError ? <p className="mb-4 text-[13px] text-red-600 dark:text-red-400">{loadError}</p> : null}
          {projects === null ? (
            <div className="flex items-center gap-2 py-16 text-[13px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading your files…
            </div>
          ) : !projects.length ? (
            <div className="flex flex-col items-start gap-3 py-12">
              <p className="text-[14px] font-medium">No saved projects yet</p>
              <p className="max-w-md text-[13px] text-muted-foreground">
                Your dashboard is saved as your first project once it has something on it.
              </p>
              <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => router.push("/dashboard")}>
                Open your dashboard
              </Button>
            </div>
          ) : !shown.length ? (
            <p className="py-12 text-[13px] text-muted-foreground">
              {section === "starred" ? "Star a project to keep it here." : "No projects of this type yet."}
            </p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
              {shown.map((project) => (
                <ProjectCard key={project.id} project={project} actions={actionsFor(project)} />
              ))}
            </div>
          ) : (
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col />
                <col className="w-32" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-36" />
                <col className="w-20" />
              </colgroup>
              <thead>
                <tr className="border-b border-border/70 text-left text-[12px] text-muted-foreground">
                  <th className="py-2 pl-3 pr-2 font-medium">Name</th>
                  <th className="px-2 font-medium">Type</th>
                  <th className="px-2 font-medium">Status</th>
                  <th className="px-2 font-medium">Visibility</th>
                  <th className="px-2 font-medium">Edited</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((project) => (
                  <ProjectRow key={project.id} project={project} actions={actionsFor(project)} />
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      <Dialog open={!!renaming} onOpenChange={(next) => !next && setRenaming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Rename project</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void commitRename();
            }}
            className="flex flex-col gap-4"
          >
            <Input autoFocus value={renameDraft} maxLength={120} onChange={(event) => setRenameDraft(event.target.value)} aria-label="Project name" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!renameDraft.trim()}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its tabs, sheets, and charts are removed for good. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
