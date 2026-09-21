# CLAUDE.md

臺灣 16 張麻將小工具（開門、聽牌、算台）。規格喺 `SPEC.md`，票喺 `.scratch/mahjong/issues/`。

## 指令

```sh
bun install
bun run dev        # 開發伺服器
bun test           # 只測 engine/
bun run typecheck  # vue-tsc
bun run generate   # 靜態輸出到 .output/public
```

## 架構

- `engine/`：純 TypeScript 規則引擎，冇 Vue、冇瀏覽器 API。三個公開入口：`openDoor`、`analyseWaits`、`scoreHand`／`scoreManual`。所有規則改動要有 `bun test`。
- `app/`：Nuxt 4 SPA（`ssr: false`），Tailwind 4 + daisyUI 5，內建主題 `autumn`。頁面只收集輸入、調用引擎、渲染輸出，唔放規則邏輯。
- 手牌、局面、底台、算台模式用 `useState` 加 `usePersistedState`（localStorage）跨頁共用。
- 台數表喺 `engine/scoring.ts` 嘅 `TAI_VALUES`；複合排除喺 `EXCLUDED_BY_BLESSING` 同 `FORCED_WIN_METHOD`。數值係用戶拍板嘅，唔好自行改。

## 規則要點（唔好重新爭論）

- 台數以 shifu.tw 為藍本；字一色 16、天胡 24、花槓 2、底 50／台 20 預設。
- 攞牌方向順時針（出牌次序逆時針）。
- 開門圖以擲骰者為基準，冇座位選擇；開門嗰面標東，逆時針補南西北。
- 槓上開花、八仙過海強制自摸；七搶一強制放槍。
- 影相認牌唔喺範圍內；引擎收 `Hand` 物件，將來只需多一個來源。

## 介面文案

- 畫面文字用臺灣正體（骰子、算台、還差、沒胡、取牌、牌牆），唔用粵語；「臺灣」唔寫「台灣」。
- 對話同代碼註解可以用粵語。
- 選項用白色卡片按鈕，選中用 `--color-neutral`；強調文字用 `text-primary`；唔顯示 focus outline。
- 同組互斥選項用 toggle，冇「無」選項，再點一次取消。
- 牌面按鈕固定 32 × 44 px，尺寸寫喺 `TileFace` 嘅 `<img>` 上，唔靠父層（Safari 會亂放大）。

## 素材

- `public/tiles/` 42 個 SVG 來自 Wikimedia Commons，CC BY-SA 4.0，對照表喺 `public/tiles/README.md`，有 `width`／`height` 屬性，唔好用 svgo 移除。
- Wikimedia 對批量落原檔會 429，Retry-After 10 分鐘且每次重試重設；要重新落就用 vendor 副本或者隔好耐先一隻。
- 骰子係 `DieFace.vue` 自己畫嘅 SVG；牌桌絨布同牌墩顏色刻意寫死，唔跟主題。

## 工作方式

- 同一樣嘢嘅連續修改用 `git commit --amend` 疊入同一個 commit，唔好一步一個 commit。
- 改檔案入面嘅中文時用 Bun script，唔好用 perl `-e`（會亂碼）。
- 用 `pkill -f` 停靜態伺服器時，唔好同起伺服器嘅命令放同一個 shell 命令入面（pattern 會 match 埋自己）。
- 部署 base path 由 GitHub repo variable `NUXT_APP_BASE_URL` 決定，預設 `/`。
