# Features

This directory contains the feature-based modules of the application. Each folder within this directory represents a "vertical slice" of the application and should be a self-contained unit of functionality.

## Module Structure

Each feature module follows a standardized structure to ensure consistency and maintainability across the codebase.

```
app/features/[feature-name]/
│
├── components/               # Sub-components used only within this feature
│   ├── [sub-component-a].tsx
│   └── [sub-component-b].tsx
│
├── [feature-name]-form.tsx   # The main, top-level component for the feature
│
└── index.ts                  # Exports only the public components of the module
```

### Key Principles

- **Encapsulation:** A feature should only expose its main, top-level components through its `index.ts` barrel file. The `components` directory is considered an internal implementation detail of the feature and should not be imported directly by other features.
- **Naming Conventions:** Main components are named after the feature (e.g., `workload-form.tsx`).
- **Co-location:** All UI code related to a single feature lives within its dedicated folder.
