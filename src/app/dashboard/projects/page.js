"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import ProjectsView from "@/components/projects/projectsView";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import { userSwrFetcher } from "@/lib/hooks";

export default function ProjectsPage() {
  const router = useRouter();
  const { data: user, isLoading } = useSWR("/api/user", userSwrFetcher);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background text-muted-foreground">
        <SpectrumLoadingState label="Loading" />
      </div>
    );
  }

  return <ProjectsView user={user} />;
}
