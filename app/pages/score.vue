<script setup lang="ts">
import { HAND_SIZE, handSize } from '~~/engine/hand'
import { emptyManualSelection, ManualGroup, MAX_DRAGON_PUNGS, MAX_FLOWER_KONGS, MAX_SEAT_FLOWERS, scoreManual } from '~~/engine/manual-scoring'
import { settle, type Stakes } from '~~/engine/money'
import { Blessing, effectiveWinMethod, FlowerWin, LastTile, ReadyDeclaration, scoreHand, Tai, TAI_VALUES, Wind, WinMethod } from '~~/engine/scoring'
import { tileName } from '~~/engine/tile'
import { analyseWaits } from '~~/engine/waits'

const WIND_LABELS: Record<Wind, string> = {
  [Wind.East]: '東',
  [Wind.South]: '南',
  [Wind.West]: '西',
  [Wind.North]: '北',
}
const WIN_METHOD_LABELS: Record<WinMethod, string> = {
  [WinMethod.SelfDraw]: '自摸',
  [WinMethod.Discard]: '放槍',
}
const LAST_TILE_LABELS: Partial<Record<LastTile, string>> = {
  [LastTile.Sea]: '海底撈月',
  [LastTile.River]: '河底撈魚',
}
const BLESSING_LABELS: Partial<Record<Blessing, string>> = {
  [Blessing.Heaven]: '天胡',
  [Blessing.Earth]: '地胡',
  [Blessing.Human]: '人胡',
}
const READY_DECLARATION_LABELS: Partial<Record<ReadyDeclaration, string>> = {
  [ReadyDeclaration.Heaven]: '天聽',
  [ReadyDeclaration.Earth]: '地聽',
  [ReadyDeclaration.Migi]: '咪幾',
}
const FLOWER_WIN_LABELS: Partial<Record<FlowerWin, string>> = {
  [FlowerWin.SevenRobOne]: '七搶一',
  [FlowerWin.EightImmortals]: '八仙過海',
}
const STAKE_PRESETS: Stakes[] = [
  { base: 30, perTai: 10 },
  { base: 50, perTai: 20 },
  { base: 100, perTai: 20 },
  { base: 100, perTai: 50 },
]

const MODE_LABELS: Record<ScoringMode, string> = {
  [ScoringMode.Automatic]: '自動（輸入手牌）',
  [ScoringMode.Manual]: '手動勾選',
}
/** 同組單選嘅台種列表。 */
const SINGLE_GROUPS: { label: string, key: ManualGroup, options: Tai[] }[] = [
  { label: '門前', key: ManualGroup.Front, options: [Tai.MenQing, Tai.QuanQiuRen, Tai.BanQiuRen] },
  { label: '獨聽', key: ManualGroup.LoneWait, options: [Tai.BianZhang, Tai.QianZhang, Tai.DanDiao] },
  { label: '一色', key: ManualGroup.Colour, options: [Tai.HunYiSe, Tai.QingYiSe, Tai.ZiYiSe] },
  { label: '暗刻', key: ManualGroup.ConcealedPungs, options: [Tai.SanAnKe, Tai.SiAnKe, Tai.WuAnKe] },
  { label: '三元', key: ManualGroup.Dragons, options: [Tai.XiaoSanYuan, Tai.DaSanYuan] },
  { label: '四喜', key: ManualGroup.Winds, options: [Tai.XiaoSiXi, Tai.DaSiXi] },
]

const { hand } = useHand()
const { mode, selection } = useScoringMode()
const isManual = computed(() => mode.value === ScoringMode.Manual)
const resetSelection = () => { selection.value = emptyManualSelection() }
const situation = useSituation()
const stakes = useStakes()

const isComplete = computed(() => handSize(hand.value) === HAND_SIZE)
const waitingTiles = computed(() => analyseWaits(hand.value).map(wait => wait.tile))
const isWaiting = computed(() => waitingTiles.value.length > 0)
watch(waitingTiles, (tiles) => {
  if (tiles.length && !tiles.includes(situation.value.winningTile)) situation.value.winningTile = tiles[0]!
}, { immediate: true })
const automaticScore = computed(() => (isComplete.value ? scoreHand(hand.value, situation.value) : null))
const score = computed(() => (isManual.value ? scoreManual(selection.value, situation.value) : automaticScore.value))
const settlement = computed(() => (score.value ? settle(stakes.value, score.value.total, effectiveWinMethod(situation.value)) : null))
const isPreset = (preset: Stakes) => preset.base === stakes.value.base && preset.perTai === stakes.value.perTai
const isSelfDraw = computed(() => effectiveWinMethod(situation.value) === WinMethod.SelfDraw)
</script>

