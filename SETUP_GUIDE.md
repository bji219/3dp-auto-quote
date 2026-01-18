# Local Development Setup Guide

This guide will help you set up the 3D Print Auto-Quote system for local development using VS Code with the Claude plugin.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and **npm 9+**
  - Check versions: `node --version` and `npm --version`
  - Download from: https://nodejs.org/
- **Git**
  - Check version: `git --version`
  - Download from: https://git-scm.com/
- **VS Code** (recommended)
  - Download from: https://code.visualstudio.com/
- **Claude for VS Code Plugin** (optional but recommended)
  - Install from VS Code Extensions marketplace

## Step-by-Step Setup

### 1. Clone the Repository

If you haven't already:

```bash
git clone https://github.com/bji219/3dp-auto-quote.git
cd 3dp-auto-quote
```

If you already cloned it, make sure you have the latest changes:

```bash
git pull origin main
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit the `.env` file with your preferred text editor. For local development, the default SQLite configuration works out of the box:

```env
# Database - SQLite (default for development, no changes needed)
DATABASE_URL="file:./dev.db"

# Email Configuration - Choose one option
# Option 1: Resend (recommended for production)
# RESEND_API_KEY="re_xxxxxxxxxx"

# Option 2: SMTP (good for local testing with Gmail)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"  # See Gmail setup below
EMAIL_FROM="noreply@3dpquote.com"

# Application URL (keep as-is for local dev)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT Secret (change this to any random string)
JWT_SECRET="dev-secret-key-change-me-in-production"

# File Storage (local is fine for development)
STORAGE_TYPE="local"
STORAGE_BASE_PATH="./public/uploads"
```

#### Gmail Setup (for email testing)

If you want to test email functionality locally:

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click on "2-Step Verification"
   - Scroll to "App passwords" and click it
   - Select "Mail" and your device
   - Copy the 16-character password
3. Use this app password in `EMAIL_PASSWORD` in your `.env` file

### 3. Install Dependencies

Run the following command to install all required packages:

```bash
npm install
```

This will:
- Install all npm dependencies
- Automatically run `prisma generate` to create the Prisma client

### 4. Set Up the Database

Initialize the SQLite database with the schema:

```bash
npm run db:push
```

This command will:
- Create a `dev.db` file in the `prisma/` directory
- Apply the database schema to SQLite

### 5. Seed the Database

Populate the database with initial data (materials and pricing rules):

```bash
npm run db:seed
```

This will add:
- Default materials (PLA, ABS, PETG, TPU, Nylon, Carbon Fiber, Resin)
- Pricing rules for volume discounts and multipliers

### 6. Start the Development Server

Run the Next.js development server:

```bash
npm run dev
```

You should see output like:

```
> 3dp-auto-quote@0.1.0 dev
> next dev

  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Ready in 2.1s
```

### 7. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

You should see the 3D Print Quote application homepage.

## VS Code Setup

### Recommended Extensions

Install these VS Code extensions for the best development experience:

1. **ESLint** - Code linting
2. **Prettier** - Code formatting
3. **Prisma** - Prisma schema syntax highlighting
4. **Tailwind CSS IntelliSense** - CSS class autocomplete
5. **Claude for VS Code** - AI-powered development assistance

### Open in VS Code

```bash
code .
```

Or open VS Code and select File > Open Folder, then choose the `3dp-auto-quote` directory.

## Testing the Application

### 1. Upload an STL File

- Click "Choose STL File" or drag and drop an STL file
- The file will be parsed and analyzed automatically
- You'll see the volume, surface area, and bounding box

### 2. Configure Print Options

- Select material (PLA, ABS, PETG, etc.)
- Set infill percentage (10-100%)
- Choose quality (draft, standard, high)
- Toggle rush order if needed

### 3. Enter Email and Get Quote

- Enter your email address
- Click "Get Quote"
- Check your email for the verification code
- Enter the code to verify and view the detailed quote

## Available npm Scripts

Here are the most commonly used commands:

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm start                  # Start production server

# Database
npm run db:push            # Push schema to database (for dev)
npm run db:migrate         # Create and apply migrations (for prod)
npm run db:studio          # Open Prisma Studio (database GUI)
npm run db:seed            # Seed database with initial data
npm run db:reset           # Reset database (WARNING: deletes all data)
npm run db:generate        # Generate Prisma Client

# Code Quality
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript type checking
npm test                   # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report

# Utilities
npm run cleanup            # Run file cleanup script
```

## Project Structure

