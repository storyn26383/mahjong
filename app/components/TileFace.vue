<script setup lang="ts">
import { tileName, type Tile } from '~~/engine/tile'

const props = defineProps<{ tile: Tile }>()
const { app } = useRuntimeConfig()
const src = computed(() => `${app.baseURL}tiles/${props.tile}.svg`)
</script>

<template>
  <img :src="src" :alt="tileName(tile)" :title="tileName(tile)" width="32" height="44" class="block h-11 w-8 object-contain" draggable="false">
</template>
