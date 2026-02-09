#!/bin/bash
# =============================================================================
# Comfort Apartments - Server Setup Script
# Ubuntu 22.04 LTS
# =============================================================================
#
# Использование:
#   chmod +x setup.sh
#   sudo ./setup.sh
#
# Этот скрипт:
#   1. Обновляет систему
#   2. Устанавливает Docker и Docker Compose
#   3. Настраивает файрвол (UFW)
#   4. Создаёт пользователя для деплоя
#   5. Клонирует репозиторий
#   6. Настраивает SSL с Let's Encrypt
#   7. Запускает приложение
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# =============================================================================
# Configuration
# =============================================================================
APP_NAME="comfort-apartments"
APP_DIR="/opt/${APP_NAME}"
DEPLOY_USER="deploy"
GIT_REPO="${GIT_REPO:-https://github.com/your-org/comfort-apartments.git}"

# =============================================================================
# Check root
# =============================================================================
if [[ $EUID -ne 0 ]]; then
   log_error "Этот скрипт должен быть запущен с правами root (sudo)"
fi

echo ""
echo "=============================================="
echo "  Comfort Apartments - Server Setup"
echo "  Ubuntu 22.04 LTS"
echo "=============================================="
echo ""

# =============================================================================
# Prompt for configuration
# =============================================================================
read -p "Введите домен (например, apartments.example.com): " DOMAIN
read -p "Введите email для SSL сертификата: " EMAIL
read -p "Введите Telegram Bot Token: " TELEGRAM_BOT_TOKEN
read -p "Введите Telegram Bot Username (без @): " TELEGRAM_BOT_USERNAME
read -sp "Введите пароль для базы данных PostgreSQL: " POSTGRES_PASSWORD
echo ""
read -sp "Введите JWT Secret (минимум 32 символа): " JWT_SECRET
echo ""

# Generate random password if not provided
if [ -z "$POSTGRES_PASSWORD" ]; then
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    log_warning "Сгенерирован случайный пароль PostgreSQL"
fi

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    log_warning "Сгенерирован случайный JWT Secret"
fi

# =============================================================================
# Step 1: Update system
# =============================================================================
log_info "Обновление системы..."
apt-get update && apt-get upgrade -y
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    htop \
    ncdu

log_success "Система обновлена"

# =============================================================================
# Step 2: Install Docker
# =============================================================================
log_info "Установка Docker..."

if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add the repository to Apt sources
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    log_success "Docker установлен"
else
    log_info "Docker уже установлен"
fi

# =============================================================================
# Step 3: Create deploy user
# =============================================================================
log_info "Создание пользователя для деплоя..."

if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash -G docker "$DEPLOY_USER"
    log_success "Пользователь $DEPLOY_USER создан"
else
    usermod -aG docker "$DEPLOY_USER"
    log_info "Пользователь $DEPLOY_USER уже существует, добавлен в группу docker"
fi

# =============================================================================
# Step 4: Configure firewall
# =============================================================================
log_info "Настройка файрвола..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

log_success "Файрвол настроен"

# =============================================================================
# Step 5: Configure fail2ban
# =============================================================================
log_info "Настройка fail2ban..."

cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban

log_success "Fail2ban настроен"

# =============================================================================
# Step 6: Create application directory
# =============================================================================
log_info "Создание директории приложения..."

mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/deploy/ssl"

# If Git repo provided, clone it
if [ "$GIT_REPO" != "https://github.com/your-org/comfort-apartments.git" ]; then
    log_info "Клонирование репозитория..."
    git clone "$GIT_REPO" "$APP_DIR"
fi

chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR"

log_success "Директория создана: $APP_DIR"

# =============================================================================
# Step 7: Create environment file
# =============================================================================
log_info "Создание файла окружения..."

cat > "$APP_DIR/.env" << EOF
# =============================================================================
# Comfort Apartments - Production Environment
# Generated: $(date)
# =============================================================================

# Domain
DOMAIN=${DOMAIN}
APP_URL=https://${DOMAIN}
APP_NAME=Comfort Apartments

# Database
POSTGRES_USER=comfort
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=comfort_apartments

# Authentication
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# Telegram
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}

# Email (configure later)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@${DOMAIN}
EOF

chmod 600 "$APP_DIR/.env"
chown "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR/.env"

log_success "Файл окружения создан"

