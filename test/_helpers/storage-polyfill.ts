/**
 * Test helper: install an in-memory localStorage that supports `Object.keys`.
 *
 * Why: Node 22+ injects a no-op `globalThis.localStorage` (the runtime warning
 * `--localstorage-file was provided without a valid path` confirms this), and
 * that no-op shadows jsdom's working localStorage. Code under test that calls
 * `localStorage.setItem`, `localStorage.clear`, `Object.keys(localStorage)`,
 * etc. needs a real implementation.
 */
export function installLocalStoragePolyfill() {
  let store: Record<string, string> = {}

  const ls = new Proxy(
    {
      getItem(key: string): string | null {
        return Object.hasOwn(store, key) ? (store[key] ?? null) : null
      },
      setItem(key: string, value: string): void {
        store[key] = String(value)
      },
      removeItem(key: string): void {
        delete store[key]
      },
      clear(): void {
        store = {}
      },
      key(index: number): string | null {
        return Object.keys(store)[index] ?? null
      },
      get length(): number {
        return Object.keys(store).length
      },
    },
    {
      ownKeys() {
        return Object.keys(store)
      },
      getOwnPropertyDescriptor(_, key) {
        if (typeof key === 'string' && Object.hasOwn(store, key)) {
          return { value: store[key], writable: true, enumerable: true, configurable: true }
        }
        return undefined
      },
      has(_, key) {
        return typeof key === 'string' && Object.hasOwn(store, key)
      },
    },
  )

  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: ls, configurable: true })
  }
}
