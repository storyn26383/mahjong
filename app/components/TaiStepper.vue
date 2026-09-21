<script setup lang="ts">
import { Tai, TAI_VALUES } from '~~/engine/scoring'

const props = defineProps<{ tai: Tai, max: number }>()
const count = defineModel<number>({ required: true })

const increment = () => { count.value = count.value >= props.max ? 0 : count.value + 1 }
</script>

<template>
  <button type="button" class="choice" :class="{ 'choice-active': count > 0 }" @click="increment">
    {{ tai }}{{ count > 1 ? ` × ${count}` : '' }}
    <span class="choice-sub">{{ TAI_VALUES[tai] * Math.max(count, 1) }} 台</span>
  </button>
</template>