# =============================================================================
# Step 8: Setup SSL with Let's Encrypt (optional)
# =============================================================================
read -p "Настроить SSL с Let's Encrypt? (y/n): " SETUP_SSL

if [ "$SETUP_SSL" = "y" ] || [ "$SETUP_SSL" = "Y" ]; then
    log_info "Настройка SSL..."
    
    # Install certbot
    apt-get install -y certbot
    
    # Stop any service on port 80
    systemctl stop nginx 2>/dev/null || true
    docker stop comfort_nginx 2>/dev/null || true
    
    # Get certificate
    certbot certonly --standalone \
        -d "$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive
    
    # Copy certificates
    cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$APP_DIR/deploy/ssl/"
    cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem "$APP_DIR/deploy/ssl/"
    chmod 600 "$APP_DIR/deploy/ssl/"*
    chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR/deploy/ssl/"
    
    # Setup auto-renewal cron
    echo "0 3 * * * root certbot renew --quiet && cp /etc/letsencrypt/live/${DOMAIN}/*.pem ${APP_DIR}/deploy/ssl/ && docker compose -f ${APP_DIR}/docker-compose.yml restart nginx" | tee /etc/cron.d/certbot-renew
    
    log_success "SSL настроен"
fi

# =============================================================================
# Step 9: Create systemd service
# =============================================================================
log_info "Создание systemd сервиса..."

cat > /etc/systemd/system/comfort-apartments.service << EOF
[Unit]
Description=Comfort Apartments Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable comfort-apartments

log_success "Systemd сервис создан"

# =============================================================================
# Step 10: Create deploy script
# =============================================================================
log_info "Создание скрипта деплоя..."

cat > "$APP_DIR/deploy.sh" << 'DEPLOY_SCRIPT'
#!/bin/bash
# Zero-downtime deploy script
# Usage: ./deploy.sh

set -e

cd "$(dirname "$0")"

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest changes..."
git pull origin main

# Build new images
echo "🔨 Building new images..."
docker compose build --no-cache

# Run migrations
echo "🗄️ Running database migrations..."
docker compose run --rm web npx prisma migrate deploy

# Rolling restart (zero-downtime)
echo "♻️ Restarting services..."
docker compose up -d --force-recreate --no-deps web
sleep 10
docker compose up -d --force-recreate --no-deps bot

# Cleanup
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment complete!"
docker compose ps
DEPLOY_SCRIPT

chmod +x "$APP_DIR/deploy.sh"
chown "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR/deploy.sh"

log_success "Скрипт деплоя создан"

# =============================================================================
# Step 11: Initial database setup
# =============================================================================
read -p "Запустить приложение сейчас? (y/n): " START_APP

if [ "$START_APP" = "y" ] || [ "$START_APP" = "Y" ]; then
    log_info "Запуск приложения..."
    
    cd "$APP_DIR"
    sudo -u "$DEPLOY_USER" docker compose up -d
    
    # Wait for services to start
    sleep 20
    
    # Run migrations
    log_info "Применение миграций..."
    sudo -u "$DEPLOY_USER" docker compose exec web npx prisma migrate deploy
    
    # Seed database (optional)
    read -p "Заполнить базу тестовыми данными? (y/n): " SEED_DB
    if [ "$SEED_DB" = "y" ] || [ "$SEED_DB" = "Y" ]; then
        sudo -u "$DEPLOY_USER" docker compose exec web npx prisma db seed
    fi
    
    log_success "Приложение запущено"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "=============================================="
echo "  ✅ Установка завершена!"
echo "=============================================="
echo ""
echo "📁 Директория: $APP_DIR"
echo "🌐 Домен: https://$DOMAIN"
echo "👤 Пользователь: $DEPLOY_USER"
echo ""
echo "🔧 Полезные команды:"
echo "   cd $APP_DIR"
echo "   docker compose logs -f        # Просмотр логов"
echo "   docker compose ps             # Статус сервисов"
echo "   docker compose restart web    # Перезапуск веба"
echo "   docker compose restart bot    # Перезапуск бота"
echo "   ./deploy.sh                   # Деплой обновлений"
echo ""
echo "📝 Не забудьте настроить:"
echo "   - DNS записи для домена $DOMAIN"
echo "   - SMTP настройки в $APP_DIR/.env"
echo "   - SSH ключи для пользователя $DEPLOY_USER"
echo ""
log_success "Готово!"
