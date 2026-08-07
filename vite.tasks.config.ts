import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// タスク進捗（喪主）サイト専用のビルド設定。
// 供花サイトと同じく、Supabase の鍵を持たない静的サイトとして別URLへ配信する。
// 出力先は dist-tasks/。
export default defineConfig({
    root: path.resolve(__dirname, 'tasks'),
    // 静的アセットは持たない（画像は見積システム側のカタログを見てもらう）
    publicDir: false,
    server: {
        port: 3200,
        host: '0.0.0.0',
        fs: {
            allow: [path.resolve(__dirname)],
        },
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
    build: {
        outDir: path.resolve(__dirname, 'dist-tasks'),
        emptyOutDir: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
        sourcemap: false,
    },
});
