<script setup lang="ts">
import { isValidHand, MeldKind } from '~~/engine/hand'
import { adjustCrop, CropHandle, FULL_CROP, LOW_CONFIDENCE, MeldRow, readPhoto, type Box, type Detection, type Point } from '~~/engine/photo'
import { ALL_TILES, tileName, type Tile } from '~~/engine/tile'

enum Status {
  Idle = 'idle',
  Cropping = 'cropping',
  Reading = 'reading',
  Reviewing = 'reviewing',
  Failed = 'failed',
}

const MELD_LABELS: Record<MeldKind, string> = {
  [MeldKind.Chow]: '吃',
  [MeldKind.Pung]: '碰',
  [MeldKind.OpenKong]: '明槓',
  [MeldKind.ConcealedKong]: '暗槓',
}
const PERCENT = 100
/** 四角同四邊；成個框移動由框本身處理。 */
const EDGE_HANDLES = Object.values(CropHandle).filter(handle => handle !== CropHandle.Move)

const { $tileDetector } = useNuxtApp()
const { replace } = useHand()
const { lock: lockScroll, unlock: unlockScroll } = useScrollLock()

const fileInput = ref<HTMLInputElement>()
const dialog = ref<HTMLDialogElement>()
const status = ref(Status.Idle)
/** 原相，用嚟裁剪 */
const originalUrl = ref('')
const original = ref<Blob>()
const cropArea = ref<HTMLElement>()
const cropBox = ref<Box>(FULL_CROP)
const dragging = ref<{ handle: CropHandle, last: Point }>()
/** 裁剪後送去辨識嘅相 */
const photoUrl = ref('')
const photoSize = ref({ width: 1, height: 1 })
const detections = ref<Detection[]>([])
const meldRow = ref(MeldRow.Top)
const editing = ref<number>()

const reading = computed(() => readPhoto(detections.value, meldRow.value))
const isValid = computed(() => isValidHand(reading.value.hand))

const isCropped = computed(() => cropBox.value.width < 1 || cropBox.value.height < 1)

/** 將框（以 width × height 為單位）轉做相對相片嘅百分比位置。 */
const percentStyle = (box: Box, width = 1, height = 1) => ({
  left: `${box.x / width * PERCENT}%`,
  top: `${box.y / height * PERCENT}%`,
  width: `${box.width / width * PERCENT}%`,
  height: `${box.height / height * PERCENT}%`,
})
const boxStyle = ({ box }: Detection) => percentStyle(box, photoSize.value.width, photoSize.value.height)
const isUnsure = (detection: Detection) => detection.confidence < LOW_CONFIDENCE
const boxClass = (detection: Detection, index: number): string => {
  if (editing.value === index) return 'border-primary bg-primary/30'
  return isUnsure(detection) ? 'border-warning bg-warning/30' : 'border-neutral bg-neutral/10'
}

/** 手指位置，以照片闊高為 1。 */
const pointIn = (event: PointerEvent): Point => {
  const rect = cropArea.value!.getBoundingClientRect()
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
}
const startDrag = (handle: CropHandle, event: PointerEvent) => {
  cropArea.value!.setPointerCapture(event.pointerId)
  dragging.value = { handle, last: pointIn(event) }
}
const moveDrag = (event: PointerEvent) => {
  if (!dragging.value) return
  const point = pointIn(event)
  cropBox.value = adjustCrop(cropBox.value, dragging.value.handle, point.x - dragging.value.last.x, point.y - dragging.value.last.y)
  dragging.value.last = point
}
const endDrag = () => { dragging.value = undefined }
const resetCrop = () => { cropBox.value = FULL_CROP }
const crop = () => { status.value = Status.Cropping }

const open = () => fileInput.value?.click()

const read = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const photo = input.files?.[0]
  input.value = ''
  if (!photo) return
  URL.revokeObjectURL(originalUrl.value)
  original.value = photo
  originalUrl.value = URL.createObjectURL(photo)
  resetCrop()
  crop()
  dialog.value?.showModal()
  lockScroll()
}

/** 只辨識揀咗嘅範圍；冇揀就用整張相。 */
const detect = async () => {
  status.value = Status.Reading
  try {
    const full = await createImageBitmap(original.value!)
    const area = cropBox.value
    const bitmap = await createImageBitmap(full, area.x * full.width, area.y * full.height, area.width * full.width, area.height * full.height)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    URL.revokeObjectURL(photoUrl.value)
    photoUrl.value = URL.createObjectURL(await canvas.convertToBlob({ type: 'image/jpeg' }))
    const result = await $tileDetector.detect(bitmap)
    detections.value = result.detections
    photoSize.value = { width: result.width, height: result.height }
    status.value = Status.Reviewing
  }
  catch {
    status.value = Status.Failed
  }
}

const swapRows = () => {
  meldRow.value = meldRow.value === MeldRow.Top ? MeldRow.Bottom : MeldRow.Top
}
const replaceTile = (tile: Tile) => {
  detections.value[editing.value!]!.tile = tile
  editing.value = undefined
}
const removeTile = () => {
  detections.value.splice(editing.value!, 1)
  editing.value = undefined
}
const close = () => {
  editing.value = undefined
  dialog.value?.close()
}
const confirm = () => {
  replace(reading.value.hand)
  close()
}
</script>

