#!/bin/bash
# =============================================================================
# Comfort Apartments - Database Backup Script
# =============================================================================
#
# Использование:
#   ./backup-db.sh              # Создать бэкап
#   ./backup-db.sh --restore backup_file.sql  # Восстановить
#
# Рекомендуется добавить в cron для автоматических бэкапов:
#   0 3 * * * /opt/comfort-apartments/deploy/backup-db.sh
#
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS=${RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Functions
create_backup() {
    local backup_file="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
    
    echo "Creating database backup..."
    
    docker compose exec -T postgres pg_dump \
        -U "${POSTGRES_USER:-comfort}" \
        "${POSTGRES_DB:-comfort_apartments}" \
        --no-owner \
        --no-acl \
        | gzip > "$backup_file"
    
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Backup created: $backup_file ($size)"
    else
        log_error "Backup failed!"
    fi
    
    # Cleanup old backups
    echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # List current backups
    echo ""
    echo "Current backups:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
}

restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
    fi
    
    echo "⚠️  WARNING: This will replace ALL data in the database!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
    
    echo "Restoring database from $backup_file..."
    
    # Check if file is gzipped
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker compose exec -T postgres psql \
            -U "${POSTGRES_USER:-comfort}" \
            "${POSTGRES_DB:-comfort_apartments}"
    else
        cat "$backup_file" | docker compose exec -T postgres psql \
            -U "${POSTGRES_USER:-comfort}" \
            "${POSTGRES_DB:-comfort_apartments}"
    fi
    
    log_success "Database restored from $backup_file"
}

list_backups() {
    echo "Available backups:"
    echo ""
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
}

# Parse arguments
case "${1:-}" in
    --restore)
        if [ -z "$2" ]; then
            echo "Usage: $0 --restore <backup_file>"
            exit 1
        fi
        restore_backup "$2"
        ;;
    --list)
        list_backups
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  (no args)           Create backup"
        echo "  --restore <file>    Restore from backup"
        echo "  --list             List available backups"
        echo "  --help             Show this help"
        ;;
    "")
        create_backup
        ;;
    *)
        echo "Unknown option: $1"
        exit 1
        ;;
esac
