#!/bin/bash
# OASIS Magazine - Netlify Build Script
# React 어드민 빌드 + 매거진 정적 파일 병합

echo "🔨 React 어드민 앱 빌드 중..."
npm run build

echo "📋 React 관리자 앱을 admin.html로 분리..."
cp build/index.html build/admin.html

echo "📋 공개 매거진은 기존 정적 UI로 복원..."
cp index.html build/index.html

# 이미지 등 정적 에셋
cp bear.png build/bear.png 2>/dev/null || true

echo "✅ 빌드 완료! 공개 매거진(/)은 기존 UI, 관리자(/admin.html)는 React 앱입니다."
