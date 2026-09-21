# 01 — 項目骨架

**What to build:** 打開網址見到一個手機優先嘅單頁 app，底部有「開門」「聽牌」「計台」三個 tab，切換時顯示對應嘅空頁。開發者可以用 `bun test` 跑一個 smoke test，用 `nuxi generate` 出到可以直接托管嘅靜態檔。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Nuxt 項目以 Bun 管理套件，`ssr` 關閉
- [ ] Tailwind + daisyUI 生效，tab 用 daisyUI class
- [ ] 三個 page 各自可以由底部 tab 導航到
- [ ] 規則引擎目錄存在，有一個純 TS 模組同一個 `bun test` 通過嘅 smoke test
- [ ] `nuxi generate` 成功，輸出目錄可以用靜態伺服器打開
- [ ] 介面文字繁體中文
