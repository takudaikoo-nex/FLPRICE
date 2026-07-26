#!/usr/bin/env bash
# ================================================
# 供花発注サイト デプロイスクリプト
#
#   使い方:
#     DEPLOY_HOST=203.0.113.10 DEPLOY_USER=deploy ./deploy/flower/deploy.sh
#
#   環境変数:
#     DEPLOY_HOST  接続先ホスト（IPまたはホスト名）※必須
#     DEPLOY_USER  SSHユーザー名（既定: deploy）
#     DEPLOY_PATH  配置先ディレクトリ（既定: /var/www/flower）
#     DEPLOY_PORT  SSHポート（既定: 22）
#     SKIP_BUILD   1 を指定するとビルドを省略
# ================================================

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/flower}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"

if [ -z "${DEPLOY_HOST:-}" ]; then
    echo "エラー: DEPLOY_HOST が設定されていません" >&2
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_DIR="$REPO_ROOT/dist-flower"

cd "$REPO_ROOT"

# ---- ビルド ----
if [ "${SKIP_BUILD:-0}" != "1" ]; then
    echo "==> ビルドしています..."
    npm run build:flower
fi

if [ ! -f "$DIST_DIR/index.html" ]; then
    echo "エラー: $DIST_DIR/index.html が見つかりません" >&2
    exit 1
fi

# ---- 確認 ----
echo
echo "  配置元: $DIST_DIR"
echo "  配置先: ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH} (port ${DEPLOY_PORT})"
echo
read -r -p "この内容でデプロイしますか？ [y/N] " answer
case "$answer" in
    [yY]) ;;
    *) echo "中止しました"; exit 0 ;;
esac

# ---- 転送 ----
if command -v rsync > /dev/null 2>&1; then
    echo "==> rsync で転送しています..."
    rsync -avz --delete \
        -e "ssh -p ${DEPLOY_PORT}" \
        "$DIST_DIR/" \
        "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
else
    # Windows の Git Bash には rsync が無いことが多いためのフォールバック。
    # --delete 相当の処理として、転送前に配置先を空にする。
    echo "==> rsync が無いため scp で転送しています..."
    ssh -p "${DEPLOY_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
        "mkdir -p '${DEPLOY_PATH}' && rm -rf '${DEPLOY_PATH}'/*"
    scp -P "${DEPLOY_PORT}" -r "$DIST_DIR"/* \
        "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
fi

echo
echo "==> 完了しました"
