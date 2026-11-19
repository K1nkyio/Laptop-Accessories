# Stacked Laptop & Accessories Store

This project uses the requested stack:

- Frontend: React + Tailwind CSS
- Backend: Express
- Database: PostgreSQL

## Getting Started

Install frontend dependencies from `user-dashboard`:

```sh
npm install
```

Start the React frontend:

```sh
npm run dev
```

Start the independent Express API from the project root:

```sh
cd ../backend
npm install
npm run dev
```

Configure backend settings in `backend/.env` (start from `backend/.env.example`), then apply the schema in `../backend/schema.sql`.

## Scripts

- `npm run dev` starts the React/Vite frontend.
- `npm run dev` in `backend/` starts the Express backend.
- `npm run build` builds the frontend.
- `npm run test` runs Vitest.

## Notes

The frontend currently uses the bundled local catalog for storefront rendering, while the backend provides PostgreSQL-backed API endpoints ready for integration.