<template>
  <button type="button" class="text-sm opacity-60" @click="open">拍照</button>
  <input ref="fileInput" type="file" accept="image/*" hidden @change="read">

  <dialog ref="dialog" class="modal modal-bottom sm:modal-middle" @close="unlockScroll">
    <div class="modal-box flex flex-col gap-4 max-h-[92dvh]">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold">拍照辨識</h3>
        <button type="button" class="text-sm opacity-60" @click="close">取消</button>
      </div>

      <template v-if="status === Status.Cropping">
        <p class="text-sm opacity-60">拖動四角或四邊調整範圍，只辨識框內的牌。</p>
        <div
          ref="cropArea"
          class="relative touch-none select-none overflow-hidden rounded-lg"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <img :src="originalUrl" alt="原始照片" class="block w-full pointer-events-none" draggable="false">
          <div class="crop-frame absolute" :style="percentStyle(cropBox)" @pointerdown="startDrag(CropHandle.Move, $event)">
            <div v-if="dragging" class="crop-grid" />
            <span
              v-for="handle in EDGE_HANDLES"
              :key="handle"
              class="crop-handle"
              :data-handle="handle"
              @pointerdown.stop="startDrag(handle, $event)"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="choice" :disabled="!isCropped" @click="resetCrop">重設</button>
          <button type="button" class="choice choice-active" @click="detect">辨識</button>
        </div>
      </template>
      <div v-else-if="status === Status.Reading" class="py-10 text-center opacity-60">
        <span class="loading loading-spinner" />
        <p class="mt-2 text-sm">辨識中，第一次使用要下載模型，需時較長。</p>
      </div>
      <div v-else-if="status === Status.Failed" class="py-6 text-center text-error">辨識失敗，請再試一次。</div>

      <template v-else-if="status === Status.Reviewing">
        <div class="flex items-center justify-between">
          <p class="text-sm opacity-60">點框可以改正或刪除認錯的牌，黃框是沒把握的。</p>
          <button type="button" class="text-sm opacity-60 shrink-0" @click="crop">重新裁剪</button>
        </div>
        <div class="relative">
          <img :src="photoUrl" alt="手牌照片" class="block w-full rounded-lg">
          <button
            v-for="(detection, index) in detections"
            :key="index"
            type="button"
            class="absolute rounded border-2"
            :class="boxClass(detection, index)"
            :style="boxStyle(detection)"
            :aria-label="`改正 ${tileName(detection.tile)}`"
            @click="editing = index"
          >
            <span class="absolute -top-5 left-0 rounded px-1 text-[10px] leading-4 whitespace-nowrap" :class="isUnsure(detection) ? 'bg-warning text-warning-content' : 'bg-neutral text-neutral-content'">{{ tileName(detection.tile) }}</span>
          </button>
        </div>

        <div v-if="editing !== undefined" class="panel p-2 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="section-label">改成</span>
            <button type="button" class="text-sm text-error" @click="removeTile">刪除這隻</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="tile in ALL_TILES" :key="tile" type="button" class="tile-button h-11 w-8" @click="replaceTile(tile)">
              <TileFace :tile="tile" />
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <span class="section-label">吃碰槓在{{ meldRow === MeldRow.Top ? '上' : '下' }}行</span>
          <button type="button" class="text-sm opacity-60" @click="swapRows">上下對調</button>
        </div>
        <div class="section-label">吃碰槓</div>
        <p v-if="!reading.hand.melds.length" class="text-sm opacity-40">沒有</p>
        <div v-else class="flex flex-wrap gap-2">
          <div v-for="(meld, index) in reading.hand.melds" :key="index" class="flex flex-col items-center gap-0.5">
            <div class="flex gap-0.5 rounded-lg bg-base-200 px-1">
              <TileFace v-for="(tile, tileIndex) in meld.tiles" :key="tileIndex" :tile="tile" />
            </div>
            <span class="text-xs opacity-60">{{ MELD_LABELS[meld.kind] }}</span>
          </div>
        </div>
        <div class="section-label">手牌</div>
        <p v-if="!reading.hand.concealed.length" class="text-sm opacity-40">沒有</p>
        <div v-else class="flex flex-wrap gap-1">
          <TileFace v-for="(tile, index) in reading.hand.concealed" :key="index" :tile="tile" />
        </div>
        <div class="section-label">花</div>
        <p v-if="!reading.hand.flowers.length" class="text-sm opacity-40">沒有</p>
        <div v-else class="flex flex-wrap gap-1">
          <TileFace v-for="(tile, index) in reading.hand.flowers" :key="index" :tile="tile" />
        </div>
        <p v-if="reading.unmatched.length" class="text-sm text-warning">有 {{ reading.unmatched.length }} 組牌湊不成吃碰槓，已放入手牌。暗槓蓋住的牌請確認後在下方補回。</p>
        <p v-if="!isValid" class="text-sm text-error">牌數超過 17 張或同一隻牌超過 4 張，請先改正。</p>

        <button type="button" class="choice choice-active" :disabled="!isValid" @click="confirm">用這副手牌</button>
      </template>
    </div>
    <form method="dialog" class="modal-backdrop"><button @click="editing = undefined">close</button></form>
  </dialog>
</template>
