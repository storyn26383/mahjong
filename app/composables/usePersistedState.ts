/** 跨頁共用、同時記入 localStorage 嘅狀態。讀唔到就用預設值。 */
export const usePersistedState = <T>(key: string, defaultValue: () => T) => {
  const load = (): T => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? { ...defaultValue(), ...JSON.parse(saved) } : defaultValue()
    }
    catch {
      return defaultValue()
    }
  }
  const state = useState<T>(key, load)
  watch(state, value => localStorage.setItem(key, JSON.stringify(value)), { deep: true })
  return state
}
