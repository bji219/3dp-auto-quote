#!/bin/bash
# Migrate .env to use SUPABASE_DATABASE_URL for Netlify compatibility

if [ ! -f .env ]; then
    echo "No .env file found"
    exit 0
fi

# Backup original
cp .env .env.backup

# Replace DATABASE_URL with SUPABASE_DATABASE_URL
sed -i.tmp 's/^DATABASE_URL=/SUPABASE_DATABASE_URL=/' .env
sed -i.tmp 's/^DIRECT_DATABASE_URL=/#DIRECT_DATABASE_URL=/' .env

# Clean up
rm -f .env.tmp

echo "✅ Migrated .env file"
echo "📝 Original backed up to .env.backup"
echo ""
echo "Please verify your .env file has:"
echo "  SUPABASE_DATABASE_URL=postgresql://..."
echo ""
echo "You can delete .env.backup when ready"
