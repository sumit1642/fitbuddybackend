#!/bin/bash
set -e

echo "🔧 Setting up test database..."

export PGPASSWORD="123sumit"

# Create database (ignore error if exists)
psql -U fitbuddy -h localhost -c "CREATE DATABASE fitbuddy_testdb;" 2>/dev/null || echo "Database already exists"

# Run schema
echo "📋 Running schema..."
psql -U fitbuddy -h localhost -d fitbuddy_testdb -f public.sql

unset PGPASSWORD

echo "✅ Test database setup complete!"
echo ""
echo "Run tests with: npm test"
