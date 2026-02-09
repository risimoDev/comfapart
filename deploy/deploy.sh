#!/bin/bash
# =============================================================================
# Comfort Apartments - Zero-Downtime Deployment Script
# =============================================================================
#
# Использование:
#   ./deploy.sh              # Обычный деплой
#   ./deploy.sh --force      # Принудительный деплой (пересборка всего)
#   ./deploy.sh --rollback   # Откат к предыдущей версии
#   ./deploy.sh --status     # Статус сервисов
#
# Возможности:
#   - Zero-downtime деплой
#   - Автоматические миграции БД
#   - Health checks перед переключением
#   - Автоматический откат при ошибках
#   - Сохранение предыдущих версий
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.yml"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
HEALTH_CHECK_TIMEOUT=60
ROLLBACK_IMAGES_COUNT=3

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# =============================================================================
# Functions
# =============================================================================

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --force       Force rebuild all images"
    echo "  --rollback    Rollback to previous version"
    echo "  --status      Show services status"
    echo "  --logs        Show recent logs"
    echo "  --help        Show this help"
    echo ""
}

check_health() {
    local max_attempts=$1
    local attempt=1
    
    log_info "Checking health (max ${max_attempts}s)..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    
    echo ""
    log_error "Health check failed after ${max_attempts} seconds"
    return 1
}

backup_current_images() {
    log_info "Backing up current images..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local web_image=$(docker compose images web -q 2>/dev/null || echo "")
    local bot_image=$(docker compose images bot -q 2>/dev/null || echo "")
    
    if [ -n "$web_image" ]; then
        docker tag "$web_image" "comfort-apartments-web:backup-$timestamp" 2>/dev/null || true
        echo "comfort-apartments-web:backup-$timestamp" >> .image_backups
    fi
    
    if [ -n "$bot_image" ]; then
        docker tag "$bot_image" "comfort-apartments-bot:backup-$timestamp" 2>/dev/null || true
        echo "comfort-apartments-bot:backup-$timestamp" >> .image_backups
    fi
    
    # Keep only last N backups
    if [ -f .image_backups ]; then
        tail -n $((ROLLBACK_IMAGES_COUNT * 2)) .image_backups > .image_backups.tmp
        mv .image_backups.tmp .image_backups
    fi
}

cleanup_old_images() {
    log_info "Cleaning up old images..."
    docker image prune -f
    
    # Remove old backup images (keep last N)
    if [ -f .image_backups ]; then
        local count=$(wc -l < .image_backups)
        if [ $count -gt $((ROLLBACK_IMAGES_COUNT * 2)) ]; then
            local to_remove=$((count - ROLLBACK_IMAGES_COUNT * 2))
            head -n $to_remove .image_backups | while read img; do
                docker rmi "$img" 2>/dev/null || true
            done
        fi
    fi
}

rollback() {
    log_warning "Starting rollback..."
    
    if [ ! -f .image_backups ]; then
        log_error "No backup images found"
        exit 1
    fi
    
    # Get last backup
    local last_web=$(grep "web:backup" .image_backups | tail -1)
    local last_bot=$(grep "bot:backup" .image_backups | tail -1)
    
    if [ -z "$last_web" ]; then
        log_error "No web backup found"
        exit 1
    fi
    
    log_info "Rolling back to: $last_web"
    
    # Tag backup as latest
    docker tag "$last_web" "comfort-apartments-web:latest"
    if [ -n "$last_bot" ]; then
        docker tag "$last_bot" "comfort-apartments-bot:latest"
    fi
    
    # Restart services
    docker compose up -d --force-recreate web bot
    
    if check_health $HEALTH_CHECK_TIMEOUT; then
        log_success "Rollback complete"
    else
        log_error "Rollback failed - manual intervention required"
        exit 1
    fi
}

show_status() {
    echo "=============================================="
    echo "  Comfort Apartments - Service Status"
    echo "=============================================="
    docker compose ps
    echo ""
    echo "Recent health check:"
    curl -s "$HEALTH_CHECK_URL" | python3 -m json.tool 2>/dev/null || echo "Health endpoint not available"
}

show_logs() {
    docker compose logs --tail=100 -f
}

# =============================================================================
# Main Deploy Logic
# =============================================================================

deploy() {
    local force_rebuild=$1
    
    echo ""
    echo "=============================================="
    echo "  🚀 Comfort Apartments - Deployment"
    echo "  $(date)"
    echo "=============================================="
    echo ""
    
    # Step 1: Pull latest code
    log_info "Pulling latest changes from git..."
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git fetch origin
        git reset --hard origin/main
        log_success "Code updated"
    else
        log_warning "Not a git repository, skipping pull"
    fi
    
    # Step 2: Backup current images
    backup_current_images
    
    # Step 3: Build new images
    log_info "Building new images..."
    if [ "$force_rebuild" = "true" ]; then
        docker compose build --no-cache --pull
    else
        docker compose build
    fi
    log_success "Images built"
    
    # Step 4: Run database migrations
    log_info "Running database migrations..."
    docker compose run --rm web npx prisma migrate deploy
    log_success "Migrations applied"
    
    # Step 5: Deploy web service first
    log_info "Deploying web service..."
    docker compose up -d --no-deps --force-recreate web
    
    # Step 6: Wait for health check
    if ! check_health $HEALTH_CHECK_TIMEOUT; then
        log_error "Web service failed health check"
        log_warning "Attempting automatic rollback..."
        rollback
        exit 1
    fi
    
    # Step 7: Deploy bot service
    log_info "Deploying bot service..."
    docker compose up -d --no-deps --force-recreate bot
    sleep 5
    log_success "Bot service deployed"
    
    # Step 8: Cleanup
    cleanup_old_images
    
    # Step 9: Final status
    echo ""
    echo "=============================================="
    echo "  ✅ Deployment Successful!"
    echo "=============================================="
    docker compose ps
    echo ""
    log_success "All services are running"
}

# =============================================================================
# Parse Arguments
# =============================================================================

case "${1:-}" in
    --force)
        deploy true
        ;;
    --rollback)
        rollback
        ;;
    --status)
        show_status
        ;;
    --logs)
        show_logs
        ;;
    --help|-h)
        show_help
        ;;
    "")
        deploy false
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
