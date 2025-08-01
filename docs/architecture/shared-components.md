# Components

This directory is the central UI library for the application. It contains all the reusable components that are not specific to a single feature.

## Directory Structure

The `components` directory is organized by the component's scope and purpose:

- **`app/components/common/`**: Contains highly reusable, general-purpose components that can be used anywhere in the application (e.g., `DataTable`, `StatusBadge`, `SelectLabels`). If a component is used across multiple features, it's a good candidate for this directory.

- **`app/components/forms/`**: Contains components that are specifically designed for building forms. This includes foundational components like `Field` as well as more specialized form controls.

- **`app/components/layout/`**: Contains components that define the overall structure and layout of the application, such as the main dashboard, sidebars, and headers.

- **`app/components/ui/`**: This directory is managed by `shadcn/ui` and contains the base UI primitives (e.g., `Button`, `Card`, `Input`). These components are the building blocks for all other components in the application.

### Guiding Principles

- **Reusability:** The primary goal of this directory is to house components that can be reused. If a component is only used within a single feature, it should live inside that feature's `components` directory instead.
- **Generality:** Components here should be generic and not contain any business logic specific to a particular feature. They should receive all their data and functionality via props.
