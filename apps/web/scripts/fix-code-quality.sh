#!/bin/bash

# Code Quality Fix Script
# This script automates the replacement of console statements with logger calls
# and adds proper error context to error handlers

echo "Starting code quality fixes..."

# Find all TypeScript files in app and components directories
FILES=$(find /home/user/b2bplus/apps/web/app /home/user/b2bplus/apps/web/components \
  -type f \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  ! -path "*/dist/*" \
  ! -path "*/.npm-cache/*")

# Count files with console statements
CONSOLE_FILES=$(echo "$FILES" | xargs grep -l "console\.\(log\|error\|warn\|debug\|info\)" 2>/dev/null | wc -l)

echo "Found $CONSOLE_FILES files with console statements"

# Process each file
for file in $FILES; do
  # Skip if file doesn't contain console statements
  if ! grep -q "console\.\(log\|error\|warn\|debug\|info\)" "$file" 2>/dev/null; then
    continue
  fi

  echo "Processing: $file"

  # Check if logger is already imported
  if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
    # Add logger import after the first import statement
    sed -i "1,/^import/ s/\(^import.*$\)/\1\nimport { logger } from '@\/lib\/logger';/" "$file"
  fi

  # Replace console.error with logger.error (with basic context)
  sed -i "s/console\.error(\([^)]*\))/logger.error(\1)/" "$file"

  # Replace console.log with logger.debug
  sed -i "s/console\.log(\([^)]*\))/logger.debug(\1)/" "$file"

  # Replace console.warn with logger.warn
  sed -i "s/console\.warn(\([^)]*\))/logger.warn(\1)/" "$file"

  # Replace console.info with logger.info
  sed -i "s/console\.info(\([^)]*\))/logger.info(\1)/" "$file"
done

echo "Code quality fixes completed!"
echo "Note: Manual review is still recommended for:"
echo "  - Adding proper error context to logger calls"
echo "  - Converting empty callbacks to meaningful functions"
echo "  - Adding null/undefined checks where appropriate"
