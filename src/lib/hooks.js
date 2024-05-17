import { useEffect } from 'react'
import Router from 'next/router'
import useSWR, { mutate }  from 'swr'


const fetcher = (url) =>
  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      return { user: data?.user || null }
    })

export function useUser({ redirectTo, redirectIfFound, redirectIfNotFound } = {}) {
  const { data, error } = useSWR('/api/user', fetcher)
  const user = data?.user
  const finished = Boolean(data)
  const hasUser = Boolean(user)

  useEffect(() => {
    if (!redirectTo || !finished) return
    if(redirectIfFound && hasUser){
      Router.push(redirectTo)
    }
    if(redirectIfNotFound && !hasUser){
      Router.push(redirectTo)
    }
  }, [redirectTo, redirectIfFound, finished, hasUser])

  return error ? null : user
}

export const mutateUser = () => {
  mutate('/api/user');
};