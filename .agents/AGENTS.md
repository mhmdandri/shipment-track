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
