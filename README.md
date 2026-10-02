# 臺灣麻將小工具

臺灣 16 張麻將（有花）嘅手機瀏覽器小工具，唔使安裝、冇後端、所有資料只存喺本機。三個功能：

- **開門**：揀 3 顆骰子點數，畫出俯瞰牌桌。開門嗰面標「東」，其餘逆時針補南西北；由開始取牌嗰兩墩起漸淡，一眼睇到取牌位置同方向（順時針）。
- **聽牌**：用牌面按鈕輸入手牌（手牌、吃、碰、明槓、暗槓、花），入齊 16 張即列出聽咩牌；獨聽會標明邊張／嵌張／單吊。點聽嘅牌直接跳去算台。入牌區有「拍照」掣，影一張相（可以先拉框裁剪）就自動認出手牌、吃碰槓同花，認錯可以喺相片上點框改正（模型喺手機本機跑，唔使上網或者 key）。入咗 17 張就改為列出「打一張聽牌」：打邊張之後聽咩牌，聽嘅種數多排前；點打嘅牌直接打出，點聽嘅牌打出並跳去算台。
- **算台**：兩個模式。
  - **自動**：用同一副手牌，揀胡的牌同局面，引擎自動判斷全部台種。
  - **手動勾選**：唔入手牌，直接勾台種（同組互斥），適合打牌時快速計。手牌未滿 16 張時預設用呢個模式。
  - 兩個模式共用底／台（30/10、50/20、100/20、100/50 或自訂）、自摸／放槍、莊家連莊、海底河底、槓上開花、搶槓、天地人胡、聽牌宣告、花牌胡；底部固定顯示總台數同每家要付幾多。

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
  tile.ts            牌嘅定義、名稱、排序
  hand.ts            手牌、副露、張數限制
  decompose.ts       拆牌：一對將 + 面子
  waits.ts           聽牌分析同獨聽類型
  discards.ts        17 張時建議打邊張
  scoring.ts         台數表、台種判定、複合規則（自動模式）
  manual-scoring.ts  手動勾選模式計台
  money.ts           底／台換算
  open-door.ts       擲骰開門
  photo.ts           相片認到嘅牌按位置分做手牌、副露、花
  yolo.ts            解讀 YOLO 模型輸出
app/       Nuxt 頁面同組件，只負責收集輸入、調用引擎、渲染輸出
  pages/             index（開門）、waits（聽牌）、score（算台）
  components/        HandInput（入牌）、PhotoImport（影相確認）、TileFace（牌面）、DieFace（骰子）、TaiStepper（可計數台種）
  plugins/           tile-detector：喺瀏覽器用 onnxruntime-web 跑認牌模型
  composables/       手牌、局面、底台、算台模式；usePersistedState 負責記入 localStorage
public/tiles/  42 個牌面 SVG
public/models/ 認牌模型 tiles.onnx
ml/            訓練認牌模型（Python，只限呢個目錄）
```

技術棧：Nuxt 4（SPA，`ssr: false`）、Tailwind 4 + daisyUI 5（內建 `autumn` 主題）、Bun。

## 訓練認牌模型

訓練用 Python + [Ultralytics](https://docs.ultralytics.com)，只喺 `ml/` 入面，app 本身唔用 Python。需要 [uv](https://docs.astral.sh/uv/)。

1. 喺 Roboflow 落載 [Jon Chan 嘅 Mahjong 資料集](https://universe.roboflow.com/jon-chan-gnsoa/mahjong-baq4s/dataset/83)（YOLOv8 格式 zip），解壓到 `ml/data/roboflow/extracted/`。
2. 安裝同訓練：

```sh
cd ml
uv venv .venv && uv pip install --python .venv/bin/python -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
.venv/bin/python train.py --epochs 25 --imgsz 640
.venv/bin/python export.py   # 匯出到 public/models/tiles.onnx
```

`ml/data/`、`ml/runs/`、`ml/.venv/` 唔入 git。

## 改台數

全部數值喺 `engine/scoring.ts` 嘅 `TAI_VALUES`；天地人胡嘅排除規則喺 `EXCLUDED_BY_BLESSING`，花牌胡強制嘅自摸／放槍喺 `FORCED_WIN_METHOD`。畫面上嘅台數標示直接讀呢啲表，改完跑 `bun test` 就得。

## 部署

推上 GitHub 之後，喺 repo Settings → Pages 揀 Source 為 **GitHub Actions**，`.github/workflows/deploy.yml` 會跑測試、build 同部署。預設 base path 係 `/`，適合自訂網域或者 `<user>.github.io` repo。

如果部署到 `<user>.github.io/<repo>/` 呢類子路徑，喺 Settings → Secrets and variables → Actions → Variables 加 `NUXT_APP_BASE_URL`，值係 `/<repo>/`。

其他靜態托管：`bun run generate` 之後托管 `.output/public`。手機瀏覽器開網址後可以 Add to Home Screen。

## 授權

程式碼用 [MIT](LICENSE)。

牌面 SVG 唔屬 MIT，來自 Wikimedia Commons，授權係 CC BY-SA 4.0，對照表見 [public/tiles/README.md](public/tiles/README.md)。骰子係本項目自己畫嘅 SVG。

認牌模型用 Jon Chan 嘅 [Mahjong 資料集](https://universe.roboflow.com/jon-chan-gnsoa/mahjong-baq4s)（Roboflow Universe，CC BY 4.0）訓練。

## 暫時唔做

雲端 AI 認牌、未聽牌時嘅打牌建議（向聽數、進張）、記分、其他麻將規則。詳見 [SPEC.md](SPEC.md) 嘅 Out of Scope。
