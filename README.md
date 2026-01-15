<p align="center">
  <img
    width="64px"
    src="docs/assets/logo.png"
    style="border: 1px solid #e5e7eb; border-radius: 0.5rem;"
  />

  <h1 align="center">Datum Cloud Portal</h1>

  <p align="center">
    Modern cloud infrastructure management portal
  </p>
</p>

---

## About

The Datum Cloud Portal is a web application for managing cloud infrastructure resources. It provides a unified interface for managing organizations, projects, DNS zones, networking, compute resources, and more.

### Key Features

- **Organization & Project Management** - Create and manage organizations, invite members, and organize resources into projects
- **DNS Management** - Configure DNS zones, records, and domain routing
- **Networking** - Set up HTTP proxies, load balancers, and network policies
- **Real-Time Updates** - Live resource status via Kubernetes Watch API
- **Role-Based Access** - Fine-grained permissions and access control

### Built With

- **React Router v7** - Full-stack React framework with SSR
- **Hono** - Lightweight, high-performance server
- **TanStack Query** - Server state management and caching
- **shadcn/ui + Tailwind CSS** - Modern component library
- **OpenAPI** - Type-safe API clients generated from specs

---

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

---

## Documentation

See the **[Developer Documentation](docs/README.md)** for setup guides, architecture details, and development workflows.

---

## License

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdatum-cloud%2Fcloud-portal.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdatum-cloud%2Fcloud-portal?ref=badge_large)
