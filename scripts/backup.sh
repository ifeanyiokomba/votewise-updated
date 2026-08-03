#!/bin/bash
# ============================================================
# VoteWise — Database Backup Script
# ============================================================
# Usage:
#   Hourly:  0 * * * * /opt/votewise/scripts/backup.sh hourly
#   Daily:   0 2 * * * /opt/votewise/scripts/backup.sh daily
#   Weekly:  0 3 * * 0 /opt/votewise/scripts/backup.sh weekly
#   Monthly: 0 4 1 * * /opt/votewise/scripts/backup.sh monthly
# ============================================================

BACKUP_DIR="/opt/votewise/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="votewise-db"
DB_USER="votewise"
DB_NAME="votewise"
TYPE=${1:-hourly}

mkdir -p "$BACKUP_DIR/$TYPE"

BACKUP_FILE="$BACKUP_DIR/$TYPE/votewise_${TYPE}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting $TYPE backup..."

# Create backup
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] ✅ Backup completed: $BACKUP_FILE ($SIZE)"

    # Calculate checksum
    sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"

    # Retention policy
    case "$TYPE" in
        hourly)
            find "$BACKUP_DIR/hourly" -name "*.sql.gz" -mtime +1 -delete
            ;;
        daily)
            find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +7 -delete
            ;;
        weekly)
            find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +28 -delete
            ;;
        monthly)
            find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +365 -delete
            ;;
    esac

    echo "[$(date)] Retention policy applied for $TYPE backups"
else
    echo "[$(date)] ❌ Backup FAILED"
    # Send alert
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"🚨 VoteWise backup FAILED at $(date)\"}"
    fi
    exit 1
fi