<template>
  <div class="flex flex-col gap-6 pb-28">
    <div class="segmented">
      <button v-for="(label, value) in MODE_LABELS" :key="value" type="button" :class="{ 'segmented-active': mode === value }" @click="mode = value">{{ label }}</button>
    </div>

    <section class="flex flex-col gap-2">
      <div class="section-label">1. 玩多大？（底 / 台）</div>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="preset in STAKE_PRESETS"
          :key="`${preset.base}/${preset.perTai}`"
          type="button"
          class="choice whitespace-nowrap text-sm px-1"
          :class="{ 'choice-active': isPreset(preset) }"
          @click="stakes = { ...preset }"
        >
          {{ preset.base }} / {{ preset.perTai }}
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="input w-full bg-base-100">
          <span class="label">底</span>
          <input v-model.number="stakes.base" type="number" min="0" inputmode="numeric">
        </label>
        <label class="input w-full bg-base-100">
          <span class="label">台</span>
          <input v-model.number="stakes.perTai" type="number" min="0" inputmode="numeric">
        </label>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <div class="section-label">2. 胡牌方式</div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="(label, method) in WIN_METHOD_LABELS"
          :key="method"
          type="button"
          class="choice"
          :class="{ 'choice-active': situation.winMethod === method }"
          @click="situation.winMethod = method"
        >
          {{ label }}
        </button>
      </div>
    </section>

    <section v-if="!isManual" class="flex flex-col gap-2">
      <div class="section-label">3. 胡的牌</div>
      <div v-if="!waitingTiles.length" class="text-sm opacity-60">手牌尚未聽牌，沒有可選的牌</div>
      <div v-else class="flex flex-wrap gap-1.5">
        <button
          v-for="tile in waitingTiles"
          :key="tile"
          type="button"
          class="tile-button h-11 w-8"
          :aria-pressed="tile === situation.winningTile"
          @click="situation.winningTile = tile"
        >
          <TileFace :tile="tile" />
          <span v-if="tile === situation.winningTile" class="tile-count">✓</span>
        </button>
      </div>
    </section>

    <section v-if="isManual" class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div class="section-label">3. 勾選台種</div>
        <button type="button" class="text-sm opacity-60" @click="resetSelection">清除</button>
      </div>
      <div v-for="group in SINGLE_GROUPS" :key="group.key" class="flex flex-col gap-1.5">
        <div class="section-label">{{ group.label }}</div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="tai in group.options"
            :key="tai"
            type="button"
            class="choice"
            :class="{ 'choice-active': selection.groups[group.key] === tai }"
            @click="selection.groups[group.key] = selection.groups[group.key] === tai ? undefined : tai"
          >
            {{ tai }}
            <span class="choice-sub">{{ TAI_VALUES[tai] }} 台</span>
          </button>
          <TaiStepper v-if="group.key === ManualGroup.Dragons" v-model="selection.dragonPungs" :tai="Tai.SanYuanKe" :max="MAX_DRAGON_PUNGS" />
          <template v-if="group.key === ManualGroup.Winds">
            <button type="button" class="choice" :class="{ 'choice-active': selection.seatWindPung }" @click="selection.seatWindPung = !selection.seatWindPung">{{ Tai.MenFengKe }}<span class="choice-sub">{{ TAI_VALUES[Tai.MenFengKe] }} 台</span></button>
            <button type="button" class="choice" :class="{ 'choice-active': selection.roundWindPung }" @click="selection.roundWindPung = !selection.roundWindPung">{{ Tai.QuanFengKe }}<span class="choice-sub">{{ TAI_VALUES[Tai.QuanFengKe] }} 台</span></button>
          </template>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <div class="section-label">牌型</div>
        <div class="grid grid-cols-3 gap-2">
          <button type="button" class="choice" :class="{ 'choice-active': selection.pingHu }" @click="selection.pingHu = !selection.pingHu">{{ Tai.PingHu }}<span class="choice-sub">{{ TAI_VALUES[Tai.PingHu] }} 台</span></button>
          <button type="button" class="choice" :class="{ 'choice-active': selection.pengPengHu }" @click="selection.pengPengHu = !selection.pengPengHu">{{ Tai.PengPengHu }}<span class="choice-sub">{{ TAI_VALUES[Tai.PengPengHu] }} 台</span></button>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <div class="section-label">花</div>
        <div class="grid grid-cols-3 gap-2">
          <TaiStepper v-model="selection.seatFlowers" :tai="Tai.ZhengHua" :max="MAX_SEAT_FLOWERS" />
          <TaiStepper v-model="selection.flowerKongs" :tai="Tai.HuaGang" :max="MAX_FLOWER_KONGS" />
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-2">
        <div class="section-label">4. 圈風</div>
        <div class="grid grid-cols-4 gap-1.5">
          <button v-for="(label, wind) in WIND_LABELS" :key="wind" type="button" class="choice min-h-11 px-0" :class="{ 'choice-active': situation.roundWind === Number(wind) }" @click="situation.roundWind = Number(wind)">{{ label }}</button>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <div class="section-label">5. 門風</div>
        <div class="grid grid-cols-4 gap-1.5">
          <button v-for="(label, wind) in WIND_LABELS" :key="wind" type="button" class="choice min-h-11 px-0" :class="{ 'choice-active': situation.seatWind === Number(wind) }" @click="situation.seatWind = Number(wind)">{{ label }}</button>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <div class="section-label">6. 局面</div>
      <div class="grid grid-cols-3 gap-2">
        <button type="button" class="choice" :class="{ 'choice-active': situation.isDealer }" @click="situation.isDealer = !situation.isDealer">
          莊家
          <span class="choice-sub">{{ situation.isDealer && situation.dealerStreak ? `連 ${situation.dealerStreak}` : '1 台' }}</span>
        </button>
        <button type="button" class="choice" :class="{ 'choice-active': situation.isKongReplacement }" @click="situation.isKongReplacement = !situation.isKongReplacement">
          槓上開花
          <span class="choice-sub">含自摸</span>
        </button>
        <button type="button" class="choice" :class="{ 'choice-active': situation.isRobbingKong }" @click="situation.isRobbingKong = !situation.isRobbingKong">
          搶槓
          <span class="choice-sub">1 台</span>
        </button>
      </div>
      <label v-if="situation.isDealer" class="input w-full bg-base-100">
        <span class="label">連莊次數</span>
        <input v-model.number="situation.dealerStreak" type="number" min="0" inputmode="numeric">
      </label>
    </section>

    <section class="flex flex-col gap-2">
      <div class="section-label">海底 / 河底</div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="(label, value) in LAST_TILE_LABELS" :key="value" type="button" class="choice" :class="{ 'choice-active': situation.lastTile === value }" @click="situation.lastTile = situation.lastTile === value ? LastTile.None : value">{{ label }}</button>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <div class="section-label">天地人胡</div>
      <div class="grid grid-cols-3 gap-2">
        <button v-for="(label, value) in BLESSING_LABELS" :key="value" type="button" class="choice" :class="{ 'choice-active': situation.blessing === value }" @click="situation.blessing = situation.blessing === value ? Blessing.None : value">{{ label }}</button>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <div class="section-label">聽牌宣告</div>
      <div class="grid grid-cols-3 gap-2">
        <button v-for="(label, value) in READY_DECLARATION_LABELS" :key="value" type="button" class="choice" :class="{ 'choice-active': situation.readyDeclaration === value }" @click="situation.readyDeclaration = situation.readyDeclaration === value ? ReadyDeclaration.None : value">{{ label }}</button>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <div class="section-label">花牌胡</div>
      <div class="grid grid-cols-2 gap-2">
        <button v-for="(label, value) in FLOWER_WIN_LABELS" :key="value" type="button" class="choice" :class="{ 'choice-active': situation.flowerWin === value }" @click="situation.flowerWin = situation.flowerWin === value ? FlowerWin.None : value">{{ label }}</button>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <div class="section-label">台數明細</div>
      <div class="panel px-4 py-2">
        <div v-if="!isManual && !isComplete" class="py-2 text-sm opacity-60">手牌要滿 {{ HAND_SIZE }} 張才能算台，請到「聽牌」頁輸入手牌。</div>
        <div v-else-if="!isManual && !isWaiting" class="py-2 text-sm text-error">手牌尚未聽牌，無法算台。</div>
        <div v-else-if="!isManual && !score" class="py-2 text-sm text-error">沒胡：{{ tileName(situation.winningTile) }} 無法和手牌組成五組面子加一對將。</div>
        <ul v-else-if="score && score.lines.length" class="divide-y divide-base-300">
          <li v-for="(line, i) in score.lines" :key="i" class="flex justify-between py-2">
            <span>{{ line.name }}</span>
            <span class="tabular-nums">{{ line.tai }} 台</span>
          </li>
        </ul>
        <div v-else class="py-2 text-sm opacity-60">沒有台，只算底</div>
      </div>
    </section>

    <details v-if="!isManual" class="collapse collapse-arrow panel">
      <summary class="collapse-title font-medium">修改手牌</summary>
      <div class="collapse-content">
        <HandInput />
      </div>
    </details>

    <div class="fixed inset-x-0 bottom-0 border-t border-base-300 bg-base-100/95 backdrop-blur">
      <div class="max-w-lg mx-auto px-4 py-3 flex items-end justify-between">
        <div>
          <div class="section-label">總台數</div>
          <div class="text-2xl font-bold" :class="{ 'text-primary': score }">{{ score ? `${score.total} 台` : '—' }}</div>
        </div>
        <div class="text-right">
          <div class="section-label">{{ isSelfDraw ? '自摸三家各付' : '放槍付' }}</div>
          <div class="text-2xl font-bold" :class="settlement ? 'text-success' : ''">{{ settlement ? `$${settlement.perPayer}` : '—' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
