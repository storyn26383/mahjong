# 09 — 發佈

**What to build:** 推上 GitHub 後自動部署到 GitHub Pages，手機開網址即用，並且可以 Add to Home Screen。

**Blocked by:** 01 — 項目骨架

**Status:** done

- [x] GitHub Actions workflow：Bun 安裝、`nuxi generate`、部署到 Pages
- [x] Base path 由 `NUXT_APP_BASE_URL` 環境變數決定，預設 `/`
- [x] Web manifest 有名稱、圖示、獨立顯示模式
- [x] 本地用靜態伺服器打開輸出目錄驗證路由同資源路徑正確
