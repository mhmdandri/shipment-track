# AI Agent Development Rules

The following rules MUST be strictly followed by any AI agent working on this codebase (`shipment-track`):

## 1. UI & Styling Guidelines

- **Shadcn UI First**: Always prioritize using existing Shadcn components (e.g., `<Button>`, `<Input>`, `<Select>`) before creating raw HTML elements.
- **Design Tokens**: Consistently use the project's CSS variables and Tailwind tokens for colors and styling (e.g., `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`). Do not use arbitrary colors (e.g., `text-gray-500` or `#333`) unless absolutely necessary.
- **Responsive Layouts**: Prioritize mobile-first, grid, and flex layouts that gracefully degrade on smaller screens.

## 2. Code Quality & Linting

- **Zero ESLint Errors**: The codebase must remain 100% clean. Do not introduce code that triggers ESLint errors or warnings.
- **Strict TypeScript (No `any`)**: The use of the `any` type is strictly forbidden.
  - Use `unknown` for caught errors and narrow them with `instanceof Error`.
  - Use Prisma-generated types for database entities.
  - Use Zod schemas and inferred types (`z.infer`) for form validation and API payloads.
  - Create explicit interfaces for all component props.

## 3. Operations & Safety

- **Avoid Direct State Mutation**: When working with React state, avoid mutating objects/arrays directly. Always spread (`...`) to create new object references.
- **Pre-Deployment Checklist**: Before concluding a major feature, actively run `pnpm tsc --noEmit` and `npx eslint .` via terminal to verify no type or linting regressions have been introduced.

## 4. Project Architecture & Features Context

- **Purpose**: This app (CS EKSIM TRACKER) is a freight operational dashboard for managing shipments, todos, and live terminal tracking.
- **Terminal Tracking**: We scrape or use terminal APIs (like JICT, NPCT1, KOJA, TMAL) to track container statuses. TMAL uses Cheerio for HTML scraping. JICT uses a JSON API.
- **Automation (Cron & Telegram)**: The app runs a cron job via an external service (like cron-job.org) pinging \/api/cron/monitor every 30 minutes to check if a container has received a yard allocation (status \GNSTK\). If yes, it sends a Telegram message using the bot API.
- **Database**: PostgreSQL (Prisma adapter) with Vercel deployment.
- **When Adding Features**: If adding a new terminal to track, inspect if it returns JSON or HTML. Use \cheerio\ for HTML parsing inside \ ctions/terminal-track-action.ts\ and map the yard allocation status to \GNSTK\ for consistency in the cron system.
- **Status Mapping Note (KOJA & NPCT1)**: 
  - **KOJA**: We now have confirmed that for containers still on the vessel, KOJA outputs `ONVSL` in the "Location" field. It has been tested and matches our expected `ONVSL` state. Furthermore, if the "In Time / Stack CY" field is filled with a valid timestamp, it means the container has secured a yard location, and the parser maps this to `GNSTK`.
  - **NPCT1**: We have confirmed that a newly stacked container is represented by the string `STACKING YARD`. The parser now safely maps `STACKING YARD` to `GNSTK`. We still need data samples to know their representation for ONVESSEL.
