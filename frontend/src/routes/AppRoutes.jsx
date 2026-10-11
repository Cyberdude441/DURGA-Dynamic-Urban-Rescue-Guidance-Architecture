import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Dashboard from '../pages/Dashboard';
import EmergencySimulator from '../pages/EmergencySimulator';
import GraphExplorer from '../pages/GraphExplorer';
import AlgorithmLab from '../pages/AlgorithmLab';
import EvacuationPlanner from '../pages/EvacuationPlanner';
import ResourceOptimizer from '../pages/ResourceOptimizer';
import Analytics from '../pages/Analytics';
import ScenarioArchive from '../pages/ScenarioArchive';
import Documentation from '../pages/Documentation';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="simulator" element={<EmergencySimulator />} />
        <Route path="graph-explorer" element={<GraphExplorer />} />
        <Route path="algorithm-lab" element={<AlgorithmLab />} />
        <Route path="evacuation-planner" element={<EvacuationPlanner />} />
        <Route path="resource-optimizer" element={<ResourceOptimizer />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="scenario-archive" element={<ScenarioArchive />} />
        <Route path="documentation" element={<Documentation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
