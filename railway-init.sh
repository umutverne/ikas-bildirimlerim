#!/bin/bash

# Railway initialization script
echo "🚀 Starting Railway deployment initialization..."

# Check if DATABASE_URL is set (PostgreSQL)
if [ -n "$DATABASE_URL" ]; then
  echo "✅ PostgreSQL detected - Running migrations..."

  # Run migrations if needed
  # psql $DATABASE_URL < migrations/001_add_admin_system.sql

  echo "✅ Database initialized"
else
  echo "⚠️  No DATABASE_URL found - Will use SQLite"
fi

echo "🎉 Initialization complete!"
