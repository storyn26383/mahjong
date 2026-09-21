import { DEFAULT_STAKES, type Stakes } from '~~/engine/money'

/** 底／台設定。 */
export const useStakes = () => usePersistedState<Stakes>('mahjong.stakes', () => ({ ...DEFAULT_STAKES }))
