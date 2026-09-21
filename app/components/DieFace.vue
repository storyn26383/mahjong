<script setup lang="ts">
const props = defineProps<{ face: number }>()

const SIZE = 100
const CORNER = 18
const PIP_RADIUS = 9
const LOW = 26
const MID = 50
const HIGH = 74

/** 每個點數嘅骰點座標。 */
const PIPS: Record<number, [number, number][]> = {
  1: [[MID, MID]],
  2: [[LOW, LOW], [HIGH, HIGH]],
  3: [[LOW, LOW], [MID, MID], [HIGH, HIGH]],
  4: [[LOW, LOW], [HIGH, LOW], [LOW, HIGH], [HIGH, HIGH]],
  5: [[LOW, LOW], [HIGH, LOW], [MID, MID], [LOW, HIGH], [HIGH, HIGH]],
  6: [[LOW, LOW], [HIGH, LOW], [LOW, MID], [HIGH, MID], [LOW, HIGH], [HIGH, HIGH]],
}

/** 真骰一點同四點係紅色。 */
const RED_FACES = [1, 4]
const pipClass = computed(() => (RED_FACES.includes(props.face) ? 'fill-red-600' : 'fill-neutral-900'))
</script>

<template>
  <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" role="img" :aria-label="`${face} 點`">
    <rect x="2" y="2" :width="SIZE - 4" :height="SIZE - 4" :rx="CORNER" class="fill-white stroke-neutral-400" stroke-width="3" />
    <circle v-for="([x, y], i) in PIPS[face]" :key="i" :cx="x" :cy="y" :r="PIP_RADIUS" :class="pipClass" />
  </svg>
</template>
