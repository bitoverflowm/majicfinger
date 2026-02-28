"use client";

import { useEffect } from "react";
import { useUser } from "@/lib/hooks";
import { useRouter } from "next/navigation";
import Login from "@/components/login";

const LoginPage = () => {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user]);

  return (
    <div className="h-screen w-screen flex">
      <Login fromHome={true} />
    </div>
  );
};

export default LoginPage;
