# GEMINI.md - TUGOL Golf Booking App

## Project Overview

This is a Next.js application for a golf tee-time booking service named "TUGOL". The application provides real-time tee-time availability and dynamic pricing. It's built with a modern stack including Next.js for the frontend, Supabase for the backend, and integrated with Toss Payments for processing payments.

### Key Technologies:
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, auth)
- **Payments**: Toss Payments
- **Languages**: TypeScript

### Architecture:
- The frontend is a client-rendered React application built with Next.js.
- The backend logic is handled by API routes in the `app/api` directory, which interact with a Supabase database.
- The application features a dynamic pricing engine (`utils/pricingEngine.ts`) that calculates discounts based on various factors like weather, time, and user data.
- User data, tee times, and reservations are stored in a Supabase Postgres database, with types defined in `types/database.ts`.

## Building and Running

To get the development environment running, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at [http://localhost:3000](http://localhost:3000).

### Key Scripts:
- `npm run dev`: Starts the development server.
- `npm run build`: Creates a production build.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase using ESLint.

## Development Conventions

- **Coding Style**: The project uses TypeScript and follows standard React/Next.js conventions. Code is formatted according to the rules in `.eslintrc.json`.
- **Component Structure**: Reusable components are located in the `components` directory.
- **API Routes**: Server-side logic is handled in API routes within `app/api`.
- **Database**: The database schema and types are defined in `types/database.ts`. All database interactions go through the Supabase client in `lib/supabase.ts`.
- **Pricing Logic**: All dynamic pricing logic is centralized in `utils/pricingEngine.ts`.
- **Supabase Queries**: Reusable Supabase queries are located in `utils/supabase/queries.ts`.
