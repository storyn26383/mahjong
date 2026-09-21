# 臺灣麻將小工具

臺灣 16 張麻將（有花）嘅手機瀏覽器小工具，唔使安裝、冇後端。三個功能：

- **開門**：入 3 顆骰點數同自己座位，畫出俯瞰牌山圖，標明開邊面山、由右邊數第幾墩、攞牌方向。
- **聽牌**：用牌面按鈕入 16 張手牌（分暗牌、副露、花），列出聽咩牌、每張係邊張／嵌張／單吊定雙洞，同埋仍有幾多張未見。
- **計台**：用同一副手牌加胡嘅張牌同局面選項，自動計出台數明細、總台數同金額。

台數表同複合規則以 [shifu.tw 麻將台數教學](https://shifu.tw/Course/ArticleDetail/18) 為藍本，各枱自訂部份嘅取值見 [SPEC.md](SPEC.md)。

## 開發

需要 [Bun](https://bun.sh)。

```sh
bun install
bun run dev        # 開發伺服器
bun test           # 規則引擎測試
bun run typecheck  # vue-tsc
bun run generate   # 輸出靜態檔到 .output/public
```

## 結構

```
engine/    純 TypeScript 規則引擎，冇 Vue 或瀏覽器依賴，bun test 測呢層
  tile.ts        牌嘅定義、名稱、排序
  hand.ts        手牌、副露、張數限制
  decompose.ts   拆牌：一對將 + 面子
  waits.ts       聽牌分析同獨聽類型
  scoring.ts     台數表、台種判定、複合規則
  money.ts       底／台換算
  open-door.ts   擲骰開門
app/       Nuxt 頁面同組件，只負責收集輸入、調用引擎、渲染輸出
  pages/         index（開門）、waits（聽牌）、score（計台）
  components/    HandInput（入牌）、TileFace（牌面）
  composables/   手牌、局面、底台設定，記 localStorage
```

技術棧：Nuxt（SPA，`ssr: false`）、Tailwind + daisyUI、Bun。

## 改台數

全部數值喺 `engine/scoring.ts` 嘅 `TAI_VALUES`；複合排除規則喺同一檔嘅 `EXCLUDED_BY_BLESSING` 同 `FORCED_WIN_METHOD`。改完跑 `bun test`。

## 部署

推上 GitHub 之後，喺 repo Settings → Pages 揀 Source 為 **GitHub Actions**。`.github/workflows/deploy.yml` 會用 repo 名做 base path（`NUXT_APP_BASE_URL=/<repo>/`）build 同部署。

本地或者其他靜態托管：

```sh
NUXT_APP_BASE_URL=/ bun run generate
```

然後托管 `.output/public`。手機瀏覽器開網址後可以 Add to Home Screen。

## 圖片授權

牌面 SVG 來自 Wikimedia Commons，CC BY-SA 4.0，對照表見 [public/tiles/README.md](public/tiles/README.md)。骰仔係本項目自己畫嘅 SVG。

## 暫時唔做

影相認牌、17 張打牌建議、記分、其他麻將規則。詳見 [SPEC.md](SPEC.md) 嘅 Out of Scope。
