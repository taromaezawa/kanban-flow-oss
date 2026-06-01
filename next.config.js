/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 動的ページ(force-dynamic の /board や /tasks/[id])のクライアント側 Router Cache を無効化。
    // これが無いと、作成/編集後にクライアント遷移で戻った際、変更前の古いRSCが再利用され
    // タスクが表示されない（ハードリロードでのみ最新になる）バグが起きる。
    staleTimes: { dynamic: 0 },
  },
}

module.exports = nextConfig
