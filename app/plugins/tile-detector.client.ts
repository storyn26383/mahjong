import type { InferenceSession } from 'onnxruntime-web'
import type { Box, Detection } from '~~/engine/photo'
import { decodeYolo, letterboxFor, medianTileWidth, mergeDetections, rotateBack, windowsForTileWidth } from '~~/engine/yolo'

/** 模型訓練時嘅輸入尺寸。 */
const MODEL_SIZE = 640
const CHANNELS = 3
const MAX_PIXEL = 255
/** 補邊用嘅灰色，同 Ultralytics 訓練時一致。 */
const PAD_COLOUR = 'rgb(114, 114, 114)'
/** 每格正放同轉 180 度各認一次，補返倒轉擺嘅牌。 */
const ORIENTATIONS = [false, true]

export interface PhotoDetection {
  detections: Detection[]
  width: number
  height: number
}

/** 將一格畫入 640 × 640 正方形（可以轉 180 度），轉做 [1, 3, 640, 640] 嘅 0 至 1 浮點數。 */
const toInput = (bitmap: ImageBitmap, window: Box, isRotated: boolean) => {
  const letterbox = letterboxFor(window.width, window.height, MODEL_SIZE)
  const canvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE)
  const context = canvas.getContext('2d')!
  context.fillStyle = PAD_COLOUR
  context.fillRect(0, 0, MODEL_SIZE, MODEL_SIZE)
  if (isRotated) context.setTransform(-1, 0, 0, -1, MODEL_SIZE, MODEL_SIZE)
  context.drawImage(bitmap, window.x, window.y, window.width, window.height, letterbox.padX, letterbox.padY, window.width * letterbox.scale, window.height * letterbox.scale)
  const { data } = context.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE)
  const pixels = MODEL_SIZE * MODEL_SIZE
  const input = new Float32Array(CHANNELS * pixels)
  for (let pixel = 0; pixel < pixels; pixel++) {
    input[pixel] = data[pixel * 4]! / MAX_PIXEL
    input[pixels + pixel] = data[pixel * 4 + 1]! / MAX_PIXEL
    input[2 * pixels + pixel] = data[pixel * 4 + 2]! / MAX_PIXEL
  }
  return { input, letterbox }
}

/** 由一格嘅座標移返原相座標。 */
const offset = (detection: Detection, window: Box): Detection =>
  ({ ...detection, box: { ...detection.box, x: detection.box.x + window.x, y: detection.box.y + window.y } })

/** 認牌器：第一次用先下載 runtime 同模型，之後重用同一個 session。 */
export default defineNuxtPlugin(() => {
  const { app } = useRuntimeConfig()
  let session: Promise<InferenceSession> | undefined

  const loadSession = async (): Promise<InferenceSession> => {
    const ort = await import('onnxruntime-web/wasm')
    // GitHub Pages 唔可以設 cross-origin isolation header，用唔到多線程
    ort.env.wasm.numThreads = 1
    return ort.InferenceSession.create(`${app.baseURL}models/tiles.onnx`, { executionProviders: ['wasm'] })
  }

  const detect = async (bitmap: ImageBitmap): Promise<PhotoDetection> => {
    session ??= loadSession()
    const model = await session
    const { Tensor } = await import('onnxruntime-web/wasm')
    const runOnce = async (window: Box, isRotated: boolean): Promise<Detection[]> => {
      const { input, letterbox } = toInput(bitmap, window, isRotated)
      const outputs = await model.run({ [model.inputNames[0]!]: new Tensor('float32', input, [1, CHANNELS, MODEL_SIZE, MODEL_SIZE]) })
      const found = decodeYolo(outputs[model.outputNames[0]!]!.data as Float32Array, letterbox)
      return found.map(detection => offset(isRotated ? rotateBack(detection, window.width, window.height) : detection, window))
    }
    // 先成張認一次，量出牌有幾大，再按牌嘅大細切窗口正反各認一次
    const whole = { x: 0, y: 0, width: bitmap.width, height: bitmap.height }
    const firstPass = await runOnce(whole, false)
    const windows = firstPass.length ? windowsForTileWidth(bitmap.width, bitmap.height, medianTileWidth(firstPass), MODEL_SIZE) : []
    const runs = windows.flatMap(window => ORIENTATIONS.map(isRotated => ({ window, isRotated })))
    // 一次跑一格，onnxruntime-web 單線程同時跑幾個都唔會快啲
    const results: Detection[][] = [firstPass]
    for (const run of runs) results.push(await runOnce(run.window, run.isRotated))
    return { detections: mergeDetections(results), width: bitmap.width, height: bitmap.height }
  }

  return { provide: { tileDetector: { detect } } }
})
