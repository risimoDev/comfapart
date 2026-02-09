# 🚀 Deployment Guide - Comfort Apartments

Руководство по развёртыванию проекта на production сервере Ubuntu 22.04.

## 📋 Требования

- Ubuntu 22.04 LTS
- Минимум 2 GB RAM, 10 GB SSD
- Домен с настроенными DNS записями
- Telegram Bot Token (от @BotFather)

## 🎯 Выбор способа деплоя

| Способ | RAM | Диск | Сложность | Рекомендуется |
|--------|-----|------|-----------|---------------|
| **PM2** | 2 GB+ | 10 GB+ | Простой | ✅ Для VPS с ограниченными ресурсами |
| **Docker** | 4 GB+ | 20 GB+ | Средний | Для мощных серверов |

---

## 🏃 Быстрый старт с PM2 (рекомендуется)

### 1. Подготовка сервера

```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Склонируйте репозиторий
git clone https://github.com/risimoDev/comfapart.git /opt/comfort-apartments
cd /opt/comfort-apartments

# Запустите скрипт установки
chmod +x deploy/setup-pm2.sh
sudo ./deploy/setup-pm2.sh
```

Скрипт установит:
- Node.js 20
- PostgreSQL 15
- Nginx (reverse proxy)
- PM2 (process manager)
- SSL сертификат (Let's Encrypt)
- Настроит файрвол и fail2ban

### 2. Первый запуск (после скрипта)

```bash
cd /opt/comfort-apartments

# Установка зависимостей
npm ci

# Генерация Prisma клиента
npx prisma generate

# Применение миграций
npx prisma migrate deploy

# Сборка приложения
npm run build

# Запуск через PM2
pm2 start ecosystem.config.js
pm2 save
```

### 3. Проверка

```bash
pm2 status
curl https://your-domain.com/api/health
```

---

## 🔄 Обновление с PM2

### Автоматический деплой (рекомендуется)

```bash
cd /opt/comfort-apartments
./deploy/deploy-pm2.sh
```

### Опции

```bash
./deploy/deploy-pm2.sh              # Обычный деплой
./deploy/deploy-pm2.sh --force      # Полная пересборка
./deploy/deploy-pm2.sh --rollback   # Откат к предыдущей версии
./deploy/deploy-pm2.sh --status     # Статус сервисов
./deploy/deploy-pm2.sh --logs       # Просмотр логов
```

### Ручной деплой

```bash
cd /opt/comfort-apartments
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 reload ecosystem.config.js
```

---

## 🛠 Управление PM2

### Статус и логи

```bash
pm2 status                    # Статус всех процессов
pm2 logs                      # Все логи в реальном времени
pm2 logs comfort-web          # Логи веб-сервера
pm2 logs comfort-bot          # Логи Telegram бота
pm2 logs --lines 200          # Последние 200 строк
```

### Управление процессами

```bash
pm2 restart all               # Перезапуск всех
pm2 restart comfort-web       # Перезапуск веба
pm2 restart comfort-bot       # Перезапуск бота
pm2 stop all                  # Остановка всех
pm2 delete all                # Удаление всех процессов
pm2 start ecosystem.config.js # Запуск из конфига
```

### Мониторинг

```bash
pm2 monit                     # Интерактивный мониторинг
pm2 list                      # Список процессов
pm2 show comfort-web          # Детали процесса
```

---

## 🗄 База данных

### Подключение

```bash
sudo -u postgres psql -d comfort_apartments
```

### Резервное копирование

```bash
# Создание бэкапа
sudo -u postgres pg_dump comfort_apartments > backup_$(date +%Y%m%d).sql

# Или через скрипт
./backup.sh
```

### Восстановление

```bash
sudo -u postgres psql comfort_apartments < backup_20260209.sql
```

---

## 🔒 SSL сертификаты

SSL сертификаты автоматически обновляются через cron.

### Ручное обновление

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 🐛 Устранение неполадок

### Приложение не запускается

```bash
# Проверить логи
pm2 logs comfort-web --lines 100

# Проверить .env
cat .env

# Перезапустить
pm2 restart comfort-web
```

### Ошибки базы данных

```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Перезапустить
sudo systemctl restart postgresql

# Проверить подключение
sudo -u postgres psql -d comfort_apartments -c "SELECT 1"
```

### Telegram бот не работает

```bash
# Проверить логи
pm2 logs comfort-bot

# Проверить токен
grep TELEGRAM .env

# Перезапустить
pm2 restart comfort-bot
```

### Проблемы с памятью

```bash
# Проверить использование
free -h
pm2 monit

# Добавить swap если нужно
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🐳 Деплой с Docker (альтернатива)

Если у вас мощный сервер (4+ GB RAM, 20+ GB диск):

```bash
# Установка Docker
curl -fsSL https://get.docker.com | sh

# Запуск
cd /opt/comfort-apartments
docker compose up -d

# Миграции
docker compose exec web npx prisma migrate deploy
```

Подробнее см. файлы `Dockerfile`, `docker-compose.yml`.

---

## 📁 Структура файлов

```
/opt/comfort-apartments/
├── .env                    # Переменные окружения
├── ecosystem.config.js     # Конфигурация PM2
├── backup.sh              # Скрипт бэкапа
└── deploy/
    ├── setup-pm2.sh       # Установка сервера (PM2)
    ├── deploy-pm2.sh      # Деплой обновлений (PM2)
    ├── setup.sh           # Установка сервера (Docker)
    ├── deploy.sh          # Деплой обновлений (Docker)
    └── nginx.conf         # Конфигурация Nginx
```

---

## 📝 Чеклист перед запуском

- [ ] DNS записи настроены (A запись указывает на сервер)
- [ ] Telegram бот создан через @BotFather
- [ ] Переменные в .env заполнены
- [ ] SSL сертификат получен
- [ ] Миграции применены
- [ ] Health check работает: `curl https://domain.com/api/health`
- [ ] Бэкап настроен

---

## 📞 Команды на каждый день

```bash
# Статус
pm2 status

# Логи
pm2 logs

# Деплой обновлений
./deploy/deploy-pm2.sh

# Бэкап БД
./backup.sh

# Health check
curl http://localhost:3000/api/health
```
