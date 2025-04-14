import { HIGHLIGHT_COLORS, NODE_COLORS } from './constants'
import { IPlacementNode } from './nodes/placement'
import { IRuntimeNode } from './nodes/runtime'
import { IWorkloadNode } from './nodes/workload'
import { IEdgeOptions, CustomEdge, nodeTypes } from './types'
import { RuntimeType } from '@/resources/interfaces/workload.interface'
import { NewWorkloadSchema } from '@/resources/schemas/workload.schema'
import {
  Edge,
  useNodesState,
  Node,
  useEdgesState,
  MarkerType,
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import ELK from 'elkjs/lib/elk-api'
// Initialize ELK layout engine
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

export const WorkloadFlow = ({
  workloadData,
  maxNodes = 4,
}: {
  workloadData: NewWorkloadSchema
  maxNodes?: number
}) => {
  const elk = new ELK({
    workerUrl: '/js/elk-worker.min.js',
  })
  // State to track selected elements
  const [selectedNode, setSelectedNode] = useState<string>()
  const [selectedEdge, setSelectedEdge] = useState<string>()

  // State to track which groups are collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // Define initial states with proper typing
  const initialNodes: Node[] = []
  const initialEdges: Edge[] = []

  // State for nodes and edges with correct typing
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [defaultZoom, setDefaultZoom] = useState(0.7)

  // Add a toggle function for expanding/collapsing groups
  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }, [])

  // Function to create an edge with target node color
  const createEdge = (
    id: string,
    source: string,
    target: string,
    targetType: keyof typeof NODE_COLORS,
    options: IEdgeOptions = {},
  ): CustomEdge => {
    const baseStyle = {
      stroke: NODE_COLORS[targetType],
      strokeWidth: 2.5,
      ...options.style,
    }

    return {
      id,
      source,
      target,
      sourceHandle: options.sourceHandle,
      targetHandle: options.targetHandle,
      animated: options.animated || false,
      type: 'bezier',
      style: baseStyle,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: NODE_COLORS[targetType],
        width: 15,
        height: 15,
      },
      data: {
        targetType,
      },
    }
  }

  // Create initial nodes and edges
  const { initialNodesData, initialEdgesData, isCompactMode } = useMemo(() => {
    const nodesData: Node[] = []
    const edgesData: Edge[] = []

    // Determine if we should use compact sizing
    const isCompactMode =
      (workloadData.runtime.runtimeType === RuntimeType.CONTAINER &&
        (workloadData.runtime.containers ?? []).length > maxNodes) ||
      (workloadData.networks ?? []).length > maxNodes ||
      (workloadData.storages ?? []).length > maxNodes ||
      (workloadData.placements ?? []).length > maxNodes

    // Add workload node (root)
    const workloadNodeId = `workload-${workloadData.metadata.name}`
    nodesData.push({
      id: workloadNodeId,
      type: 'workload',
      position: { x: 0, y: 0 }, // Position will be set by ELK
      data: {
        label: `Workload: ${workloadData.metadata.name}`,
        ...workloadData.metadata,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        uid: (workloadData as any).uid,
        isCompact: isCompactMode,
      } as IWorkloadNode,
    })

    // Add group nodes
    const networkGroupId = 'network-group'
    const storageGroupId = 'storage-group'
    const placementGroupId = 'placement-group'

    // Network group
    if (workloadData.networks && workloadData.networks.length > 0) {
      // Add network group node
      nodesData.push({
        id: networkGroupId,
        type: 'networkGroup',
        position: { x: 0, y: 0 }, // Position will be set by ELK
        data: {
          label: 'Network Interfaces',
          isCompact: isCompactMode,
          isCollapsed: !!collapsedGroups[networkGroupId],
          onToggle: () => toggleGroupCollapse(networkGroupId),
        },
      })

      // Connect workload to network group
      edgesData.push(
        createEdge(
          `e-${workloadNodeId}-${networkGroupId}`,
          workloadNodeId,
          networkGroupId,
          'networkGroup',
        ),
      )

      // Add individual network nodes
      workloadData.networks.forEach((network) => {
        const networkNodeId = `network-${network.name}`

        // Add network node
        nodesData.push({
          id: networkNodeId,
          type: 'network',
          position: { x: 0, y: 0 }, // Position will be set by ELK
          data: {
            label: network.name,
            name: network.name,
            ipFamilies: network.ipFamilies,
            isCompact: isCompactMode,
          },
        })

        // Connect network group to network
        edgesData.push(
          createEdge(
            `e-${networkGroupId}-${networkNodeId}`,
            networkGroupId,
            networkNodeId,
            'network',
          ),
        )
      })
    }

    // Storage group
    if (workloadData.storages && workloadData.storages.length > 0) {
      // Add storage group node
      nodesData.push({
        id: storageGroupId,
        type: 'storageGroup',
        position: { x: 0, y: 0 }, // Position will be set by ELK
        data: {
          label: 'Storage Volumes',
          isCompact: isCompactMode,
          isCollapsed: !!collapsedGroups[storageGroupId],
          onToggle: () => toggleGroupCollapse(storageGroupId),
        },
      })

      // Connect workload to storage group
      edgesData.push(
        createEdge(
          `e-ws-${workloadNodeId}-${storageGroupId}`,
          workloadNodeId,
          storageGroupId,
          'storageGroup',
        ),
      )

      // Add individual storage nodes
      workloadData.storages.forEach((storage) => {
        const storageNodeId = `storage-${storage.name}`

        // Add storage node
        nodesData.push({
          id: storageNodeId,
          type: 'storage',
          position: { x: 0, y: 0 }, // Position will be set by ELK
          data: {
            label: storage.name,
            name: storage.name,
            type: storage.type || (storage.bootImage ? 'boot' : 'filesystem'),
            size: storage.size || 0,
            isCompact: isCompactMode,
          },
        })

        // Connect storage group to storage
        edgesData.push(
          createEdge(
            `e-ss-${storageGroupId}-${storageNodeId}`,
            storageGroupId,
            storageNodeId,
            'storage',
          ),
        )
      })
    }

    // Placement group
    if (workloadData.placements && workloadData.placements.length > 0) {
      // Add placement group node
      nodesData.push({
        id: placementGroupId,
        type: 'placementGroup',
        position: { x: 0, y: 0 }, // Position will be set by ELK
        data: {
          label: 'Placements',
          isCompact: isCompactMode,
          isCollapsed: !!collapsedGroups[placementGroupId],
          onToggle: () => toggleGroupCollapse(placementGroupId),
        },
      })

      // Connect workload to placement group
      edgesData.push(
        createEdge(
          `e-wp-${workloadNodeId}-${placementGroupId}`,
          workloadNodeId,
          placementGroupId,
          'placementGroup',
        ),
      )

      // Add individual placement nodes
      workloadData.placements.forEach((placement) => {
        const placementNodeId = `placement-${placement.name}-${placement.cityCode}`

        // Add placement node
        nodesData.push({
          id: placementNodeId,
          type: 'placement',
          position: { x: 0, y: 0 }, // Position will be set by ELK
          data: {
            label: placement.name,
            name: placement.name,
            cityCode: placement.cityCode,
            minimumReplicas: placement.minimumReplicas,
            isCompact: isCompactMode,
          } as IPlacementNode,
        })

        // Connect placement group to placement
        edgesData.push(
          createEdge(
            `e-pp-${placementGroupId}-${placementNodeId}`,
            placementGroupId,
            placementNodeId,
            'placement',
          ),
        )
      })
    }

    // Runtime and containers/VM
    if (workloadData.runtime) {
      const runtime = workloadData.runtime
      const runtimeNodeId = `runtime-${runtime.instanceType}`

      // Add runtime node
      nodesData.push({
        id: runtimeNodeId,
        type: 'runtime',
        position: { x: 0, y: 0 }, // Position will be set by ELK
        data: {
          // label: runtime.runtimeType === 'vm' ? 'Virtual Machine' : runtime.runtimeType,
          label: 'Runtime',
          instanceType: runtime.instanceType,
          runtimeType: runtime.runtimeType,
          // Add VM-specific data if this is a VM
          ...(runtime.runtimeType === RuntimeType.VM && {
            sshKey: runtime.virtualMachine?.sshKey,
            vmPorts: runtime.virtualMachine?.ports
              ? (runtime.virtualMachine?.ports ?? [])
                  .map((p) => `${p.port}/${p.protocol}`)
                  .join(', ')
              : '',
          }),
          isCompact: isCompactMode,
        } as IRuntimeNode,
      })

      // Connect workload to runtime
      edgesData.push(
        createEdge(
          `e-wr-${workloadNodeId}-${runtimeNodeId}`,
          workloadNodeId,
          runtimeNodeId,
          'runtime',
        ),
      )

      // Handle VM or Container based on runtime type
      if (
        runtime.runtimeType === RuntimeType.VM &&
        typeof runtime.virtualMachine !== 'undefined'
      ) {
        // This is a VM workload
        const vmNode = runtime.virtualMachine

        // Add boot image node
        const bootImageNodeId = `bootimage-${workloadData.metadata.name}`
        nodesData.push({
          id: bootImageNodeId,
          type: 'bootImage',
          position: { x: 0, y: 0 }, // Position will be set by ELK
          data: {
            label: 'Boot Image',
            bootImage: vmNode.bootImage,
            isCompact: isCompactMode,
          },
        })

        // Connect runtime to boot image using source-right to target-left
        edgesData.push(
          createEdge(
            `e-rb-${runtimeNodeId}-${bootImageNodeId}`,
            runtimeNodeId,
            bootImageNodeId,
            'bootImage',
            {
              sourceHandle: 'source-bottom',
              targetHandle: 'target',
            },
          ),
        )

        // Add port group and ports for VM if it has ports
        if (typeof vmNode.ports !== 'undefined' && (vmNode.ports ?? []).length > 0) {
          const portGroupId = `port-group-vm`

          // Add port group node
          nodesData.push({
            id: portGroupId,
            type: 'portGroup',
            position: { x: 0, y: 0 }, // Position will be set by ELK
            data: {
              label: 'Ports',
              isCompact: isCompactMode,
              isCollapsed: !!collapsedGroups[portGroupId],
              onToggle: () => toggleGroupCollapse(portGroupId),
            },
          })

          // Connect runtime directly to port group (instead of VM)
          // Use source-bottom handle to position it below the runtime
          edgesData.push(
            createEdge(
              `e-rp-${runtimeNodeId}-${portGroupId}`,
              runtimeNodeId,
              portGroupId,
              'portGroup',
              {
                sourceHandle: 'source-bottom',
                animated: false,
              },
            ),
          )

          // Add port nodes
          vmNode.ports.forEach((portData) => {
            const portNodeId = `port-vm-${portData.name}`

            // Add port node
            nodesData.push({
              id: portNodeId,
              type: 'port',
              position: { x: 0, y: 0 }, // Position will be set by ELK
              data: {
                label: portData.name,
                name: portData.name,
                port: portData.port,
                protocol: portData.protocol,
                isCompact: isCompactMode,
              },
            })

            // Connect port group to port
            edgesData.push(
              createEdge(
                `e-pp-${portGroupId}-${portNodeId}`,
                portGroupId,
                portNodeId,
                'port',
              ),
            )
          })
        }
      } else if (
        runtime.runtimeType === RuntimeType.CONTAINER &&
        typeof runtime.containers !== 'undefined'
      ) {
        // This is a container workload
        const containerGroupId = 'container-group'

        // Add container group node
        nodesData.push({
          id: containerGroupId,
          type: 'containerGroup',
          position: { x: 0, y: 0 }, // Position will be set by ELK
          data: {
            label: 'Containers',
            isCompact: isCompactMode,
            isCollapsed: !!collapsedGroups[containerGroupId],
            onToggle: () => toggleGroupCollapse(containerGroupId),
          },
        })

        // Connect runtime to container group
        edgesData.push(
          createEdge(
            `e-rc-${runtimeNodeId}-${containerGroupId}`,
            runtimeNodeId,
            containerGroupId,
            'containerGroup',
          ),
        )

        // Add container nodes
        runtime.containers.forEach((container) => {
          const containerNodeId = `container-${container.name}`

          // Add container node
          nodesData.push({
            id: containerNodeId,
            type: 'container',
            position: { x: 0, y: 0 }, // Position will be set by ELK
            data: {
              label: container.name,
              name: container.name,
              image: container.image,
              ports: (container.ports ?? [])
                .map((p) => `${p.port}/${p.protocol}`)
                .join(', '),
              isCompact: isCompactMode,
            },
          })

          // Connect container group to container
          edgesData.push(
            createEdge(
              `e-cc-${containerGroupId}-${containerNodeId}`,
              containerGroupId,
              containerNodeId,
              'container',
            ),
          )

          // Add port group and ports
          if (
            typeof container.ports !== 'undefined' &&
            (container.ports ?? []).length > 0
          ) {
            const portGroupId = `port-group-${container.name}`

            // Add port group node
            nodesData.push({
              id: portGroupId,
              type: 'portGroup',
              position: { x: 0, y: 0 }, // Position will be set by ELK
              data: {
                label: 'Ports',
                isCompact: isCompactMode,
                isCollapsed: !!collapsedGroups[portGroupId],
                onToggle: () => toggleGroupCollapse(portGroupId),
              },
            })

            // Connect container to port group
            edgesData.push(
              createEdge(
                `e-cp-${containerNodeId}-${portGroupId}`,
                containerNodeId,
                portGroupId,
                'portGroup',
              ),
            )

            // Add port nodes
            container.ports.forEach((portData) => {
              const portNodeId = `port-${container.name}-${portData.name}`

              // Add port node
              nodesData.push({
                id: portNodeId,
                type: 'port',
                position: { x: 0, y: 0 }, // Position will be set by ELK
                data: {
                  label: portData.name,
                  name: portData.name,
                  port: portData.port,
                  protocol: portData.protocol,
                  isCompact: isCompactMode,
                },
              })

              // Connect port group to port
              edgesData.push(
                createEdge(
                  `e-cp-${portGroupId}-${portNodeId}`,
                  portGroupId,
                  portNodeId,
                  'port',
                ),
              )
            })
          }
        })
      }
    }

    return {
      initialNodesData: nodesData,
      initialEdgesData: edgesData,
      isCompactMode,
    }
  }, [workloadData, collapsedGroups, toggleGroupCollapse])

  // Apply automatic layout using ELK
  useLayoutEffect(() => {
    // Skip if no nodes or edges
    if (initialNodesData.length === 0) return

    // Find if we have a VM workload with boot image
    const hasBootImage = initialNodesData.some((node) => node.type === 'bootImage')

    // Define the ELK graph structure
    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': isCompactMode ? '80' : '110',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
        'elk.partitioning.activate': 'false',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        // Special options for boot image node
        ...(hasBootImage && {
          'elk.padding': '[left=50, right=200, top=50, bottom=50]',
          'elk.separateConnectedComponents': 'false',
        }),
      },
      children: initialNodesData.map((node) => ({
        id: node.id,
        // Custom size for boot image nodes to ensure they fit side by side with runtime
        width:
          node.type === 'bootImage'
            ? 230
            : node.type && node.type.includes('Group')
              ? 250
              : 200,
        height: node.type && node.type.includes('Group') ? 60 : 120,
        // Special layout options for boot image node
        ...(node.type === 'bootImage' && {
          layoutOptions: {
            'elk.position': '(350, 0)',
            'elk.alignment': 'RIGHT',
          },
        }),
      })),
      edges: initialEdgesData.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
        // Special layout for boot image edges
        ...(edge.target.startsWith('bootimage-') && {
          layoutOptions: {
            'elk.layered.layering.layerConstraint': 'SAME_LAYER',
          },
        }),
      })),
    }

    // Run the layout algorithm
    elk
      .layout(elkGraph)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((layoutedGraph: any) => {
        if (layoutedGraph.children) {
          // Apply positions to nodes
          const layoutedNodes = initialNodesData.map((node) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const elkNode = layoutedGraph.children?.find((n: any) => n.id === node.id)
            if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
              return {
                ...node,
                position: {
                  x: elkNode.x,
                  y: elkNode.y,
                },
              }
            }
            return node
          })

          // Update the state with the positioned nodes and edges
          setNodes(layoutedNodes as Node[])
          setEdges(initialEdgesData as Edge[])

          // Calculate appropriate zoom level based on graph size
          const nodesWithPositions = layoutedNodes.filter(
            (n) => n.position.x !== undefined && n.position.y !== undefined,
          )

          if (nodesWithPositions.length > 0) {
            const minX = Math.min(...nodesWithPositions.map((n) => n.position.x))
            const maxX = Math.max(
              ...nodesWithPositions.map(
                (n) => n.position.x + (n.type && n.type.includes('Group') ? 250 : 200),
              ),
            )
            const minY = Math.min(...nodesWithPositions.map((n) => n.position.y))
            const maxY = Math.max(
              ...nodesWithPositions.map(
                (n) => n.position.y + (n.type && n.type.includes('Group') ? 60 : 120),
              ),
            )

            const graphWidth = maxX - minX + 300
            const graphHeight = maxY - minY + 300

            // Set zoom level based on graph size
            setDefaultZoom(Math.min(0.8, Math.min(1200 / graphWidth, 800 / graphHeight)))
          }
        }
      })
      .catch(console.error)
  }, [initialNodesData, initialEdgesData, setNodes, setEdges, isCompactMode])

  // Get all group IDs including dynamic port groups
  const getGroupIds = useCallback(() => {
    const staticGroupIds = [
      'network-group',
      'storage-group',
      'placement-group',
      'container-group',
    ]
    const portGroupIds = nodes
      .filter((node) => node.type === 'portGroup')
      .map((node) => node.id)
    return [...staticGroupIds, ...portGroupIds]
  }, [nodes])

  // Function to check if a node should be hidden based on collapsed groups and hierarchy
  const shouldNodeBeHidden = useCallback(
    (nodeId: string, processedNodes = new Set<string>()) => {
      // Prevent infinite recursion
      if (processedNodes.has(nodeId)) return false
      processedNodes.add(nodeId)

      // Find the node and get its type
      const node = nodes.find((n) => n.id === nodeId)
      const nodeType = node?.type

      // Handle boot image node
      if (nodeType === 'bootImage') {
        // Boot image should be hidden if its parent runtime is hidden
        const runtimeNode = nodes.find(
          (n) => n.type === 'runtime' && n.data.runtimeType === RuntimeType.VM,
        )
        if (runtimeNode?.hidden) {
          return true
        }
      }

      // Special case for portGroup nodes
      if (nodeType === 'portGroup') {
        // Check if this is a VM port group
        if (nodeId === 'port-group-vm') {
          // VM ports should be hidden if runtime is hidden
          const runtimeNode = nodes.find(
            (n) => n.type === 'runtime' && n.data.runtimeType === RuntimeType.VM,
          )
          if (runtimeNode?.hidden) {
            return true
          }

          // Also hide if the port group is collapsed
          if (collapsedGroups[nodeId]) {
            return true
          }
        } else {
          // Always hide port groups when container group is collapsed
          if (collapsedGroups['container-group']) {
            return true
          }

          // Check if this port group's container parent is hidden
          // Extract the container name from port group ID (port-group-container-name)
          const containerName = nodeId.replace('port-group-', '')
          const containerId = `container-${containerName}`

          // Check if container exists and is hidden
          const containerNode = nodes.find((n) => n.id === containerId)
          if (containerNode?.hidden) {
            return true
          }

          // Check if container should be hidden via parent collapse
          if (
            edges.some(
              (edge) =>
                edge.target === containerId &&
                edge.source === 'container-group' &&
                collapsedGroups['container-group'],
            )
          ) {
            return true
          }
        }
      }

      // Check direct parent groups
      const groupIds = getGroupIds()
      const parentEdges = edges.filter(
        (edge) => edge.target === nodeId && groupIds.includes(edge.source),
      )

      // If any direct parent is collapsed, this node should be hidden
      for (const edge of parentEdges) {
        if (collapsedGroups[edge.source]) {
          return true
        }
      }

      // Check if any ancestor (grandparent, etc.) is collapsed
      for (const edge of parentEdges) {
        const parentId = edge.source
        // If parent node is hidden (due to its own parent being collapsed), this node should be hidden too
        if (shouldNodeBeHidden(parentId, processedNodes)) {
          return true
        }
      }

      // Find containers or VM that this node might be connected to
      if (nodeId.startsWith('port-')) {
        if (nodeId.startsWith('port-vm-')) {
          // This is a VM port, check if runtime is hidden
          const runtimeNode = nodes.find(
            (n) => n.type === 'runtime' && n.data.runtimeType === RuntimeType.VM,
          )
          if (runtimeNode?.hidden) {
            return true
          }

          // Also check if port group is collapsed
          if (collapsedGroups['port-group-vm']) {
            return true
          }
        } else {
          // This is a container port
          const containerEdges = edges.filter(
            (edge) =>
              edge.target.startsWith('port-group-') &&
              edge.target.includes(nodeId.split('-')[1]),
          )

          for (const edge of containerEdges) {
            // If container is hidden, port should be hidden
            if (
              nodes.find((n) => n.id === edge.source)?.hidden ||
              shouldNodeBeHidden(edge.source, new Set(processedNodes))
            ) {
              return true
            }
          }
        }
      }

      return false
    },
    [edges, nodes, collapsedGroups, getGroupIds],
  )

  // Add an effect to handle collapsing/expanding groups with proper nesting
  useEffect(() => {
    // Skip if no nodes or edges are available yet
    if (!nodes.length || !edges.length) return

    // Track if we actually need to update state
    let needsUpdate = false

    // First pass: Process visibility for all nodes
    const updatedNodes = nodes.map((node) => {
      // Check if this is a port group node - handle special case
      if (node.type === 'portGroup') {
        // Find container this port group belongs to
        const containerName = node.id.replace('port-group-', '')
        const containerId = `container-${containerName}`

        // Port group should be hidden if:
        // 1. Container group is collapsed, or
        // 2. Container is hidden
        const containerNode = nodes.find((n) => n.id === containerId)
        const shouldBeHidden =
          collapsedGroups['container-group'] || (containerNode?.hidden ?? false)

        if (node.hidden !== shouldBeHidden) {
          needsUpdate = true
          return { ...node, hidden: shouldBeHidden }
        }

        return node
      }

      // Get all group IDs
      const groupIds = getGroupIds()

      // Skip group nodes themselves for visibility changes
      if (groupIds.includes(node.id) && !node.id.startsWith('port-group-')) {
        return node
      }

      // Determine if this node should be hidden based on collapsed groups
      const shouldBeHidden = shouldNodeBeHidden(node.id)

      // Only mark for update if visibility actually changes
      if (node.hidden !== shouldBeHidden) {
        needsUpdate = true
        return { ...node, hidden: shouldBeHidden }
      }

      return node
    })

    // Second pass: Process all edges based on updated node visibility
    const updatedEdges = edges.map((edge) => {
      // Find target and source nodes to determine visibility
      const targetNode = updatedNodes.find((n) => n.id === edge.target)
      const sourceNode = updatedNodes.find((n) => n.id === edge.source)

      // Edge should be hidden if either endpoint is hidden
      const shouldBeHidden =
        (targetNode && targetNode.hidden) || (sourceNode && sourceNode.hidden)

      // Only mark for update if visibility changes
      if (edge.hidden !== shouldBeHidden) {
        needsUpdate = true
        return { ...edge, hidden: shouldBeHidden }
      }

      return edge
    })

    // Only update state if we actually need to
    if (needsUpdate) {
      setNodes(updatedNodes)
      setEdges(updatedEdges)
    }
  }, [collapsedGroups, nodes, edges, getGroupIds, shouldNodeBeHidden])

  // Handle when a node is clicked
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Clear previous selections
      setSelectedEdge(undefined)

      // Toggle selection state
      if (selectedNode === node.id) {
        setSelectedNode(undefined)
      } else {
        setSelectedNode(node.id)
      }

      // Update edges to reflect selection
      setEdges((eds: Edge[]) =>
        eds.map((edge) => {
          const isSelected = edge.source === node.id || edge.target === node.id
          const edgeWithData = edge as CustomEdge
          const targetType = edgeWithData.data?.targetType || 'workload'

          return {
            ...edge,
            animated: isSelected,
            style: {
              ...edge.style,
              stroke: isSelected ? HIGHLIGHT_COLORS[targetType] : NODE_COLORS[targetType],
              strokeWidth: isSelected ? 3 : 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isSelected ? HIGHLIGHT_COLORS[targetType] : NODE_COLORS[targetType],
            },
          }
        }),
      )

      // Update nodes to show selected state
      setNodes((nds: Node[]) =>
        nds.map((n) => {
          let className = ''

          if (n.id === node.id) {
            className = 'ring-2 ring-offset-2 ring-blue-500 rounded-lg'
          } else if (
            edges.some(
              (e) =>
                (e.source === node.id && e.target === n.id) ||
                (e.target === node.id && e.source === n.id),
            )
          ) {
            className = 'ring-1 ring-blue-300 rounded-lg'
          }

          return {
            ...n,
            className,
          }
        }),
      )
    },
    [selectedNode, edges, setEdges, setNodes],
  )

  // Handle when an edge is clicked
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Clear previous selections
      setSelectedNode(undefined)

      // Toggle selection state
      if (selectedEdge === edge.id) {
        setSelectedEdge(undefined)
      } else {
        setSelectedEdge(edge.id)
      }

      // Update edges to reflect selection
      setEdges((eds: Edge[]) =>
        eds.map((e) => {
          const isSelected = e.id === edge.id
          const edgeWithData = e as CustomEdge
          const targetType = edgeWithData.data?.targetType || 'workload'

          return {
            ...e,
            animated: isSelected,
            style: {
              ...e.style,
              stroke: isSelected ? HIGHLIGHT_COLORS[targetType] : NODE_COLORS[targetType],
              strokeWidth: isSelected ? 4 : 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isSelected ? HIGHLIGHT_COLORS[targetType] : NODE_COLORS[targetType],
            },
          }
        }),
      )

      // Highlight connected nodes
      setNodes((nds: Node[]) =>
        nds.map((n) => {
          const isConnected = n.id === edge.source || n.id === edge.target

          return {
            ...n,
            className: isConnected ? 'ring-2 ring-offset-1 ring-blue-500' : '',
          }
        }),
      )
    },
    [selectedEdge, setEdges, setNodes],
  )

  // Reset selection when clicking on the canvas
  const onPaneClick = useCallback(() => {
    setSelectedNode(undefined)
    setSelectedEdge(undefined)

    // Reset edge styles
    setEdges((eds: Edge[]) =>
      eds.map((edge) => {
        const edgeWithData = edge as CustomEdge
        const targetType = edgeWithData.data?.targetType || 'workload'

        return {
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            stroke: NODE_COLORS[targetType],
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: NODE_COLORS[targetType],
          },
        }
      }),
    )

    // Reset node styles
    setNodes((nds: Node[]) =>
      nds.map((n) => ({
        ...n,
        className: '',
      })),
    )
  }, [setEdges, setNodes])

  return (
    <ReactFlow
      fitView
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={{
        type: 'bezier',
        style: { strokeWidth: 2 },
        animated: false,
      }}
      connectionLineStyle={{ stroke: '#ddd', strokeWidth: 2 }}
      defaultViewport={{ x: 0, y: 0, zoom: defaultZoom }}
      minZoom={0.1}
      maxZoom={2.5}
      fitViewOptions={{
        padding: 0.1,
        includeHiddenNodes: true,
      }}>
      <Background color="#f8fafc" gap={16} />
      <Controls />
      <MiniMap
        nodeStrokeColor={(n) => {
          switch (n.type) {
            case 'workload':
              return NODE_COLORS.workload
            case 'placement':
              return NODE_COLORS.placement
            case 'runtime':
              return NODE_COLORS.runtime
            case 'container':
              return NODE_COLORS.container
            case 'storage':
              return NODE_COLORS.storage
            case 'network':
              return NODE_COLORS.network
            case 'port':
              return NODE_COLORS.port
            case 'bootImage':
              return NODE_COLORS.bootImage
            default:
              return '#bbb'
          }
        }}
        nodeColor={(n) => {
          switch (n.type) {
            case 'workload':
              return '#ffffff'
            case 'placement':
              return '#eff6ff'
            case 'runtime':
              return '#fce7f3'
            case 'container':
              return '#faf5ff'
            case 'storage':
              return '#fef9c3'
            case 'network':
              return '#ecfeff'
            case 'port':
              return '#f5f3ff'
            case 'bootImage':
              return '#f0fdf4' // emerald-50
            default:
              return '#eee'
          }
        }}
      />
    </ReactFlow>
  )
}
