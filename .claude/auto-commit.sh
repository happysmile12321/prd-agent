#!/bin/bash
# 自动备份脚本：有改动才提交
cd /workspaces/prd-agent
git add -A
if ! git diff --cached --quiet; then
  git commit -m "auto backup $(date '+%Y-%m-%d %H:%M')"
  git push origin main 2>/dev/null
fi
