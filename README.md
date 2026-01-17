# 3D Print Auto-Quote System

A full-stack web application built with Next.js and TypeScript that provides instant quotes for 3D printing projects. Upload STL files, get volume and cost calculations, and receive quotes via email.

## Features

- **STL File Processing**: Parse and analyze both ASCII and Binary STL files
- **Automatic Volume Calculation**: Calculate model volume, surface area, and bounding box
- **Instant Quote Generation**: Real-time pricing based on material, quality, infill, and other parameters
- **Email Verification**: Secure quote delivery via email verification
- **Configurable Print Options**: Choose material, quality, infill percentage, color, and rush order
- **Database Integration**: SQLite (development) or PostgreSQL (production) support
- **Responsive UI**: Modern, mobile-friendly interface with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM with SQLite/PostgreSQL
- **Styling**: Tailwind CSS
- **Email**: Nodemailer
- **File Upload**: React Dropzone
- **3D Processing**: Custom STL parser with Three.js types

## Project Structure

```
3dp-auto-quote/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── upload/        # File upload endpoint
│   │   │   ├── calculate-quote/  # Quote calculation endpoint
│   │   │   └── verify-email/  # Email verification endpoint
│   │   ├── verify/            # Email verification page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── FileUpload.tsx     # STL file upload component
│   │   ├── EmailEntry.tsx     # Email input component
│   │   ├── QuoteDisplay.tsx   # Quote results display
│   │   └── PrintOptions.tsx   # Print settings component
│   ├── utils/                 # Utility functions
│   │   ├── stl-parser.ts      # STL file parsing logic
│   │   ├── pricing.ts         # Quote calculation logic
│   │   ├── email.ts           # Email sending utilities
│   │   └── validation.ts      # Input validation
│   ├── lib/                   # Libraries
│   │   └── prisma.ts          # Prisma client
│   └── types/                 # TypeScript types
│       └── index.ts           # Type definitions
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding script
├── public/                    # Static files
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── next.config.js             # Next.js config
├── tailwind.config.ts         # Tailwind config
└── .env.example               # Environment variables template

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd 3dp-auto-quote
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration:
   ```env
   # For SQLite (development)
   DATABASE_URL="file:./dev.db"

   # For PostgreSQL (production)
   # DATABASE_URL="postgresql://user:password@localhost:5432/3dp_quote_db"

   # Email configuration
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASSWORD="your-app-password"
   EMAIL_FROM="noreply@3dpquote.com"

   # App URL
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

5. Initialize the database:
   ```bash
   # Push the schema to the database
   npm run db:push

   # Seed the database with materials and pricing rules
   npm run db:seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

### Using SQLite (Development)

SQLite is configured by default. No additional setup required.

### Using PostgreSQL (Production)

1. Install PostgreSQL
2. Create a database:
   ```sql
   CREATE DATABASE 3dp_quote_db;
   ```
3. Update `DATABASE_URL` in `.env`
4. Update `provider` in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Run migrations:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the app password in `EMAIL_PASSWORD` in `.env`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma Client
- `npm run db:seed` - Seed database with initial data

## API Endpoints

### POST /api/upload
Upload and parse STL file.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "success": true,
  "message": "File uploaded and parsed successfully",
  "data": {
    "fileName": "model.stl",
    "fileSize": 1024000,
    "fileHash": "abc123...",
    "stlData": {
      "volume": 125.5,
      "surfaceArea": 450.2,
      "boundingBox": { "x": 10, "y": 10, "z": 12.5 }
    }
  }
}
```

### POST /api/calculate-quote
Calculate quote for a 3D print.

**Request**:
```json
{
  "email": "user@example.com",
  "fileName": "model.stl",
  "fileSize": 1024000,
  "fileHash": "abc123...",
  "stlData": { ... },
  "material": "PLA",
  "infillPercentage": 20,
  "quality": "standard",
  "rushOrder": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Quote calculated successfully",
  "data": {
    "id": "quote_123",
    "totalCost": 45.50,
    "baseCost": 15.00,
    "materialCost": 18.00,
    "laborCost": 12.50,
    "validUntil": "2024-01-01T00:00:00.000Z",
    "requiresVerification": true
  }
}
```

### GET /api/verify-email?token=xxx
Verify email address.

**Response**:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "verified": true
}
```

## Pricing Logic

The quote calculation considers:

1. **Base Cost**: Volume × Base price per cm³
2. **Material Cost**: Material multiplier × Material cost multiplier
3. **Infill Adjustment**: Higher infill = more material
4. **Quality Multiplier**: Draft (0.8×), Standard (1.0×), High (1.4×)
5. **Labor Cost**: Estimated print time × Labor rate per hour
6. **Rush Order**: 1.5× multiplier if selected
7. **Volume Discounts**: Applied automatically for larger orders

## STL Parser

The enhanced STL parser supports both Binary and ASCII STL formats with robust error handling:

### Features
- Automatic format detection (Binary vs ASCII)
- Volume calculation using divergence theorem
- Surface area calculation using cross product
- Bounding box extraction
- Estimated print time calculation
- Comprehensive file validation
- Error handling for corrupted files
- Support for NaN and invalid vertex detection
- Warnings for edge cases

### Print Time Estimation
The parser can estimate print time based on:
- Model volume
- Infill percentage (configurable)
- Print speed (configurable, default 10 cm³/hour)
- Overhead for layer changes and travel moves

### Error Handling
Robust error handling for:
- Empty or invalid files
- Files too small to be valid STL
- Corrupted triangle data
- NaN or Infinity values in vertices
- Invalid file sizes
- Malformed ASCII STL (missing endsolid)
- Invalid triangle counts

## Testing

Comprehensive unit tests are included for the STL parser:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage
- Binary STL parsing (various sizes and edge cases)
- ASCII STL parsing (various formats)
- Error handling (corrupted files, NaN values, etc.)
- Volume and surface area calculations
- Print time estimation
- Format detection
- Validation logic
- Performance benchmarks

See `src/utils/__tests__/README.md` for detailed testing documentation.

## Customization

### Adjusting Pricing

Edit values in `.env`:
```env
BASE_PRICE_PER_CM3=0.15
MATERIAL_COST_MULTIPLIER=1.2
RUSH_ORDER_MULTIPLIER=1.5
```

Or modify `src/utils/pricing.ts` for advanced pricing logic.

### Adding Materials

Add to database via Prisma Studio or seed script:
```typescript
await prisma.material.create({
  data: {
    name: 'Custom Material',
    costPerCm3: 0.25,
    density: 1.20,
    available: true,
  }
});
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues or questions, please open an issue on GitHub. 
