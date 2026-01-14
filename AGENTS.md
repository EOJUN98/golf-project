# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the Next.js App Router pages, route handlers (e.g., `app/api/*/route.ts`), layouts, and global styles (`app/globals.css`).
- `components/` hosts reusable UI components (PascalCase files like `BookingModal.tsx`).
- `lib/` and `utils/` contain shared logic and integrations (e.g., Supabase client setup and pricing engine helpers).
- `types/` stores shared TypeScript types.
- `public/` contains static assets.
- `docs/` and root-level markdown files capture project notes and progress.

## Build, Test, and Development Commands
- `npm run dev` starts the local Next.js dev server at `http://localhost:3000`.
- `npm run build` собирает production bundle.
- `npm run start` запускает production сервер после сборки.
- `npm run lint` проверяет код ESLint (Next.js core-web-vitals + TypeScript).

## Coding Style & Naming Conventions
- TypeScript-first: use `.ts`/`.tsx` and strongly-typed props.
- Components use PascalCase filenames (e.g., `DateSelector.tsx`).
- Route handlers follow Next.js App Router conventions (`app/api/<name>/route.ts`).
- Formatting is enforced via ESLint; keep code consistent with existing patterns.

## Testing Guidelines
- No automated test framework or test files are present in the repository.
- If adding tests, align with Next.js + TypeScript conventions and document how to run them.

## Commit & Pull Request Guidelines
- Recent commit messages follow a `Fix: <summary>` pattern. Prefer concise, imperative summaries and keep the prefix consistent.
- PRs should include:
  - A short description of the change and motivation.
  - Linked issues or tasks when applicable.
  - UI screenshots or screen recordings for user-facing changes.
  - Confirmation that `npm run lint` and any relevant builds pass.

## Security & Configuration Tips
- Provide local config in `.env.local`.
- Required environment variables include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `WEATHER_API_KEY`, and `TOSS_SECRET_KEY`.
- Avoid committing secrets; use placeholders in documentation.
