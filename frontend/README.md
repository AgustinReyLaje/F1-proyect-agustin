# F1 Analytics Platform - Frontend

Next.js 14 frontend application for the F1 Analytics Platform.

## 🚀 Quick Start

### With Docker (Recommended)

From the root directory:

```bash
docker-compose up frontend
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js 14 App Router
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   ├── lib/             # Utilities & API client
│   │   └── api.ts       # Axios API client
│   └── types/           # TypeScript types
│       └── f1.ts        # F1 data types
├── public/              # Static files
├── Dockerfile           # Docker configuration
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── tailwind.config.js   # Tailwind CSS config
└── next.config.js       # Next.js config
```

## 🔌 API Connection

The frontend connects to the Django backend API:

- **Development**: `http://localhost:8000/api/v1`
- **Docker**: `http://backend:8000/api/v1`

Configure in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_URL_SERVER=http://backend:8000/api/v1
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Fetching**: Axios + SWR
- **Charts**: Recharts
- **Icons**: Lucide React

## 📊 Available Features

- Driver statistics and comparisons
- Constructor team information
- Race results and lap times
- Championship standings (live updates)
- Race predictions (ML-powered)
- Interactive charts and visualizations

## 🛠️ Scripts

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🔗 URLs

- **Home**: http://localhost:3000
- **Drivers**: http://localhost:3000/drivers
- **Standings**: http://localhost:3000/standings
- **Races**: http://localhost:3000/races

## 📚 Documentation

See the main [README.md](../README.md) for full project documentation.

## 🐳 Docker

The frontend is containerized and runs as part of the docker-compose stack. It automatically connects to the backend API through the Docker network.

```bash
# Build and run with docker-compose
docker-compose up --build frontend

# Run in detached mode
docker-compose up -d frontend

# View logs
docker-compose logs -f frontend
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (client-side) | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_API_URL_SERVER` | Backend API URL (server-side) | `http://backend:8000/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `F1 Analytics` |
| `NODE_ENV` | Environment | `development` |

## 📝 License

This project is part of the F1 Analytics Platform.
