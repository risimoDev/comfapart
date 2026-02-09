#!/bin/bash
set -e

# ===========================================
# Comfort Apartments - PM2 Deployment Script
# ===========================================

APP_DIR="/opt/comfort-apartments"
cd $APP_DIR

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Parse arguments
FORCE=false
ROLLBACK=false
STATUS=false
LOGS=false

for arg in "$@"; do
    case $arg in
        --force) FORCE=true ;;
        --rollback) ROLLBACK=true ;;
        --status) STATUS=true ;;
        --logs) LOGS=true ;;
    esac
done

# Status
if [ "$STATUS" = true ]; then
    pm2 status
    echo ""
    echo "=== Health Check ==="
    curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health
    exit 0
fi

# Logs
if [ "$LOGS" = true ]; then
    pm2 logs --lines 100
    exit 0
fi

# Rollback
if [ "$ROLLBACK" = true ]; then
    warn "Откат к предыдущей версии..."
    git checkout HEAD~1
    npm ci
    npx prisma generate
    npm run build
    pm2 reload ecosystem.config.js
    log "Откат выполнен"
    exit 0
fi

echo ""
echo "=========================================="
echo "   Деплой Comfort Apartments"
echo "=========================================="
echo ""

# Save current commit for potential rollback
PREVIOUS_COMMIT=$(git rev-parse HEAD)
echo "Текущий коммит: $PREVIOUS_COMMIT"

# Pull latest changes
log "[1/7] Получение последних изменений..."
git fetch origin main
git reset --hard origin/main

NEW_COMMIT=$(git rev-parse HEAD)
if [ "$PREVIOUS_COMMIT" = "$NEW_COMMIT" ] && [ "$FORCE" = false ]; then
    log "Нет новых изменений. Используйте --force для принудительной пересборки."
    exit 0
fi

# Install dependencies
log "[2/7] Установка зависимостей..."
if [ "$FORCE" = true ]; then
    rm -rf node_modules
    npm ci
else
    npm ci
fi

# Generate Prisma client
log "[3/7] Генерация Prisma клиента..."
npx prisma generate

# Run migrations
log "[4/7] Применение миграций базы данных..."
npx prisma migrate deploy

# Build Next.js
log "[5/7] Сборка приложения..."
npm run build

# Restart PM2 processes
log "[6/7] Перезапуск сервисов..."
pm2 reload ecosystem.config.js --update-env

# Save PM2 state
pm2 save

# Health check
log "[7/7] Проверка работоспособности..."
sleep 5

HEALTH=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    log "Health check: OK"
else
    error "Health check failed! Выполняю откат..."
    git checkout $PREVIOUS_COMMIT
    npm ci
    npx prisma generate
    npm run build
    pm2 reload ecosystem.config.js
    error "Откат выполнен. Проверьте логи: pm2 logs"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}   Деплой успешно завершён!${NC}"
echo "=========================================="
echo ""
pm2 status
echo ""
echo "Посмотреть логи: pm2 logs"
echo "Статус: ./deploy-pm2.sh --status"
