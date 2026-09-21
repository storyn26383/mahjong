<script setup lang="ts">
import { HAND_SIZE, handSize } from '~~/engine/hand'
import { tileName, type Tile } from '~~/engine/tile'
import { analyseWaits, WaitKind } from '~~/engine/waits'

const WAIT_KIND_LABELS: Record<WaitKind, string> = {
  [WaitKind.Edge]: '邊張',
  [WaitKind.Closed]: '嵌張',
  [WaitKind.Single]: '單吊',
  [WaitKind.Multiple]: '多面聽',
}

const { hand } = useHand()
const situation = useSituation()
const router = useRouter()

const scoreWith = (tile: Tile) => {
  situation.value.winningTile = tile
  router.push('/score')
}
const size = computed(() => handSize(hand.value))
const isComplete = computed(() => size.value === HAND_SIZE)
const waits = computed(() => analyseWaits(hand.value))
const loneWaitLabel = computed(() => {
  const kind = waits.value[0]?.kind
  return kind && kind !== WaitKind.Multiple ? WAIT_KIND_LABELS[kind] : undefined
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="panel p-4 flex flex-col gap-3">
      <div v-if="!isComplete" class="text-base opacity-60">
        {{ size < HAND_SIZE ? `再輸入 ${HAND_SIZE - size} 張就能算聽牌` : `多了 ${size - HAND_SIZE} 張` }}
      </div>
      <div v-else-if="waits.length === 0" class="text-base font-semibold text-error">尚未聽牌</div>
      <template v-else>
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-bold text-primary">聽 {{ waits.length }} 張</span>
          <span v-if="loneWaitLabel" class="text-sm opacity-60">{{ loneWaitLabel }}</span>
          <span class="text-sm opacity-60 ml-auto">點牌直接算台</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="wait in waits"
            :key="wait.tile"
            type="button"
            class="tile-button h-11 w-8"
            :aria-label="`用 ${tileName(wait.tile)} 算台`"
            @click="scoreWith(wait.tile)"
          >
            <TileFace :tile="wait.tile" />
          </button>
        </div>
      </template>
    </section>

    <HandInput />
  </div>
</template>