```
3dp-auto-quote/
├── src/
│   ├── app/                    # Next.js app directory (pages & API routes)
│   │   ├── api/               # API endpoints
│   │   │   ├── upload/        # File upload endpoint
│   │   │   ├── calculate-quote/  # Quote calculation
│   │   │   └── verify-email/  # Email verification
│   │   ├── verify/            # Email verification page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Homepage
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── FileUpload.tsx     # File upload UI
│   │   ├── EmailEntry.tsx     # Email input
│   │   ├── QuoteDisplay.tsx   # Quote results
│   │   └── PrintOptions.tsx   # Print settings
│   ├── utils/                 # Utility functions
│   │   ├── stl-parser.ts      # STL file parsing
│   │   ├── pricing.ts         # Quote calculations
│   │   ├── email.ts           # Email utilities
│   │   └── validation.ts      # Input validation
│   ├── lib/                   # Libraries
│   │   └── prisma.ts          # Prisma client instance
│   └── types/                 # TypeScript types
│       └── index.ts           # Type definitions
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeding script
│   └── dev.db                 # SQLite database (created after db:push)
├── public/                    # Static files
│   └── uploads/               # File upload directory (created automatically)
├── .env                       # Environment variables (created from .env.example)
├── package.json               # Dependencies and scripts
└── README.md                  # Project documentation
```

## Database Management

### View Database with Prisma Studio

Prisma Studio is a visual database editor:

```bash
npm run db:studio
```

This opens a browser window at [http://localhost:5555](http://localhost:5555) where you can:
- View all tables and records
- Add, edit, or delete records
- Run queries
- Export data

### Reset Database

If you need to start fresh:

```bash
npm run db:reset
```

**WARNING**: This will delete all data in the database!

After resetting, re-seed the database:

```bash
npm run db:seed
```

## Troubleshooting

### Issue: `npm install` fails with Prisma errors

**Solution**: The Prisma schema has been updated to use `String` instead of `Json` for SQLite compatibility. Make sure you have the latest code:

```bash
git pull origin main
npm install
```

### Issue: "Cannot find module '@prisma/client'"

**Solution**: Generate the Prisma client:

```bash
npm run db:generate
```

### Issue: Port 3000 is already in use

**Solution**: Either:
1. Kill the process using port 3000: `lsof -ti:3000 | xargs kill`
2. Or use a different port: `PORT=3001 npm run dev`

### Issue: Email verification not working

**Solution**:
1. Check your `.env` file has valid email credentials
2. For Gmail, make sure you're using an App Password (not your regular password)
3. Check the terminal for email sending errors

### Issue: File uploads failing

**Solution**: Ensure the uploads directory exists and has proper permissions:

```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

### Issue: Database locked error (SQLite)

**Solution**: Close Prisma Studio if it's running, and restart your dev server:

```bash
# Stop the dev server (Ctrl+C)
# Kill Prisma Studio if running
npm run dev
```

## Using PostgreSQL Instead of SQLite

For production-like development, you can use PostgreSQL:

### 1. Install PostgreSQL

- **macOS**: `brew install postgresql`
- **Ubuntu**: `sudo apt-get install postgresql`
- **Windows**: Download from https://www.postgresql.org/download/

### 2. Create a Database

```bash
# Start PostgreSQL
# macOS: brew services start postgresql
# Ubuntu: sudo service postgresql start

# Create database
createdb 3dp_quote_db

# Or using psql
psql -U postgres
CREATE DATABASE 3dp_quote_db;
\q
```

### 3. Update Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4. Update .env

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/3dp_quote_db"
```

Replace `postgres:password` with your PostgreSQL username and password.

### 5. Run Migrations

```bash
npm run db:migrate
npm run db:seed
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test files are located in `src/utils/__tests__/`.

## Next Steps

1. **Explore the code**: Start with `src/app/page.tsx` for the main UI
2. **Try the API**: Check out `src/app/api/` for the backend endpoints
3. **Customize pricing**: Edit `src/utils/pricing.ts` or use Prisma Studio to modify pricing rules
4. **Add materials**: Use Prisma Studio or edit `prisma/seed.ts`
5. **Read the docs**: Check `README.md` for comprehensive feature documentation

## Getting Help

- **Project Documentation**: See [README.md](./README.md)
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **STL Parser Tests**: See `src/utils/__tests__/README.md`

## Using with Claude Plugin

If you're using the Claude for VS Code plugin:

1. Open the Claude panel in VS Code (click the Claude icon in the sidebar)
2. Ask Claude to help you:
   - "Explain how the STL parser works"
   - "Add a new material to the database"
   - "Help me customize the pricing algorithm"
   - "Debug why my file upload is failing"
   - "Add a new API endpoint for X"

Claude has full context of the codebase and can help you understand, modify, and extend the application.

---

**Happy coding!** 🚀
