#!/bin/bash
# 后台定时自动提交，每30分钟执行一次
# 用法：bash .claude/watch-commit.sh &
REPO=/workspaces/prd-agent
INTERVAL=1800  # 30分钟

echo "🔄 自动备份已启动，每${INTERVAL}秒提交一次..."
while true; do
  sleep $INTERVAL
  cd "$REPO"
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "auto backup $(date '+%Y-%m-%d %H:%M')"
    git push origin main 2>/dev/null && echo "✅ $(date '+%H:%M') 已备份" || echo "⚠️ push失败"
  fi
done
