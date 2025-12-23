# Application System Design Guide

### Project Structure and Organization

We will implement a robust and scalable project structure leveraging **[Remix](https://hygraph.com/blog/remix-vs-next) file-based routing** and conventions. This approach will ensure long-term maintainability, ease of development, and efficient team collaboration.

- **Modular Feature-Based Organization**: Components, styles, and logic related to specific features will be grouped in dedicated directories.
- **Clear Separation of Concerns**: Maintain a strict separation between components, hooks, utilities, and resources/services.
  - `components/`, `hooks/`, `utils/`, `resources/api/`, `resources/state`
- **Absolute Imports with Aliases**: Use absolute imports for better readability (`@components`, `@hooks`, `@utils`).
- **Consistent Naming Conventions**:
  - **Components**: PascalCase (`UserProfile.tsx`)
  - **Hooks**: camelCase with 'use' prefix (`useAuth.ts`)
  - **Utilities**: camelCase (`formatDate.ts`)
  - **Types/Interfaces**: PascalCase with type/interface prefix (`TUser`, `IUser`)
  - **Constants**: UPPERCASE (`API_ENDPOINTS`)
- **Optimized for [Remix](https://hygraph.com/blog/remix-vs-next)**: This structure will take full advantage of [Remix](https://hygraph.com/blog/remix-vs-next) features like file-based routing, server components, and data fetching, leading to improved performance, SEO, and a better developer experience.

### Remix and SSR (Server Side Rendering)

The following is a list of the benefits that SSR introduces and the reasons why we have decided to utilize this technology and methodology. However, I want to emphasize that the main reason we chose to implement server capabilities is that simple SPAs are no longer sufficient to meet the complex and intrinsic requirements of modern software development.

A few years ago, a typical setup involved a single API consumed by an SPA, and that was it. The API was responsible for managing everything, including authentication, caching, database integrations, external service integrations, public consumers (customers), and internal consumers. Everything was handled at the API level. The main issue with this approach is that the SPA becomes tightly coupled with the API, meaning it relies entirely on API changes to evolve. This creates a significant problem, especially at scale.

The portals we are using today (and the ones we are building at Datum) are no longer just SPAs; they are critical components of the platform, each with its own teams, resources, and technologies. More importantly, they must have a certain degree of independence. The world we operate in as engineers today is full of APIs and integrations—it is no longer a one-API-fits-all scenario. Portals must have the ability to seamlessly integrate with other APIs, aggregate data, and model data in a way that suits their specific consumers—needs that often differ from how API consumers require data. A portal must be able to solve its own needs without requiring changes to “The API,” especially when those changes do not add any value to the API itself.

One of the major challenges we have encountered over the years while building APIs and portals is that “The API” often becomes not just the primary channel for user interactions but also an unintended Backend for Frontend (BFF). This introduces several difficulties, as it can significantly impact API design and create conflicts between what should be public-facing versus what should remain internal. As a result, “The API” must serve not only external customers but also multiple internal portals and integrations—responsibilities it should not be burdened with.

#### Benefits of using SSR:

- **Improved Performance & Faster First Load**
  - With SSR, the server pre-renders the React components into static HTML before sending them to the client.
  - This reduces the time it takes for users to see the initial page content (First Contentful Paint), especially on slow networks or devices.

- **Better SEO (Search Engine Optimization)**
  - Search engine crawlers struggle with client-side rendered (CSR) applications because they rely on JavaScript execution.
  - SSR ensures that fully rendered pages are available for indexing, improving search rankings.

- **Improved Perceived Performance (Faster TTFB)**
  - SSR improves **Time to First Byte (TTFB)** since the server responds with pre-rendered HTML instead of waiting for JavaScript to load, execute, and hydrate the page.

- **Reduced Client-side JavaScript Load**
  - SSR offloads rendering from the client to the server, reducing the amount of JavaScript processing needed on the client.
  - This benefits users on low-powered devices.

- **Faster Time-to-Interactive (TTI)**
  - Since the user sees content earlier, they perceive the app as faster.
  - Hydration (where React attaches event handlers to the server-rendered HTML) enables full interactivity sooner.

- **Easier Caching & Performance Optimizations**
  - Since SSR generates static HTML, it can be cached at the **CDN level**, reducing server load and improving response times for subsequent requests.

- **Progressive Enhancement**
  - Users can view and interact with the page even before React fully loads, improving accessibility and user experience.

- **Improved Authentication Handling**
  - Since every request **passes through the server**, authentication and permission checks can be **enforced before rendering the page**.
  - This ensures that unauthorized users **never receive restricted content**, unlike in CSR apps, where the frontend might initially load before checking permissions.
  - While not exclusive to SSR, it helps improve the user experience for authenticated applications.

- **Secure API Interactions Without Client Exposure**
  - API keys or sensitive credentials are **only used on the server** and **never exposed to the client**.
  - For example, if your app queries a **private GraphQL API**, the API key **never** leaves the server, reducing the risk of leakage.
  - This significantly improves security, as clients do not need to store or transmit sensitive credentials.
  - Ability to hide integrations with external services– When testing or implementing a new third-party service, SSR allows you to **utilize it on the backend without exposing it to the client**.
    This means you can experiment with different technologies **without making them visible to customers or requiring frontend updates**.
  - Useful when integrating **analytics, feature flags, payment providers, or A/B testing services** before making them part of the public API.

### Component Design and Styling

- **Modern Components**: We'll use modern functional components and React Hooks for cleaner, easier-to-test code.
- **Reusability**: Components will be designed for maximum reusability, saving time and ensuring consistency.
- **Type Safety**: TypeScript will ensure code quality and reduce errors by enforcing type checking.
- **Fast UI with [shadcn/ui](https://ui.shadcn.com/)**: [shadcn/ui](https://ui.shadcn.com/) will accelerate UI development, delivering a beautiful and consistent interface quickly.
- **Stylish with [Tailwind](https://tailwindcss.com/)**: [Tailwind](https://tailwindcss.com/) CSS will ensure consistent and efficient styling across the app.
- **Tested**: Thorough testing will ensure each component functions correctly and reliably.

#### Icons

We use **[Lucide React](https://lucide.dev/)** for all icons throughout the application. To ensure consistent styling and default props across all icons, **always use the `Icon` wrapper component** instead of importing icons directly from `lucide-react`.

**✅ Correct Usage:**

```tsx
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Home, PlusIcon, ChevronRight } from 'lucide-react';

// Use the Icon wrapper with default props applied
<Icon icon={Home} className="text-icon-primary size-4" />
<Icon icon={PlusIcon} className="size-3" />
```

**❌ Incorrect Usage:**

```tsx
// Don't import icons directly from lucide-react
import { Home } from 'lucide-react';

<Home className="..." />; // Missing default props and consistency
```

**Benefits of using the Icon wrapper:**

- **Consistent defaults**: All icons automatically get `strokeWidth={1}`, `absoluteStrokeWidth={true}`, and `size={16}` by default
- **Centralized styling**: Easy to update icon behavior across the entire application
- **Type safety**: Full TypeScript support with proper Lucide icon types
- **Flexibility**: Override defaults when needed (e.g., `size={24}`, `strokeWidth={2}`)

The `Icon` wrapper applies sensible defaults while still allowing full customization through props when needed.

### State Management

- **Lightweight Global State (if applicable)**: We will leverage **Jotai**, a pragmatic and performant atom-based state management library.
- **Scalable State Management (if applicable)**: If needed, we'll use **Zustand** for simplicity and minimal boilerplate, or **[TanStack Query](https://tanstack.com/query/latest)** for efficient server state and data fetching.
- **React Context for Sharing Data**: Used for limited state sharing between components without prop drilling.

### :warning: Minimized Global State :warning:

We’ll prioritize local component state whenever possible.

Why Global State is Problematic

Using global state might seem convenient at first, but it introduces several issues that can make your code harder to maintain and debug:

1. Unpredictability – When state is globally accessible, any part of the code can modify it, making it difficult to track changes and debug issues.
2. Tight Coupling – Functions and modules become dependent on global variables, reducing modularity and making refactoring more difficult.
3. Hidden Dependencies – Functions that rely on global state aren’t explicit about their inputs, making it harder to understand their behavior.
4. Concurrency Issues – Global state can lead to race conditions and unpredictable behavior in multi-threaded or asynchronous environments.
5. Testing Challenges – Unit testing becomes difficult because tests need to manage or reset global state, leading to flakiness and unreliable results.

Instead of using global state, prefer these alternatives:

- Pass Data as Function Arguments – Keep functions pure by passing necessary data explicitly.
- Encapsulate State – Use local function state, objects, or context-specific state management (e.g., React’s local state, closures).
- Use Dependency Injection – Pass dependencies explicitly rather than importing shared global variables.
- Leverage State Management Tools (if needed) – When managing state across components (e.g., in frontend apps), use structured approaches like React’s Context API, Redux, or Zustand instead of relying on scattered global variables.

### API Communication

- **Optimized Data Fetching and Caching**: Leveraging **[TanStack Query](https://tanstack.com/query/latest)** for efficient data fetching, caching, and state synchronization.
- **Centralized API Service Layer**: A dedicated `api/` or `resources/api/` directory will house all API communication logic.
- **Robust UI State Handling**: Includes loading indicators, user-friendly error messages, and appropriate success notifications.
- **Server Components**: Handling data fetching logic directly on the server for better performance and SEO.

### Performance Optimization

- **Server Components**: Using server-side rendering to reduce client-side JavaScript and improve initial load times.
- **Strategic Memoization**: Using `useMemo` and `useCallback` to reduce unnecessary re-renders.
- **Lazy Loading**: Implementing `React.lazy` and `Suspense` for improved initial load times.
- **Debouncing/Throttling**: Used for expensive operations triggered by user interactions.
- **[Remix](https://hygraph.com/blog/remix-vs-next)-Specific Optimizations**:
  - **Nested Routing and Data Loading**: Fetching only required data for specific UI parts.
  - **Transitions for Smooth Navigation**: Using [Remix](https://hygraph.com/blog/remix-vs-next)'s transitions API.

### Testing

- **Component Testing**: Using **[Jest](https://jestjs.io/)** and **React Testing Library**.
- **End-to-End (E2E) Testing**: Using **[Cypress](https://www.cypress.io/)** or **Playwright**.
- **Integration Testing**: Ensuring seamless interactions between components and APIs.
- **API Testing**: Ensuring endpoints handle requests and responses correctly.
- **Test-Driven Development (TDD)**: Writing tests before implementing features where appropriate.
- **Continuous Integration**: Automating tests in a CI pipeline.

### Accessibility (A11y)

- Follow **WCAG guidelines** to ensure accessibility compliance.
- Use semantic HTML elements (`<button>`, `<nav>`, `<article>`).
- Ensure keyboard navigation and screen reader support.
- Use tools like **Axe** or **Lighthouse** to check for accessibility issues.

### Code Quality and Maintainability

- Enforce **code formatting** with **Prettier** and **ESLint**.
- Use **Git hooks (Husky)** to enforce linting and testing before commits.
- Maintain **clear and concise documentation** for components and utilities.
- Follow **DRY (Don’t Repeat Yourself)** and **KISS (Keep It Simple, Stupid)** principles.

### Deployment and CI/CD

- Use **GitHub Actions** for automated testing and deployment.
- Ensure proper **environment configuration**. See [env.example](env.example).
- Implement **feature flags** for rolling out new features gradually.
- Monitor performance and errors using tools like **Sentry** or **LogRocket**.
- Integrate OpenTelemetry for distributed tracing, metrics, and logging to improve observability across services.
