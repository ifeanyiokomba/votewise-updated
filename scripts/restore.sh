#!/bin/bash
# ============================================================
# VoteWise — Database Restore Script
# ============================================================
# Usage: ./scripts/restore.sh /opt/votewise/backups/daily/votewise_daily_20260101_020000.sql.gz
# ============================================================

BACKUP_FILE=$1
DB_CONTAINER="votewise-db"
DB_USER="votewise"
DB_NAME="votewise"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    find /opt/votewise/backups -name "*.sql.gz" -type f | sort -r | head -10
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ File not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will OVERWRITE the current database."
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "[$(date)] Starting restore..."

# Verify checksum if exists
if [ -f "$BACKUP_FILE.sha256" ]; then
    echo "Verifying checksum..."
    if sha256sum -c "$BACKUP_FILE.sha256" --quiet; then
        echo "✅ Checksum verified"
    else
        echo "❌ Checksum verification FAILED"
        read -p "Continue anyway? (yes/no): " FORCE
        if [ "$FORCE" != "yes" ]; then
            exit 1
        fi
    fi
fi

# Restore
gunzip < "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME"

if [ ${PIPESTATUS[1]} -eq 0 ]; then
    echo "[$(date)] ✅ Restore completed successfully"
    echo "Verifying..."
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME" -c "SELECT COUNT(*) FROM organizations;"
else
    echo "[$(date)] ❌ Restore FAILED"
    exit 1
fi
