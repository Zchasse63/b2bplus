#!/bin/bash

# B2B+ Platform Test Runner
# Quick script to run various test suites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Print header
print_header() {
    echo ""
    print_message "$BLUE" "════════════════════════════════════════════════════════════"
    print_message "$BLUE" "  $1"
    print_message "$BLUE" "════════════════════════════════════════════════════════════"
    echo ""
}

# Change to web directory
cd apps/web

# Show usage
show_usage() {
    print_header "B2B+ Test Runner"
    echo "Usage: ./run-tests.sh [command]"
    echo ""
    echo "Commands:"
    echo "  all              Run all tests with coverage"
    echo "  unit             Run unit tests only"
    echo "  integration      Run integration tests only"
    echo "  api              Run API tests only"
    echo "  components       Run component tests only"
    echo "  e2e              Run E2E tests (Playwright)"
    echo "  security         Run security tests (sanitization, CSRF, etc.)"
    echo "  pricing          Run pricing calculation tests"
    echo "  watch            Run tests in watch mode"
    echo "  coverage         Run all tests with coverage report"
    echo "  fix              Run tests and attempt to fix common issues"
    echo "  quick            Quick check (unit tests only, no coverage)"
    echo ""
    echo "Examples:"
    echo "  ./run-tests.sh all              # Run everything"
    echo "  ./run-tests.sh security         # Run security tests only"
    echo "  ./run-tests.sh watch            # Development mode"
    echo "  ./run-tests.sh coverage         # Generate coverage report"
    echo ""
}

# Run specific test command
run_test() {
    local test_pattern=$1
    local description=$2

    print_header "$description"
    npm test -- $test_pattern --verbose
}

# Run with coverage
run_with_coverage() {
    local test_pattern=$1
    local description=$2

    print_header "$description (with coverage)"
    npm test -- $test_pattern --coverage --verbose
}

# Main command handler
case "${1:-help}" in
    all)
        print_header "Running All Tests with Coverage"
        npm test -- --coverage --verbose
        print_message "$GREEN" "✅ All tests complete! Check coverage/lcov-report/index.html"
        ;;

    unit)
        run_with_coverage "__tests__/unit" "Unit Tests"
        ;;

    integration)
        run_with_coverage "__tests__/integration" "Integration Tests"
        ;;

    api)
        run_with_coverage "__tests__/api" "API Tests"
        ;;

    components)
        run_with_coverage "components" "Component Tests"
        ;;

    e2e)
        print_header "Running E2E Tests (Playwright)"
        npm run test:e2e
        ;;

    security)
        print_header "Running Security Tests"
        npm test -- __tests__/unit/lib/ai-sanitization.test.ts --verbose
        print_message "$GREEN" "✅ Security tests complete!"
        ;;

    pricing)
        print_header "Running Pricing Tests"
        npm test -- __tests__/unit/services/pricing.test.ts --verbose
        print_message "$GREEN" "✅ Pricing tests complete!"
        ;;

    watch)
        print_header "Running Tests in Watch Mode"
        print_message "$YELLOW" "Press 'q' to quit, 'a' to run all tests"
        npm test -- --watch
        ;;

    coverage)
        print_header "Generating Coverage Report"
        npm test -- --coverage --coverageReporters=html
        print_message "$GREEN" "✅ Coverage report generated!"
        echo ""
        print_message "$BLUE" "Opening coverage report..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open coverage/lcov-report/index.html
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open coverage/lcov-report/index.html
        else
            print_message "$YELLOW" "📊 View coverage at: coverage/lcov-report/index.html"
        fi
        ;;

    fix)
        print_header "Running Tests with Auto-Fix"
        print_message "$YELLOW" "Clearing Jest cache..."
        npm test -- --clearCache
        echo ""
        print_message "$YELLOW" "Running tests..."
        npm test -- --verbose || true
        echo ""
        print_message "$BLUE" "💡 Check errors above and update test files accordingly"
        ;;

    quick)
        print_header "Quick Check (Unit Tests Only)"
        npm test -- __tests__/unit --silent
        print_message "$GREEN" "✅ Quick check complete!"
        ;;

    help|--help|-h)
        show_usage
        ;;

    *)
        print_message "$RED" "❌ Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac

# Exit with success
exit 0
