/** 鎖住時加喺根元素嘅 class，CSS 會將 body 固定。 */
const LOCKED_CLASS = 'scroll-locked'
/** body 固定之後向上移嘅距離，保持畫面停喺原位。 */
const OFFSET_PROPERTY = '--scroll-lock-offset'

/**
 * 禁止背景 scroll。iPhone Safari 唔一定理 overflow: hidden，
 * 所以將 body 固定喺原位，解鎖時再 scroll 返原本位置。
 */
export const useScrollLock = () => {
  let lockedAt: number | undefined

  const lock = () => {
    if (lockedAt !== undefined) return
    lockedAt = window.scrollY
    const root = document.documentElement
    root.style.setProperty(OFFSET_PROPERTY, `-${lockedAt}px`)
    root.classList.add(LOCKED_CLASS)
  }

  const unlock = () => {
    if (lockedAt === undefined) return
    const root = document.documentElement
    root.classList.remove(LOCKED_CLASS)
    root.style.removeProperty(OFFSET_PROPERTY)
    window.scrollTo(0, lockedAt)
    lockedAt = undefined
  }

  onBeforeUnmount(unlock)
  return { lock, unlock }
}
