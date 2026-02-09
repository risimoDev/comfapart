# 🚀 Deployment Guide - Comfort Apartments

Руководство по развёртыванию проекта на production сервере Ubuntu 22.04.

## 📋 Требования

- Ubuntu 22.04 LTS
- Минимум 2 GB RAM, 20 GB SSD
- Домен с настроенными DNS записями
- Telegram Bot Token (от @BotFather)

## 🏃 Быстрый старт

### 1. Подготовка сервера

```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Скачайте и запустите скрипт установки
curl -fsSL https://raw.githubusercontent.com/your-org/comfort-apartments/main/deploy/setup.sh -o setup.sh
chmod +x setup.sh
sudo ./setup.sh
```

Скрипт установит:

- Docker и Docker Compose
- Настроит файрвол (UFW)
- Создаст пользователя для деплоя
- Настроит SSL сертификат (Let's Encrypt)
- Запустит приложение

### 2. Ручная установка

Если предпочитаете ручную установку:

```bash
# Установка Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Клонирование репозитория
git clone https://github.com/your-org/comfort-apartments.git /opt/comfort-apartments
cd /opt/comfort-apartments

# Настройка окружения
cp .env.production.example .env
nano .env  # Заполните переменные

# Запуск
docker compose up -d

# Применение миграций
docker compose exec web npx prisma migrate deploy

# Первоначальное заполнение БД (опционально)
docker compose exec web npx prisma db seed
```

## 📁 Структура деплоя

```
/opt/comfort-apartments/
├── .env                    # Переменные окружения
├── docker-compose.yml      # Конфигурация Docker
├── Dockerfile             # Сборка Next.js приложения
├── Dockerfile.bot         # Сборка Telegram бота
└── deploy/
    ├── setup.sh           # Скрипт первоначальной установки
    ├── deploy.sh          # Скрипт обновления
    ├── nginx.conf         # Конфигурация Nginx
    ├── ssl/               # SSL сертификаты
    │   ├── fullchain.pem
    │   └── privkey.pem
    └── init-db.sql        # Инициализация БД
```

## 🔄 Деплой обновлений

### Автоматический деплой (рекомендуется)

```bash
cd /opt/comfort-apartments
./deploy/deploy.sh
```

Скрипт выполнит:

1. Скачает последний код из git
2. Создаст резервную копию текущих образов
3. Соберёт новые образы
4. Применит миграции БД
5. Перезапустит сервисы с zero-downtime
6. Проверит health check
7. Откатит при ошибках

### Опции деплоя

```bash
./deploy/deploy.sh              # Обычный деплой
./deploy/deploy.sh --force      # Полная пересборка
./deploy/deploy.sh --rollback   # Откат к предыдущей версии
./deploy/deploy.sh --status     # Статус сервисов
./deploy/deploy.sh --logs       # Просмотр логов
```

### Ручной деплой

```bash
cd /opt/comfort-apartments

# Скачать изменения
git pull origin main

# Пересобрать образы
docker compose build

# Применить миграции
docker compose run --rm web npx prisma migrate deploy

# Перезапустить сервисы
docker compose up -d --force-recreate
```

## 🛠 Управление сервисами

### Просмотр статуса

```bash
docker compose ps
docker compose logs -f          # Все логи
docker compose logs -f web      # Логи веб-сервера
docker compose logs -f bot      # Логи Telegram бота
docker compose logs -f postgres # Логи БД
```

### Перезапуск сервисов

```bash
docker compose restart web      # Перезапуск веба
docker compose restart bot      # Перезапуск бота
docker compose restart          # Перезапуск всего
```

### Остановка

```bash
docker compose down             # Остановка (данные сохранятся)
docker compose down -v          # Остановка с удалением данных (ОСТОРОЖНО!)
```

## 🗄 База данных

### Резервное копирование

```bash
# Создание бэкапа
docker compose exec postgres pg_dump -U comfort comfort_apartments > backup_$(date +%Y%m%d).sql

# Или через скрипт
./deploy/backup-db.sh
```

### Восстановление

```bash
# Восстановление из бэкапа
cat backup_20260209.sql | docker compose exec -T postgres psql -U comfort comfort_apartments
```

### Доступ к БД

```bash
docker compose exec postgres psql -U comfort comfort_apartments
```

## 🔒 SSL сертификаты

### Автоматическое обновление

SSL сертификаты автоматически обновляются через cron (настраивается в setup.sh).

### Ручное обновление

```bash
# Остановить nginx
docker compose stop nginx

# Обновить сертификат
certbot renew

# Скопировать сертификаты
cp /etc/letsencrypt/live/your-domain/*.pem /opt/comfort-apartments/deploy/ssl/

# Запустить nginx
docker compose start nginx
```

## 📊 Мониторинг

### Health Check

```bash
curl https://your-domain.com/api/health
```

### Использование ресурсов

```bash
docker stats
htop
```

### Логи системы

```bash
journalctl -u comfort-apartments -f
```

## 🐛 Устранение неполадок

### Приложение не запускается

```bash
# Проверить логи
docker compose logs web

# Проверить переменные окружения
docker compose config

# Пересобрать с нуля
docker compose build --no-cache
docker compose up -d
```

### Ошибки базы данных

```bash
# Проверить статус PostgreSQL
docker compose exec postgres pg_isready

# Проверить логи
docker compose logs postgres

# Перезапустить БД
docker compose restart postgres
```

### Telegram бот не работает

```bash
# Проверить логи бота
docker compose logs bot

# Проверить токен
docker compose exec bot env | grep TELEGRAM

# Перезапустить бота
docker compose restart bot
```

### Проблемы с SSL

```bash
# Проверить сертификаты
openssl s_client -connect your-domain.com:443

# Проверить права на файлы
ls -la deploy/ssl/
```

## 🔄 CI/CD интеграция

### GitHub Actions

Пример workflow для автоматического деплоя:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/comfort-apartments
            ./deploy/deploy.sh
```

## 📝 Чеклист перед запуском

- [ ] DNS записи настроены (A запись указывает на сервер)
- [ ] Telegram бот создан через @BotFather
- [ ] Переменные в .env заполнены
- [ ] SSL сертификат получен
- [ ] Миграции применены
- [ ] Health check работает
- [ ] Бэкап настроен

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker compose logs -f`
2. Проверьте health: `curl localhost:3000/api/health`
3. Создайте issue в репозитории
