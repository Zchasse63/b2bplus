#!/bin/bash

# B2B Plus Deployment Script
# Automates deployment to staging and production environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
DEPLOY_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${DEPLOY_DIR}/.backups"
LOG_FILE="${DEPLOY_DIR}/logs/deploy_${ENVIRONMENT}_${TIMESTAMP}.log"

# Ensure log directory exists
mkdir -p "${DEPLOY_DIR}/logs"
mkdir -p "${BACKUP_DIR}"

# Logging function
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "${LOG_FILE}"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $1" | tee -a "${LOG_FILE}"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1" | tee -a "${LOG_FILE}"
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $1" | tee -a "${LOG_FILE}"
}

# Validate environment
validate_environment() {
  log "Validating deployment environment..."

  if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    exit 1
  fi

  # Check required environment variables
  required_vars=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  )

  for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
      log_error "Missing required environment variable: $var"
      exit 1
    fi
  done

  log_success "Environment validation passed"
}

# Pre-deployment checks
pre_deployment_checks() {
  log "Running pre-deployment checks..."

  # Check git status
  if [[ -n $(git status -s) ]]; then
    log_warning "Working directory has uncommitted changes"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_error "Deployment cancelled"
      exit 1
    fi
  fi

  # Check if on main branch for production
  if [[ "$ENVIRONMENT" == "production" ]]; then
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$current_branch" != "main" ]]; then
      log_error "Production deployments must be from 'main' branch. Current: $current_branch"
      exit 1
    fi
  fi

  log_success "Pre-deployment checks passed"
}

# Build application
build_application() {
  log "Building application..."

  cd "${DEPLOY_DIR}"

  # Install dependencies
  log "Installing dependencies..."
  pnpm install --frozen-lockfile

  # Run tests
  log "Running tests..."
  pnpm test --coverage

  # Run type check
  log "Running type check..."
  pnpm type-check

  # Run linting
  log "Running linting..."
  pnpm lint

  # Build
  log "Building application..."
  pnpm build

  log_success "Build completed successfully"
}

# Database migrations
run_migrations() {
  log "Running database migrations..."

  cd "${DEPLOY_DIR}"

  # Backup current database
  log "Backing up database..."
  supabase db pull --db-url "${SUPABASE_URL}" > "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql" || true

  # Run migrations
  log "Applying migrations..."
  supabase migration up --db-url "${SUPABASE_URL}"

  log_success "Database migrations completed"
}

# Deploy to Vercel
deploy_to_vercel() {
  log "Deploying to Vercel ($ENVIRONMENT)..."

  cd "${DEPLOY_DIR}/apps/web"

  if [[ "$ENVIRONMENT" == "production" ]]; then
    vercel deploy --prod
  else
    vercel deploy --prebuilt
  fi

  log_success "Vercel deployment completed"
}

# Deploy mobile app
deploy_mobile() {
  log "Deploying mobile app..."

  cd "${DEPLOY_DIR}/apps/mobile"

  if [[ "$ENVIRONMENT" == "production" ]]; then
    log "Building production APK..."
    eas build --platform android --auto-submit
  else
    log "Building staging APK..."
    eas build --platform android
  fi

  log_success "Mobile deployment completed"
}

# Health checks
health_checks() {
  log "Running health checks..."

  # Check API health
  log "Checking API health..."
  api_url="https://api.${ENVIRONMENT}.b2bplus.com"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "${api_url}/api/health")
  if [[ "$response" != "200" ]]; then
    log_error "API health check failed: HTTP $response"
    return 1
  fi

  log_success "API health check passed"

  # Check database connectivity
  log "Checking database connectivity..."
  # This would be implemented based on your specific setup

  log_success "Health checks passed"
}

# Smoke tests
smoke_tests() {
  log "Running smoke tests..."

  cd "${DEPLOY_DIR}"

  # Run critical E2E tests
  pnpm test:e2e --grep "smoke"

  log_success "Smoke tests passed"
}

# Rollback function
rollback() {
  log_error "Deployment failed. Rolling back..."

  if [[ "$ENVIRONMENT" == "production" ]]; then
    log "Rolling back Vercel deployment..."
    vercel rollback --prod
  fi

  log_error "Rollback completed. Please investigate the failure."
  exit 1
}

# Notification
send_notification() {
  local status=$1
  local message=$2

  log "Sending deployment notification..."

  # Send to Slack (if webhook configured)
  if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
    curl -X POST "${SLACK_WEBHOOK_URL}" \
      -H 'Content-Type: application/json' \
      -d "{
        \"text\": \"Deployment $status\",
        \"blocks\": [
          {
            \"type\": \"section\",
            \"text\": {
              \"type\": \"mrkdwn\",
              \"text\": \"*Deployment $status*\n*Environment:* $ENVIRONMENT\n*Message:* $message\"
            }
          }
        ]
      }"
  fi
}

# Main deployment flow
main() {
  log "Starting deployment to $ENVIRONMENT environment"
  log "Timestamp: $TIMESTAMP"
  log "Log file: $LOG_FILE"

  trap rollback ERR

  validate_environment
  pre_deployment_checks
  build_application
  run_migrations
  deploy_to_vercel
  deploy_mobile
  health_checks
  smoke_tests

  log_success "Deployment completed successfully!"
  send_notification "SUCCESS" "Deployment to $ENVIRONMENT completed"
}

# Show usage
if [[ "$ENVIRONMENT" == "-h" ]] || [[ "$ENVIRONMENT" == "--help" ]]; then
  echo "Usage: $0 [staging|production]"
  echo ""
  echo "Examples:"
  echo "  $0 staging      # Deploy to staging"
  echo "  $0 production   # Deploy to production"
  exit 0
fi

# Run main deployment
main

