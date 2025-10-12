import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useUrlState() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const deleteParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(key)
      const query = params.toString()
      router.replace(query ? `?${query}` : window.location.pathname)
    },
    [router, searchParams]
  )

  const toggleParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (params.has(key)) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const query = params.toString()
      router.replace(query ? `?${query}` : window.location.pathname)
    },
    [router, searchParams]
  )

  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key)
    },
    [searchParams]
  )

  return { setParam, deleteParam, toggleParam, getParam }
}
