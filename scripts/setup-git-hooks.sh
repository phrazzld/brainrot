#!/bin/bash
# Setup script for Git hooks

echo "🔧 Setting up Git hooks for secret scanning..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-commit hook
if [ -f .githooks/pre-commit ]; then
    cp .githooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ Pre-commit hook installed"
else
    echo "❌ Pre-commit hook not found in .githooks/"
    exit 1
fi

# Configure Git to use .githooks directory (alternative to copying)
git config core.hooksPath .githooks
echo "✅ Git configured to use .githooks directory"

# Check if gitleaks is installed
if command -v gitleaks &> /dev/null; then
    echo "✅ Gitleaks is installed (version: $(gitleaks version))"
else
    echo "ℹ️  Gitleaks not found. Install it for enhanced secret scanning:"
    echo "   brew install gitleaks (macOS)"
    echo "   or visit: https://github.com/gitleaks/gitleaks#installing"
fi

echo ""
echo "🎉 Git hooks setup complete!"
echo ""
echo "The pre-commit hook will now:"
echo "  • Scan for common secret patterns"
echo "  • Prevent committing sensitive files"
echo "  • Run gitleaks if installed"
echo ""
echo "To bypass the hook in emergencies: git commit --no-verify"
echo "To test the hook: ./githooks/pre-commit"