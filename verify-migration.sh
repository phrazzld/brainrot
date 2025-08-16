#!/bin/bash

# Migration Verification Script
# Run this after each phase to ensure everything is on track

echo "🔍 Brainrot Monorepo Migration Checker"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check current directory
echo "📍 Current Location:"
if [ "$PWD" = "$HOME/Development/brainrot" ]; then
    echo -e "${GREEN}✓${NC} In correct directory: $PWD"
else
    echo -e "${RED}✗${NC} Wrong directory. Should be in ~/Development/brainrot"
    echo "  Current: $PWD"
fi
echo ""

# Check git initialization
echo "📚 Git Status:"
if [ -d .git ]; then
    echo -e "${GREEN}✓${NC} Git initialized"
    COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    echo "  Commits: $COMMITS"
    REMOTES=$(git remote -v | wc -l)
    echo "  Remotes configured: $(($REMOTES / 2))"
else
    echo -e "${YELLOW}⚠${NC} Git not initialized yet"
fi
echo ""

# Check package.json
echo "📦 Package Configuration:"
if [ -f package.json ]; then
    echo -e "${GREEN}✓${NC} package.json exists"
    if grep -q '"packageManager": "pnpm@8.15.1"' package.json; then
        echo -e "${GREEN}✓${NC} pnpm configured correctly"
    fi
    if grep -q '"private": true' package.json; then
        echo -e "${GREEN}✓${NC} Set as private package"
    fi
else
    echo -e "${YELLOW}⚠${NC} package.json not found"
fi
echo ""

# Check Turborepo
echo "🚀 Turborepo Setup:"
if [ -f turbo.json ]; then
    echo -e "${GREEN}✓${NC} turbo.json configured"
else
    echo -e "${YELLOW}⚠${NC} turbo.json not found"
fi
if [ -f pnpm-workspace.yaml ]; then
    echo -e "${GREEN}✓${NC} pnpm workspace configured"
else
    echo -e "${YELLOW}⚠${NC} pnpm-workspace.yaml not found"
fi
echo ""

# Check directory structure
echo "📂 Directory Structure:"
for dir in apps packages content scripts; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir/ exists"
    else
        echo -e "${YELLOW}⚠${NC} $dir/ missing"
    fi
done
echo ""

# Check if web app migrated
echo "🌐 Web App Migration:"
if [ -d "apps/web" ]; then
    echo -e "${GREEN}✓${NC} Web app migrated to apps/web"
    if [ -f "apps/web/package.json" ]; then
        if grep -q '"name": "@brainrot/web"' apps/web/package.json; then
            echo -e "${GREEN}✓${NC} Package renamed to @brainrot/web"
        else
            echo -e "${YELLOW}⚠${NC} Package name not updated"
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} Web app not migrated yet"
fi
echo ""

# Check if translations migrated
echo "📚 Translations Migration:"
if [ -d "content/translations" ]; then
    echo -e "${GREEN}✓${NC} Translations migrated"
    BOOK_COUNT=$(find content/translations -type d -name "books" | wc -l)
    echo "  Books directories found: $BOOK_COUNT"
else
    echo -e "${YELLOW}⚠${NC} Translations not migrated yet"
fi
echo ""

# Check Great Gatsby
echo "🎭 Great Gatsby Status:"
if [ -d "content/translations/books/great-gatsby" ]; then
    echo -e "${GREEN}✓${NC} Great Gatsby in correct location"
    MD_COUNT=$(find content/translations/books/great-gatsby -name "*.md" 2>/dev/null | wc -l)
    TXT_COUNT=$(find content/translations/books/great-gatsby -name "*.txt" 2>/dev/null | wc -l)
    echo "  Markdown files: $MD_COUNT"
    echo "  Text files: $TXT_COUNT"
    if [ $TXT_COUNT -eq 0 ]; then
        echo -e "${YELLOW}⚠${NC} Text files not generated yet (needed for web app)"
    fi
elif [ -d "apps/web/great-gatsby" ]; then
    echo -e "${YELLOW}⚠${NC} Great Gatsby still in web app, needs moving"
else
    echo -e "${RED}✗${NC} Great Gatsby not found!"
fi
echo ""

# Check environment
echo "🔑 Environment Setup:"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
    if grep -q "BLOB_READ_WRITE_TOKEN" .env.local; then
        echo -e "${GREEN}✓${NC} Blob token configured"
    fi
elif [ -f "apps/web/.env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local in web app"
else
    echo -e "${YELLOW}⚠${NC} No .env.local found"
fi
echo ""

# Check node modules
echo "📦 Dependencies:"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
    if [ -d "node_modules/turbo" ]; then
        echo -e "${GREEN}✓${NC} Turborepo installed"
    fi
else
    echo -e "${YELLOW}⚠${NC} Dependencies not installed (run: pnpm install)"
fi
echo ""

# Summary
echo "======================================="
echo "📊 Migration Progress Summary:"
echo ""

# Count completed items
TOTAL_CHECKS=0
COMPLETED_CHECKS=0

# Function to check and count
check_item() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ "$1" = "true" ]; then
        COMPLETED_CHECKS=$((COMPLETED_CHECKS + 1))
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

check_item "$([ -d .git ] && echo true)" "Git initialized"
check_item "$([ -f package.json ] && echo true)" "Package.json created"
check_item "$([ -f turbo.json ] && echo true)" "Turborepo configured"
check_item "$([ -d apps/web ] && echo true)" "Web app migrated"
check_item "$([ -d content/translations ] && echo true)" "Translations migrated"
check_item "$([ -d node_modules ] && echo true)" "Dependencies installed"

echo ""
echo "Progress: $COMPLETED_CHECKS / $TOTAL_CHECKS tasks complete"
PERCENTAGE=$((COMPLETED_CHECKS * 100 / TOTAL_CHECKS))
echo "Completion: ${PERCENTAGE}%"

if [ $PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}🎉 Phase 1 complete! Ready for Phase 2.${NC}"
elif [ $PERCENTAGE -ge 50 ]; then
    echo -e "${YELLOW}📈 Making good progress! Keep going.${NC}"
else
    echo -e "${YELLOW}🚧 Just getting started. Check QUICK_START.md for next steps.${NC}"
fi

echo ""
echo "======================================="
echo "Run this script after each major step to track progress."
echo "Check TODO.md for the detailed task list."