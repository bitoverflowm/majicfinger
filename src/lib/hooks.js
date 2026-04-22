import { useEffect } from "react";
import Router from "next/router";
import useSWR, { mutate } from "swr";

/**
 * Must return the API `user` object directly (or null). Do not wrap — multiple
 * callers share the same SWR key `/api/user`; a mismatched shape breaks consumers
 * (e.g. dashboard paywall checks reading `user.email`).
 */
export const userSwrFetcher = (url) =>
  fetch(url)
    .then((r) => r.json())
    .then((data) => data?.user ?? null);

export function useUser({ redirectTo, redirectIfFound, redirectIfNotFound } = {}) {
  const { data: user, error, isLoading } = useSWR("/api/user", userSwrFetcher);

  useEffect(() => {
    if (!redirectTo || isLoading) return;
    if (redirectIfFound && user) {
      Router.push(redirectTo);
    }
    if (redirectIfNotFound && !user) {
      Router.push(redirectTo);
    }
  }, [redirectTo, redirectIfFound, redirectIfNotFound, isLoading, user]);

  return error ? null : user;
}

export const mutateUser = () => {
  mutate("/api/user");
};
