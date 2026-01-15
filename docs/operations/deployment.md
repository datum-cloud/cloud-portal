# Deployment

This document covers building, deploying, and configuring the cloud portal.

---

## Overview

The cloud portal can be deployed via:

- **Docker** - Containerized deployment
- **Kubernetes** - Production orchestration
- **Pulumi** - Infrastructure as code

---

## Building for Production

### Build Command

```bash
# Build the application
bun run build

# Output structure
build/
├── client/          # Static assets (CSS, JS, images)
│   ├── assets/
│   └── ...
└── server/          # Server bundle
    └── index.js
```

### Build Configuration

Build settings in `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    target: 'esnext',
    rollupOptions: {
      // Externalize server-only dependencies
      external: ['@opentelemetry/sdk-node'],
    },
  },
});
```

### Environment Variables

Production environment variables:

```bash
# Required
NODE_ENV=production
AUTH_URL=https://auth.datum.net
AUTH_ISSUER=https://auth.datum.net
AUTH_CLIENT_ID=cloud-portal
AUTH_CLIENT_SECRET=<secret>
SESSION_SECRET=<32-char-random-string>

# API Endpoints
CLOUD_GATEWAY_API_URL=https://api.datum.net
NETWORK_GATEWAY_API_URL=https://network.datum.net

# Observability
SENTRY_DSN=https://xxx@sentry.io/xxx
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.datum.net
OTEL_SERVICE_NAME=cloud-portal

# Optional
PORT=3000
HOST=0.0.0.0
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM oven/bun:1 AS builder

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim AS runner

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Building the Image

```bash
# Build
docker build -t cloud-portal:latest .

# Run locally
docker run -p 3000:3000 \
  -e AUTH_URL=https://auth.datum.net \
  -e AUTH_CLIENT_ID=cloud-portal \
  -e AUTH_CLIENT_SECRET=secret \
  -e SESSION_SECRET=your-session-secret \
  cloud-portal:latest
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  cloud-portal:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AUTH_URL=${AUTH_URL}
      - AUTH_CLIENT_ID=${AUTH_CLIENT_ID}
      - AUTH_CLIENT_SECRET=${AUTH_CLIENT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Kubernetes Deployment

### Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloud-portal
  labels:
    app: cloud-portal
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cloud-portal
  template:
    metadata:
      labels:
        app: cloud-portal
    spec:
      containers:
        - name: cloud-portal
          image: gcr.io/datum/cloud-portal:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: AUTH_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: cloud-portal-secrets
                  key: auth-client-secret
            - name: SESSION_SECRET
              valueFrom:
                secretKeyRef:
                  name: cloud-portal-secrets
                  key: session-secret
          envFrom:
            - configMapRef:
                name: cloud-portal-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloud-portal-config
data:
  AUTH_URL: "https://auth.datum.net"
  AUTH_ISSUER: "https://auth.datum.net"
  AUTH_CLIENT_ID: "cloud-portal"
  CLOUD_GATEWAY_API_URL: "https://api.datum.net"
  NETWORK_GATEWAY_API_URL: "https://network.datum.net"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4318"
  OTEL_SERVICE_NAME: "cloud-portal"
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloud-portal-secrets
type: Opaque
stringData:
  auth-client-secret: <base64-encoded>
  session-secret: <base64-encoded>
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cloud-portal
spec:
  selector:
    app: cloud-portal
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cloud-portal
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - portal.datum.net
      secretName: cloud-portal-tls
  rules:
    - host: portal.datum.net
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: cloud-portal
                port:
                  number: 80
```

### Deploying

```bash
# Create namespace
kubectl create namespace cloud-portal

# Apply manifests
kubectl apply -f k8s/ -n cloud-portal

# Check status
kubectl get pods -n cloud-portal
kubectl logs -f deployment/cloud-portal -n cloud-portal
```

---

## Pulumi Infrastructure

### Project Structure

```
infra/
├── Pulumi.yaml
├── Pulumi.prod.yaml
├── index.ts
└── components/
    ├── portal.ts
    └── observability.ts
```

### Example Configuration

```typescript
// infra/index.ts
import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as docker from '@pulumi/docker';

const config = new pulumi.Config();
const env = pulumi.getStack();

// Build and push image
const image = new docker.Image('cloud-portal', {
  imageName: `gcr.io/datum/cloud-portal:${env}`,
  build: {
    context: '../',
    dockerfile: '../Dockerfile',
  },
});

// Deploy to Kubernetes
const deployment = new k8s.apps.v1.Deployment('cloud-portal', {
  spec: {
    replicas: config.getNumber('replicas') || 3,
    selector: { matchLabels: { app: 'cloud-portal' } },
    template: {
      metadata: { labels: { app: 'cloud-portal' } },
      spec: {
        containers: [{
          name: 'cloud-portal',
          image: image.imageName,
          ports: [{ containerPort: 3000 }],
          envFrom: [{ configMapRef: { name: 'cloud-portal-config' } }],
        }],
      },
    },
  },
});

export const url = pulumi.interpolate`https://portal.datum.net`;
```

### Deploying with Pulumi

```bash
# Preview changes
pulumi preview

# Deploy
pulumi up

# View outputs
pulumi stack output
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun run test

      - name: Build
        run: bun run build

      - name: Build Docker image
        run: docker build -t gcr.io/datum/cloud-portal:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo "${{ secrets.GCR_KEY }}" | docker login -u _json_key --password-stdin gcr.io
          docker push gcr.io/datum/cloud-portal:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/cloud-portal \
            cloud-portal=gcr.io/datum/cloud-portal:${{ github.sha }} \
            -n cloud-portal
```

---

## Health Checks

### Health Endpoint

The portal exposes `/health` for liveness/readiness probes:

```typescript
// Response
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600
}
```

### Readiness vs Liveness

- **Liveness**: Is the process running? (restart if not)
- **Readiness**: Can it handle traffic? (remove from LB if not)

---

## Rollback

### Kubernetes Rollback

```bash
# View history
kubectl rollout history deployment/cloud-portal -n cloud-portal

# Rollback to previous
kubectl rollout undo deployment/cloud-portal -n cloud-portal

# Rollback to specific revision
kubectl rollout undo deployment/cloud-portal --to-revision=2 -n cloud-portal
```

### Pulumi Rollback

```bash
# View history
pulumi stack history

# Restore previous state
pulumi stack export --version <version> | pulumi stack import
```

---

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cloud-portal
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cloud-portal
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Manual Scaling

```bash
kubectl scale deployment/cloud-portal --replicas=5 -n cloud-portal
```

---

## Related Documentation

- [Environment Setup](../getting-started/02-environment-setup.md) - Local config
- [Observability](./observability.md) - Monitoring setup
- [Troubleshooting](./troubleshooting.md) - Common issues
