import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import UrbanNode from './UrbanNode';
import UrbanEdge from './UrbanEdge';

const nodeColorMap = {
  exit: '#10b981',
  hospital: '#0f766e',
  resource_center: '#4d7c0f',
  evacuation_zone: '#f59e0b',
  junction: '#15803d',
  building: '#64748b',
};

export default function ReactFlowGraph({
  initialGraph,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  visibleLayers = {
    buildings: true,
    hospitals: true,
    exits: true,
    zones: true,
    junctions: true,
    resourceCenters: true,
  },
}) {
  const nodeTypes = useMemo(() => ({ urbanNode: UrbanNode }), []);
  const edgeTypes = useMemo(() => ({ urbanEdge: UrbanEdge }), []);

  // Map synthetic urban nodes to React Flow nodes with appropriate spatial scaling
  const mappedInitialNodes = useMemo(() => {
    if (!initialGraph || !Array.isArray(initialGraph.nodes)) return [];

    return initialGraph.nodes.map((node) => {
      let isVisible = true;
      if (node.type === 'building' && !visibleLayers.buildings) isVisible = false;
      if (node.type === 'hospital' && !visibleLayers.hospitals) isVisible = false;
      if (node.type === 'exit' && !visibleLayers.exits) isVisible = false;
      if (node.type === 'evacuation_zone' && !visibleLayers.zones) isVisible = false;
      if (node.type === 'junction' && !visibleLayers.junctions) isVisible = false;
      if (node.type === 'resource_center' && !visibleLayers.resourceCenters) isVisible = false;

      return {
        id: node.id,
        type: 'urbanNode',
        position: {
          x: Math.round(node.x * 2.2),
          y: Math.round(node.y * 1.8),
        },
        data: { ...node },
        hidden: !isVisible,
        selected: selectedNodeId === node.id,
      };
    });
  }, [initialGraph, visibleLayers, selectedNodeId]);

  // Map synthetic urban edges to React Flow edges
  const mappedInitialEdges = useMemo(() => {
    if (!initialGraph || !Array.isArray(initialGraph.edges)) return [];

    return initialGraph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'urbanEdge',
      data: { ...edge },
      selected: selectedEdgeId === edge.id,
    }));
  }, [initialGraph, selectedEdgeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(mappedInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(mappedInitialEdges);

  // Sync when initialGraph or selection or layers change
  useEffect(() => {
    setNodes(mappedInitialNodes);
  }, [mappedInitialNodes, setNodes]);

  useEffect(() => {
    setEdges(mappedInitialEdges);
  }, [mappedInitialEdges, setEdges]);

  const handleNodeClick = useCallback(
    (_, node) => {
      onSelectNode(node);
    },
    [onSelectNode]
  );

  const handleEdgeClick = useCallback(
    (_, edge) => {
      onSelectEdge(edge);
    },
    [onSelectEdge]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
    onSelectEdge(null);
  }, [onSelectNode, onSelectEdge]);

  return (
    <div className="relative w-full h-[420px] sm:h-[520px] lg:h-[620px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2.0}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#cbd5e1"
        />

        <Controls showInteractive={false} position="bottom-left" />

        <MiniMap
          nodeColor={(n) => nodeColorMap[n.data?.type] || '#64748b'}
          maskColor="rgba(241, 245, 249, 0.6)"
          position="bottom-right"
          zoomable
          pannable
          className="!m-4"
        />
      </ReactFlow>
    </div>
  );
}
