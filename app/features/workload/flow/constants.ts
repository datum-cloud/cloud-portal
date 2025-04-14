// Define node type colors for edge matching
export const NODE_COLORS = {
  workload: '#000000',
  placement: '#2563eb', // blue
  runtime: '#ec4899', // pink
  container: '#9333ea', // purple
  storage: '#ca8a04', // yellow
  network: '#0891b2', // cyan
  port: '#4f46e5', // indigo
  bootImage: '#10b981', // emerald
  // Group node colors
  networkGroup: '#0891b2', // cyan (same as network)
  storageGroup: '#ca8a04', // yellow (same as storage)
  placementGroup: '#2563eb', // blue (same as placement)
  containerGroup: '#9333ea', // purple (same as container)
  portGroup: '#4f46e5', // indigo (same as port)
}

// Highlight colors (brighter versions of the regular colors)
export const HIGHLIGHT_COLORS = {
  workload: '#666666',
  placement: '#3b82f6', // bright blue
  runtime: '#f472b6', // bright pink
  container: '#a855f7', // bright purple
  storage: '#eab308', // bright yellow
  network: '#06b6d4', // bright cyan
  port: '#6366f1', // bright indigo
  bootImage: '#34d399', // bright emerald
  // Group node highlight colors
  networkGroup: '#06b6d4', // bright cyan
  storageGroup: '#eab308', // bright yellow
  placementGroup: '#3b82f6', // bright blue
  containerGroup: '#a855f7', // bright purple
  portGroup: '#6366f1', // bright indigo
}
