"use client";

import { useEffect } from "react";
import { useUser } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import Login from "@/components/login";
import { WORKSPACE_ENTRY_PATH } from "@/lib/workspaceEntry";

const LoginPage = () => {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace(WORKSPACE_ENTRY_PATH);
    }
  }, [user]);

  return (
    <div className="h-screen w-screen flex">
      <Login fromHome={true} />
    </div>
  );
};

export default LoginPage;
