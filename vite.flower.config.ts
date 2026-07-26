import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 供花発注サイト（別ドメイン・別サーバーへ配置する静的サイト）専用のビルド設定。
// 出力先 dist-flower/ をそのままVPSのドキュメントルートへ配置する。
export default defineConfig({
    root: path.resolve(__dirname, 'flower'),
    // flower/public/ を静的アセットとして配信する（デモ用の商品画像など）
    publicDir: path.resolve(__dirname, 'flower/public'),
    server: {
        port: 3100,
        host: '0.0.0.0',
        fs: {
            // lib/ や types.ts など、リポジトリ共通のコードを参照するため
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
        outDir: path.resolve(__dirname, 'dist-flower'),
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
