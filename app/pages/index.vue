<script setup lang="ts">
import { DrawDirection, openDoor, Position, STACKS_PER_WALL } from '~~/engine/open-door'

const DIE_FACES = [1, 2, 3, 4, 5, 6]
const POSITION_LABELS: Record<Position, string> = {
  [Position.Bottom]: '自己',
  [Position.Right]: '下家',
  [Position.Top]: '對家',
  [Position.Left]: '上家',
}

const dice = ref<[number, number, number]>([1, 1, 1])
const result = computed(() => openDoor({ dice: dice.value }))

// SVG 幾何：俯瞰牌桌，每面由牆主嘅右手邊開始排，四面順時針接駁，同取牌次序一致。
const SIZE = 320
const MARGIN = 14
const THICKNESS = 22
const INNER_START = MARGIN + THICKNESS
const INNER_END = SIZE - INNER_START
const STACK_WIDTH = (INNER_END - INNER_START) / STACKS_PER_WALL
/** 高亮由頭兩墩起沿取牌方向漸淡，跨呢個數量嘅墩。 */
const FADE_STACKS = 8
const SEAT_LABEL_INSET = 34
/** 莊家第一手取 4 張，即 2 墩。 */
const FIRST_DRAW_STACKS = 2
const WALL_ORDER: Record<DrawDirection, Position[]> = {
  [DrawDirection.Clockwise]: [Position.Bottom, Position.Left, Position.Top, Position.Right],
}

interface Rect { x: number, y: number, width: number, height: number }

/** 第 `index` 墩（由牆主右手邊數起）嘅位置。 */
const STACK_RECT: Record<Position, (index: number) => Rect> = {
  [Position.Bottom]: index => ({ x: INNER_END - (index + 1) * STACK_WIDTH, y: INNER_END, width: STACK_WIDTH, height: THICKNESS }),
  [Position.Left]: index => ({ x: MARGIN, y: INNER_END - (index + 1) * STACK_WIDTH, width: THICKNESS, height: STACK_WIDTH }),
  [Position.Top]: index => ({ x: INNER_START + index * STACK_WIDTH, y: MARGIN, width: STACK_WIDTH, height: THICKNESS }),
  [Position.Right]: index => ({ x: INNER_END, y: INNER_START + index * STACK_WIDTH, width: THICKNESS, height: STACK_WIDTH }),
}

const wallStacks = (position: Position): Rect[] => Array.from({ length: STACKS_PER_WALL }, (_, index) => STACK_RECT[position](index))

const wallOrder = computed(() => WALL_ORDER[result.value.drawDirection])
const allStacks = computed(() => wallOrder.value.flatMap(wallStacks))
const openingWallStart = computed(() => wallOrder.value.indexOf(result.value.wall) * STACKS_PER_WALL)
const lastSkipped = computed(() => openingWallStart.value + result.value.skippedStacks - 1)
const drawStart = computed(() => (lastSkipped.value + 1) % allStacks.value.length)

const stepsFromDrawStart = (index: number): number => (index - drawStart.value + allStacks.value.length) % allStacks.value.length

/** 頭兩墩 100%，之後逐墩漸淡至 0。 */
const highlightOpacity = (index: number): number => {
  const steps = stepsFromDrawStart(index)
  if (steps < FIRST_DRAW_STACKS) return 1
  return Math.max(0, 1 - (steps - FIRST_DRAW_STACKS + 1) / FADE_STACKS)
}

/** 開門嗰面係東，之後逆時針（自己→下家→對家→上家）補南西北。 */
const WIND_NAMES = ['東', '南', '西', '北']
const SEAT_ORDER = [Position.Bottom, Position.Right, Position.Top, Position.Left]
const windOf = (position: Position): string =>
  WIND_NAMES[(SEAT_ORDER.indexOf(position) - SEAT_ORDER.indexOf(result.value.wall) + SEAT_ORDER.length) % SEAT_ORDER.length]!

const SEAT_LABEL_POINTS: Record<Position, { x: number, y: number }> = {
  [Position.Bottom]: { x: SIZE / 2, y: INNER_END - SEAT_LABEL_INSET },
  [Position.Right]: { x: INNER_END - SEAT_LABEL_INSET - 6, y: SIZE / 2 },
  [Position.Top]: { x: SIZE / 2, y: INNER_START + SEAT_LABEL_INSET },
  [Position.Left]: { x: INNER_START + SEAT_LABEL_INSET + 6, y: SIZE / 2 },
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="rounded-2xl overflow-hidden" style="background: radial-gradient(circle at 50% 40%, #2a7a5a, #1b4d38 75%)">
      <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="w-full">
        <g v-for="(rect, index) in allStacks" :key="index">
          <rect :x="rect.x" :y="rect.y" :width="rect.width" :height="rect.height" fill="#efe9d8" stroke="#c9c1ad" stroke-width="1" rx="1.5" />
          <rect
            v-if="highlightOpacity(index) > 0"
            :x="rect.x" :y="rect.y" :width="rect.width" :height="rect.height"
            fill="var(--color-neutral)" :opacity="highlightOpacity(index)" rx="1.5"
          />
        </g>
        <g v-for="(point, position) in SEAT_LABEL_POINTS" :key="position">
          <rect :x="point.x - 24" :y="point.y - 22" width="48" height="44" rx="8" :fill="position === Position.Bottom ? 'var(--color-neutral)' : '#ffffff'" />
          <text
            :x="point.x" :y="point.y - 8"
            text-anchor="middle" dominant-baseline="middle"
            :fill="position === Position.Bottom ? 'var(--color-neutral-content)' : '#1f2f45'"
            font-size="15" font-weight="700"
          >{{ windOf(position) }}</text>
          <text
            :x="point.x" :y="point.y + 10"
            text-anchor="middle" dominant-baseline="middle"
            :fill="position === Position.Bottom ? 'var(--color-neutral-content)' : '#1f2f45'"
            font-size="13" font-weight="700"
          >{{ POSITION_LABELS[position] }}</text>
        </g>
        <text :x="SIZE / 2 + 2" :y="SIZE / 2 + 16" text-anchor="middle" fill="#ffffff">
          <tspan font-size="44" font-weight="700">{{ result.skippedStacks }}</tspan>
          <tspan font-size="13" opacity="0.7" dx="4">點</tspan>
        </text>
      </svg>
    </div>

    <section class="flex flex-col gap-2">
      <div class="section-label">骰子點數</div>
      <div v-for="(_, dieIndex) in dice" :key="dieIndex" class="grid grid-cols-6 gap-2">
        <button
          v-for="face in DIE_FACES"
          :key="face"
          type="button"
          class="choice min-h-12 px-0"
          :class="{ 'choice-active': dice[dieIndex] === face }"
          :aria-pressed="dice[dieIndex] === face"
          @click="dice[dieIndex] = face"
        >
          <DieFace :face="face" class="h-8 w-8" />
        </button>
      </div>
    </section>
  </div>
</template>
