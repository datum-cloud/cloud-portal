import SampleHomeCard from './cards/sample-home-card';
import PlatformData from './pages/platform-data';
import { DetailView } from './pages/sample-detail';
import SamplePage from './pages/sample-page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, MemoryRouter, Route, Routes } from 'react-router';

// Standalone preview only. Wraps the pages in a MemoryRouter so `useParams()`
// resolves the same params the host mount would supply, and a QueryClientProvider
// so the data hooks run — exactly what the host provides in production. Data
// calls hit /api/proxy/... which 404s standalone (no portal proxy), so the data
// pages show their error states; that's expected here. Run the full portal to
// see live data.
const queryClient = new QueryClient();

const base = '/project/:projectId/services/:serviceSlug';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div
        style={{ maxWidth: 820, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
        <p style={{ opacity: 0.6 }}>
          Standalone preview — the portal loads this plugin via
          <code> /plugin-manifest.json</code> and <code>/remoteEntry.js</code>, not this page. Data
          pages 404 here (no portal proxy).
        </p>
        <MemoryRouter initialEntries={['/project/demo-project/services/sample/home']}>
          <nav style={{ display: 'flex', gap: '1rem', margin: '0 0 1rem' }}>
            <Link to="/project/demo-project/services/sample/home">Home</Link>
            <Link to="/project/demo-project/services/sample/platform">Platform data</Link>
          </nav>
          <Routes>
            <Route path={`${base}/home`} element={<SamplePage />} />
            <Route path={`${base}/items/:itemId`} element={<DetailView />} />
            <Route path={`${base}/platform`} element={<PlatformData />} />
          </Routes>
        </MemoryRouter>
        <hr style={{ margin: '2rem 0' }} />
        <SampleHomeCard />
      </div>
    </QueryClientProvider>
  </StrictMode>
);
