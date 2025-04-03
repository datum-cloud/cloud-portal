import { NODE_COLORS } from './constants'
import { BootImageNode } from './nodes/boot-image'
import { ContainerGroupNode, ContainerNode } from './nodes/container'
import { NetworkGroupNode, NetworkNode } from './nodes/network'
import { PlacementGroupNode, PlacementNode } from './nodes/placement'
import { PortGroupNode, PortNode } from './nodes/port'
import { RuntimeNode } from './nodes/runtime'
import { StorageGroupNode, StorageNode } from './nodes/storage'
import { WorkloadNode } from './nodes/workload'
import { Edge, NodeTypes } from '@xyflow/react'

// Types for edge creation
export interface IEdgeOptions {
  sourceHandle?: string
  targetHandle?: string
  animated?: boolean
  label?: string
  style?: Record<string, unknown>
}

// Add type for edge data
export interface IEdgeData {
  targetType: keyof typeof NODE_COLORS
  [key: string]: unknown
}

// Extended Edge type with our custom data
export type CustomEdge = Edge<IEdgeData>

// Define custom node types

export interface IGroupNode {
  label: string
  isCompact?: boolean
  isCollapsed?: boolean
  onToggle?: () => void
  [key: string]: unknown
}

export const nodeTypes: NodeTypes = {
  workload: WorkloadNode,
  placement: PlacementNode,
  runtime: RuntimeNode,
  container: ContainerNode,
  storage: StorageNode,
  network: NetworkNode,
  port: PortNode,
  bootImage: BootImageNode,
  // Group nodes
  networkGroup: NetworkGroupNode,
  storageGroup: StorageGroupNode,
  placementGroup: PlacementGroupNode,
  containerGroup: ContainerGroupNode,
  portGroup: PortGroupNode,
}
