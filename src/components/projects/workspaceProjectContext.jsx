"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWorkspaceProjectHead } from "@/lib/workspaceDashboardClient";
import {
  readLastWorkspaceProject,
  readWorkspaceProjectScope,
  rememberWorkspaceProject,
  setWorkspaceProjectScope,
} from "@/lib/workspaceProjectScope";

export const PROJECTS_PATH = "/dashboard/projects";

const WorkspaceProjectContext = createContext(null);

/**
 * The open project: `{ id, scope, kind, name, thumbnailAt, adopt, update, open }`.
 * Null outside the signed-in dashboard (the landing demo has no projects).
 */
export function useWorkspaceProject() {
  return useContext(WorkspaceProjectContext);
}

export function dashboardUrlForProject(id) {
  return id ? `/dashboard?project=${encodeURIComponent(id)}` : "/dashboard";
}

function setProjectInUrl(id) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("project") === id) return;
  url.searchParams.set("project", id);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function fromHead(data) {
  return {
    id: data.id,
    scope: data.localScope || "",
    kind: data.kind,
    name: data.name,
    thumbnailAt: data.thumbnailAt || null,
  };
}

/**
 * Works out which project `/dashboard` opens: `?project=`, else the one this browser opened last,
 * else the one the server says was opened last. A user with no projects gets id "" until the
 * canvas creates their first one and calls `adopt`.
 * `key` changes only when a different project's canvas must mount.
 */
function useResolvedProject(userId, urlProject) {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    if (urlProject && projectRef.current?.id === urlProject) return undefined;
    let cancel = false;

    const ready = (next) => {
      if (cancel) return;
      if (next.id) rememberWorkspaceProject(userId, next);
      setProject({ kind: "dashboard", name: "", thumbnailAt: null, ...next, key: next.id || "first" });
    };
    // Outlives this run: the URL catching up to the cached project re-runs the effect.
    const verify = (id) => {
      loadWorkspaceProjectHead(id).then((head) => {
        if (!mountedRef.current || projectRef.current?.id !== id || !head.ok) return;
        if (!head.data) {
          router.replace(PROJECTS_PATH);
          return;
        }
        const fresh = fromHead(head.data);
        rememberWorkspaceProject(userId, fresh);
        setProject((prev) => {
          if (prev?.id !== id) return prev;
          // A different storage scope means the canvas read the wrong browser copies; remount it.
          const key = prev.scope !== fresh.scope ? `${id}:${fresh.scope}` : prev.key;
          return { ...prev, ...fresh, key };
        });
      });
    };

    if (urlProject) {
      const cached = readWorkspaceProjectScope(userId, urlProject);
      if (cached != null) {
        ready({ id: urlProject, scope: cached });
        verify(urlProject);
      } else {
        loadWorkspaceProjectHead(urlProject).then((head) => {
          if (cancel) return;
          if (head.ok && !head.data) {
            router.replace(PROJECTS_PATH);
            return;
          }
          ready(head.ok ? fromHead(head.data) : { id: urlProject, scope: "" });
        });
      }
    } else {
      const last = readLastWorkspaceProject(userId);
      if (last) {
        setProjectInUrl(last.id);
        ready(last);
        verify(last.id);
      } else {
        loadWorkspaceProjectHead("").then((head) => {
          if (cancel) return;
          const data = head.ok ? head.data : null;
          if (data) setProjectInUrl(data.id);
          ready(data ? fromHead(data) : { id: "", scope: "" });
        });
      }
    }
    return () => {
      cancel = true;
    };
  }, [router, urlProject, userId]);

  return [project, setProject];
}

export function WorkspaceProjectProvider({ userId, urlProject, loading, children }) {
  const router = useRouter();
  const [project, setProject] = useResolvedProject(userId, urlProject);

  // Set during render so the start-tab and canvas storage the subtree reads on mount is this project's.
  if (project) setWorkspaceProjectScope(project.scope);
  useEffect(() => () => setWorkspaceProjectScope(""), []);

  /** The canvas loaded or created this project's document. */
  const adopt = useCallback(
    (doc) => {
      const id = String(doc?._id || doc?.id || "");
      if (!id) return;
      const scope = String(doc.local_scope ?? doc.localScope ?? "");
      rememberWorkspaceProject(userId, { id, scope });
      setProjectInUrl(id);
      setProject((prev) => {
        const next = {
          ...(prev || {}),
          id,
          scope,
          kind: doc.kind || prev?.kind || "dashboard",
          name: doc.name || prev?.name || "",
          thumbnailAt: doc.thumbnail_at || prev?.thumbnailAt || null,
        };
        if (prev && prev.scope !== scope) next.key = `${id}:${scope}`;
        const same = prev && ["id", "scope", "kind", "name", "thumbnailAt"].every((field) => prev[field] === next[field]);
        return same ? prev : next;
      });
    },
    [setProject, userId],
  );

  const update = useCallback(
    (fields) => setProject((prev) => (prev ? { ...prev, ...fields } : prev)),
    [setProject],
  );

  /** Opens another project in place of this one. */
  const open = useCallback(
    (next) => {
      if (!next?.id) return;
      rememberWorkspaceProject(userId, next);
      router.push(dashboardUrlForProject(next.id));
    },
    [router, userId],
  );

  const value = useMemo(
    () =>
      project
        ? { id: project.id, scope: project.scope, kind: project.kind, name: project.name, thumbnailAt: project.thumbnailAt, adopt, update, open }
        : null,
    [adopt, open, project, update],
  );

  if (!project) return loading;
  return (
    <WorkspaceProjectContext.Provider value={value}>
      <ProjectMount key={project.key}>{children}</ProjectMount>
    </WorkspaceProjectContext.Provider>
  );
}

function ProjectMount({ children }) {
  return children;
}
