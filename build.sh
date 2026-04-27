#!/bin/bash
# OASIS Magazine - Netlify Build Script
# React 어드민 빌드 + 매거진 정적 파일 병합

echo "🔨 React 어드민 앱 빌드 중..."
npm run build

echo "📋 React 앱을 admin.html로 변환..."
# React 빌드 결과물의 index.html을 admin.html로 복사
cp build/index.html build/admin.html

echo "📋 매거진 프론트엔드 복원..."
# 매거진 index.html로 루트 덮어쓰기
cp index.html build/index.html

# 이미지 등 정적 에셋
cp bear.png build/bear.png 2>/dev/null || true

echo "✅ 빌드 완료! admin.html = React 어드민 앱"
