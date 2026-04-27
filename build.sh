#!/bin/bash
# OASIS Magazine - Netlify Build Script
# React 어드민 빌드 + 기존 매거진 정적 파일 병합

echo "🔨 React 어드민 앱 빌드 중..."
npm run build

echo "📋 매거진 정적 파일 복사..."
# 매거진 프론트엔드 (React 빌드의 index.html을 덮어씀)
cp index.html build/index.html

# 기존 어드민 (기존 admin.html도 유지 - React 버전은 /react-admin에서 접근)
cp admin.html build/admin.html

# 이미지 등 정적 에셋
cp bear.png build/bear.png 2>/dev/null || true

echo "✅ 빌드 완료!"
