#!/bin/bash
set -e

# ===========================================
# Comfort Apartments - PM2 Server Setup
# Ubuntu 22.04 LTS
# ===========================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

# Check root
if [ "$EUID" -ne 0 ]; then
    error "Запустите скрипт с sudo: sudo ./setup-pm2.sh"
fi

echo ""
echo "=========================================="
echo "   Comfort Apartments - PM2 Setup"
echo "=========================================="
echo ""

# Gather information
read -p "Введите домен (например, example.com): " DOMAIN
read -p "Введите email для SSL сертификата: " EMAIL
read -p "Введите Telegram Bot Token: " TELEGRAM_TOKEN
read -p "Введите Telegram Bot Username (без @): " TELEGRAM_BOT_USERNAME
read -sp "Придумайте пароль для базы данных: " DB_PASSWORD
echo ""
read -sp "Придумайте JWT секрет (любая длинная строка): " JWT_SECRET
echo ""

APP_DIR="/opt/comfort-apartments"

# ===========================================
# 1. System Update
# ===========================================
log "Обновление системы..."
apt update && apt upgrade -y

# ===========================================
# 2. Install Node.js 20
# ===========================================
log "Установка Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
node --version
npm --version

# ===========================================
# 3. Install PM2
# ===========================================
log "Установка PM2..."
npm install -g pm2

# ===========================================
# 4. Install PostgreSQL
# ===========================================
log "Установка PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
log "Настройка базы данных..."
sudo -u postgres psql <<EOF
CREATE USER comfort WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE comfort_apartments OWNER comfort;
GRANT ALL PRIVILEGES ON DATABASE comfort_apartments TO comfort;
EOF
log "База данных создана"

# ===========================================
# 5. Install Nginx
# ===========================================
log "Установка Nginx..."
apt install -y nginx

# ===========================================
# 6. Install Certbot for SSL
# ===========================================
log "Установка Certbot..."
apt install -y certbot python3-certbot-nginx

# ===========================================
# 7. Configure Firewall
# ===========================================
log "Настройка файрвола..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ===========================================
# 8. Install fail2ban
# ===========================================
log "Установка fail2ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# ===========================================
# 9. Create app directory
# ===========================================
log "Создание директории приложения..."
mkdir -p $APP_DIR
mkdir -p /var/log/comfort

# Clone or update repo
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git pull origin main
else
    warn "Склонируйте репозиторий в $APP_DIR"
    info "git clone https://github.com/your-org/comfort-apartments.git $APP_DIR"
fi

# ===========================================
# 10. Create .env file
# ===========================================
log "Создание .env файла..."
cat > $APP_DIR/.env << EOF
# Database
DATABASE_URL="postgresql://comfort:${DB_PASSWORD}@localhost:5432/comfort_apartments"

# Auth
JWT_SECRET="${JWT_SECRET}"
NEXTAUTH_SECRET="${JWT_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"

# Telegram Bot
TELEGRAM_BOT_TOKEN="${TELEGRAM_TOKEN}"
TELEGRAM_BOT_USERNAME="${TELEGRAM_BOT_USERNAME}"

# App
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NEXT_PUBLIC_APP_NAME="Comfort Apartments"
NODE_ENV=production

# Email (настройте если нужно)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-email
# SMTP_PASS=your-password
# SMTP_FROM=noreply@example.com
EOF

chmod 600 $APP_DIR/.env
log ".env файл создан"

# ===========================================
# 11. Configure Nginx
# ===========================================
log "Настройка Nginx..."
cat > /etc/nginx/sites-available/comfort-apartments << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    location / {
        return 301 https://\$host\$request_uri;
    }
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # SSL будет настроен certbot
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;
    
    # Logs
    access_log /var/log/nginx/comfort-access.log;
    error_log /var/log/nginx/comfort-error.log;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
    
    # Static files
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }
    
    location /public {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=86400";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/comfort-apartments /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# ===========================================
# 12. Get SSL Certificate
# ===========================================
log "Получение SSL сертификата..."
# First, create a temporary config without SSL
cat > /etc/nginx/sites-available/comfort-apartments-temp << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF

ln -sf /etc/nginx/sites-available/comfort-apartments-temp /etc/nginx/sites-enabled/comfort-apartments
nginx -t && systemctl reload nginx

# Get certificate
certbot certonly --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${EMAIL}

# Restore full config
ln -sf /etc/nginx/sites-available/comfort-apartments /etc/nginx/sites-enabled/comfort-apartments
nginx -t && systemctl reload nginx

# Setup auto-renewal
echo "0 0 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renewal

log "SSL сертификат получен"

# ===========================================
# 13. Create systemd service for PM2
# ===========================================
log "Настройка PM2 автозапуска..."
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# ===========================================
# 14. Create deploy script
# ===========================================
log "Создание скрипта деплоя..."
cat > $APP_DIR/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

APP_DIR="/opt/comfort-apartments"
cd $APP_DIR

echo "=== Деплой Comfort Apartments ==="

# Pull latest code
echo "[1/6] Получение последних изменений..."
git pull origin main

# Install dependencies
echo "[2/6] Установка зависимостей..."
npm ci

# Generate Prisma client
echo "[3/6] Генерация Prisma клиента..."
npx prisma generate

# Run migrations
echo "[4/6] Применение миграций..."
npx prisma migrate deploy

# Build Next.js
echo "[5/6] Сборка приложения..."
npm run build

# Restart PM2
echo "[6/6] Перезапуск сервисов..."
pm2 reload ecosystem.config.js --update-env

echo ""
echo "=== Деплой завершён ==="
pm2 status
DEPLOY_SCRIPT

chmod +x $APP_DIR/deploy.sh

# ===========================================
# 15. Create backup script
# ===========================================
log "Создание скрипта бэкапа..."
cat > $APP_DIR/backup.sh << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U comfort comfort_apartments > "$BACKUP_DIR/db_$DATE.sql"

# Keep only last 7 backups
ls -t $BACKUP_DIR/db_*.sql | tail -n +8 | xargs -r rm

echo "Backup created: $BACKUP_DIR/db_$DATE.sql"
BACKUP_SCRIPT

chmod +x $APP_DIR/backup.sh

# Add daily backup cron
echo "0 3 * * * root $APP_DIR/backup.sh" > /etc/cron.d/comfort-backup

# ===========================================
# 16. Add swap if needed
# ===========================================
if [ $(free -m | awk '/^Swap:/{print $2}') -lt 1024 ]; then
    log "Добавление swap (2GB)..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ===========================================
# Final Instructions
# ===========================================
echo ""
echo "=========================================="
echo -e "${GREEN}   Установка завершена!${NC}"
echo "=========================================="
echo ""
echo "Следующие шаги:"
echo ""
echo "1. Склонируйте репозиторий:"
echo "   cd $APP_DIR"
echo "   git clone https://github.com/risimoDev/comfapart.git ."
echo ""
echo "2. Установите зависимости и соберите:"
echo "   npm ci"
echo "   npx prisma generate"
echo "   npx prisma migrate deploy"
echo "   npm run build"
echo ""
echo "3. Запустите приложение:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "4. Проверьте статус:"
echo "   pm2 status"
echo "   curl https://${DOMAIN}/api/health"
echo ""
echo "Для последующих обновлений используйте:"
echo "   ./deploy.sh"
echo ""
echo "Логи:"
echo "   pm2 logs comfort-web"
echo "   pm2 logs comfort-bot"
echo ""
