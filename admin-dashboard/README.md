# Stacked Admin Dashboard

Admin interface for Stacked Laptop & Accessories.

## Stack

- Frontend: React + Tailwind CSS
- Backend: Express
- Database: PostgreSQL

## Local Development

Install dependencies:

```sh
npm install
```

Start the admin dashboard:

```sh
npm run dev
```

Open:

```txt
http://localhost:8080/admin
```

The dashboard talks to the Express API through `VITE_API_URL` (default: `http://localhost:4000`). Start the independent API from the project root with `cd backend`, `npm install`, and `npm run dev`; its configuration is in `backend/.env`.
