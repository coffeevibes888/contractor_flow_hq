@echo off
REM Regenerate Prisma Client after schema changes
echo Regenerating Prisma Client...

REM Generate Prisma Client
call npx prisma generate

echo Prisma Client regenerated successfully!
echo.
echo Next steps:
echo 1. Run 'npx prisma migrate dev --name add_milestone_escrow_system' to create migration
echo 2. Or run 'npx prisma db push' to sync schema without migration
