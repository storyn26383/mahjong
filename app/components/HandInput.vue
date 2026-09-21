<script setup lang="ts">
import { canAddChow, canAddKong, canAddPung, canAddTile, countOf, HAND_SIZE, handSize, MeldKind, TILES_PER_KONG, TILES_PER_MELD, TILES_PER_PUNG } from '~~/engine/hand'
import { FLOWER_TILES, HONOUR_TILES, isFlower, SUITED_TILES, sortTiles, Suit, suitOf, tileName, type Tile } from '~~/engine/tile'

enum InputMode {
  Concealed = 'concealed',
  Chow = 'chow',
  Pung = 'pung',
  OpenKong = 'open-kong',
  ConcealedKong = 'concealed-kong',
  Flower = 'flower',
}

const MODE_LABELS: Record<InputMode, string> = {
  [InputMode.Concealed]: '手牌',
  [InputMode.Chow]: '吃',
  [InputMode.Pung]: '碰',
  [InputMode.OpenKong]: '明槓',
  [InputMode.ConcealedKong]: '暗槓',
  [InputMode.Flower]: '花',
}

const MELD_LABELS: Record<MeldKind, string> = {
  [MeldKind.Chow]: '吃',
  [MeldKind.Pung]: '碰',
  [MeldKind.OpenKong]: '明槓',
  [MeldKind.ConcealedKong]: '暗槓',
}

const TILE_GROUPS: { label: string, tiles: Tile[] }[] = [
  { label: '萬', tiles: SUITED_TILES.filter(tile => suitOf(tile) === Suit.Characters) },
  { label: '筒', tiles: SUITED_TILES.filter(tile => suitOf(tile) === Suit.Dots) },
  { label: '條', tiles: SUITED_TILES.filter(tile => suitOf(tile) === Suit.Bamboos) },
  { label: '字牌', tiles: HONOUR_TILES },
  { label: '花牌', tiles: FLOWER_TILES },
]

const { hand, addConcealed, removeConcealed, addMeld, removeMeld, addFlower, removeFlower, clear } = useHand()
const mode = ref(InputMode.Concealed)
const pendingChow = ref<Tile[]>([])

watch(mode, () => { pendingChow.value = [] })

const size = computed(() => handSize(hand.value))
const sortedConcealed = computed(() => sortTiles(hand.value.concealed))

const countBadge = (tile: Tile): number =>
  isFlower(tile) ? hand.value.flowers.filter(held => held === tile).length : countOf(hand.value, tile)

const isEnabled = (tile: Tile): boolean => {
  if (isFlower(tile)) return mode.value === InputMode.Flower && !hand.value.flowers.includes(tile)
  switch (mode.value) {
    case InputMode.Concealed: return canAddTile(hand.value, tile)
    case InputMode.Chow: return canAddTile(hand.value, tile) && !pendingChow.value.includes(tile)
    case InputMode.Pung: return canAddPung(hand.value, tile)
    case InputMode.OpenKong:
    case InputMode.ConcealedKong: return canAddKong(hand.value, tile)
    case InputMode.Flower: return false
  }
}

const tapChow = (tile: Tile) => {
  pendingChow.value.push(tile)
  if (pendingChow.value.length < TILES_PER_MELD) return
  const tiles = sortTiles(pendingChow.value)
  pendingChow.value = []
  if (canAddChow(hand.value, tiles)) addMeld({ kind: MeldKind.Chow, tiles })
}

const tap = (tile: Tile) => {
  if (!isEnabled(tile)) return
  switch (mode.value) {
    case InputMode.Concealed: return addConcealed(tile)
    case InputMode.Chow: return tapChow(tile)
    case InputMode.Pung: return addMeld({ kind: MeldKind.Pung, tiles: Array(TILES_PER_PUNG).fill(tile) })
    case InputMode.OpenKong: return addMeld({ kind: MeldKind.OpenKong, tiles: Array(TILES_PER_KONG).fill(tile) })
    case InputMode.ConcealedKong: return addMeld({ kind: MeldKind.ConcealedKong, tiles: Array(TILES_PER_KONG).fill(tile) })
    case InputMode.Flower: return addFlower(tile)
  }
}

const removeSortedConcealed = (sortedIndex: number) => {
  const tile = sortedConcealed.value[sortedIndex]!
  removeConcealed(hand.value.concealed.indexOf(tile))
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="section-label">
        手牌（點一下移除）
        <span class="ml-2 font-semibold" :class="size === HAND_SIZE ? 'text-primary' : 'text-base-content'">{{ size }} / {{ HAND_SIZE }} 張</span>
      </div>
      <button type="button" class="text-sm opacity-60" @click="clear">清空</button>
    </div>

    <div class="panel min-h-16 p-2 flex flex-wrap gap-1.5 items-center">
      <button
        v-for="(tile, i) in sortedConcealed"
        :key="`c${i}`"
        type="button"
        class="tile-button h-11 w-8"
        :aria-label="`移除 ${tileName(tile)}`"
        @click="removeSortedConcealed(i)"
      >
        <TileFace :tile="tile" />
      </button>
      <button
        v-for="(meld, i) in hand.melds"
        :key="`m${i}`"
        type="button"
        class="tile-button gap-0.5 rounded-lg bg-base-200 px-1"
        :aria-label="`移除${MELD_LABELS[meld.kind]}`"
        @click="removeMeld(i)"
      >
        <TileFace v-for="(tile, j) in meld.tiles" :key="j" :tile="tile" :class="{ 'opacity-50': meld.kind === MeldKind.ConcealedKong }" />
      </button>
      <button
        v-for="(tile, i) in hand.flowers"
        :key="`f${i}`"
        type="button"
        class="tile-button h-11 w-8"
        :aria-label="`移除 ${tileName(tile)}`"
        @click="removeFlower(i)"
      >
        <TileFace :tile="tile" />
      </button>
      <span v-if="size === 0 && hand.flowers.length === 0" class="text-sm opacity-40 px-1">從下方點選牌面</span>
    </div>

    <div class="segmented">
      <button
        v-for="(label, value) in MODE_LABELS"
        :key="value"
        type="button"
        :class="{ 'segmented-active': mode === value }"
        @click="mode = value"
      >
        {{ label }}
      </button>
    </div>
    <div v-if="mode === InputMode.Chow" class="text-sm opacity-60 flex items-center gap-1">
      選三張連續的牌：
      <TileFace v-for="(tile, i) in pendingChow" :key="i" :tile="tile" />
    </div>

    <div v-for="group in TILE_GROUPS" :key="group.label" class="flex flex-col gap-1.5">
      <div class="section-label">{{ group.label }}</div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="tile in group.tiles"
          :key="tile"
          type="button"
          class="tile-button h-11 w-8"
          :disabled="!isEnabled(tile)"
          @click="tap(tile)"
        >
          <TileFace :tile="tile" />
          <span v-if="countBadge(tile)" class="tile-count">{{ countBadge(tile) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
