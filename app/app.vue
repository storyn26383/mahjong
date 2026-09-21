<script setup lang="ts">
const NAV = [
  { to: '/', label: '開門' },
  { to: '/waits', label: '聽牌' },
  { to: '/score', label: '算台' },
]
</script>

<template>
  <div class="min-h-dvh max-w-lg mx-auto">
    <header class="flex items-end justify-between px-4 pt-5 pb-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">麻將小工具</h1>
        <p class="text-sm opacity-60">臺灣十六張</p>
      </div>
      <nav class="flex gap-4 pb-1 text-base">
        <NuxtLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="opacity-50 font-medium"
          active-class="opacity-100 font-bold underline underline-offset-8 decoration-2"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>
    <main class="px-4 pb-8">
      <NuxtPage />
    </main>
  </div>
</template>
