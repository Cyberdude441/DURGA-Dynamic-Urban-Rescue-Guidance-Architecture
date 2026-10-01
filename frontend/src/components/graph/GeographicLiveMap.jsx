import React, { useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Circle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { LocateFixed, Layers3, Map as MapIcon } from 'lucide-react';
import { distanceBetween } from '../../utils/navigationUtils.js';

const DEFAULT_CENTER = [20.5937, 78.9629];

const userIcon = L.divIcon({
  className: 'durga-user-marker',
  html: '<span class="durga-user-marker__pulse"></span><span class="durga-user-marker__dot"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function poiIcon(type, count = 1, selected = false) {
  const color = type === 'hospital' ? '#dc2626' : type === 'exit' ? '#059669' : type === 'evacuation_zone' ? '#d97706' : type === 'junction' ? '#475569' : '#2563eb';
  return L.divIcon({
    className: 'durga-poi-marker',
    html: `<span class="${selected ? 'durga-poi-marker--selected' : ''}" style="--poi-color:${color}">${count > 1 ? count : type === 'hospital' ? '+' : type === 'exit' ? 'E' : type === 'evacuation_zone' ? 'Z' : type === 'junction' ? 'J' : 'S'}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MapViewportController({ center, fitBounds, followUser, centerRequest }) {
  const map = useMap();

  React.useEffect(() => {
    if (center && followUser) map.flyTo(center, Math.max(map.getZoom(), 16), { duration: 0.35 });
  }, [center, followUser, map]);

  React.useEffect(() => {
    if (centerRequest > 0 && center) map.flyTo(center, 17, { duration: 0.45 });
  }, [centerRequest, center, map]);

  React.useEffect(() => {
    if (!center && fitBounds?.length > 1) map.fitBounds(fitBounds, { padding: [40, 40], maxZoom: 16 });
  }, [center, fitBounds, map]);

  return null;
}

function aggregateFacilities(facilities) {
  const clusters = [];
  facilities.forEach((facility) => {
    const existing = clusters.find((cluster) => cluster.type === facility.type && distanceBetween(cluster, facility) <= 75);
    if (existing) {
      existing.items.push(facility);
      existing.lat = existing.items.reduce((sum, item) => sum + item.lat, 0) / existing.items.length;
      existing.lon = existing.items.reduce((sum, item) => sum + item.lon, 0) / existing.items.length;
    } else {
      clusters.push({ ...facility, items: [facility] });
    }
  });
  return clusters;
}

export default function GeographicLiveMap({ graph, routePath = [], location, followUser, onCenterUser, selectedNodeId, selectedEdgeId, onSelectNode, onSelectEdge, visibleLayers = {} }) {
  const [layers, setLayers] = useState({ normal: true, emergency: true, route: true, hazards: true, facilities: true });
  const [centerRequest, setCenterRequest] = useState(0);
  const geoNodes = useMemo(() => (graph?.nodes || []).filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lon)), [graph]);
  const center = location ? [location.lat, location.lon] : null;
  const fallbackCenter = center || (geoNodes[0] ? [geoNodes[0].lat, geoNodes[0].lon] : DEFAULT_CENTER);
  const fitBounds = useMemo(() => geoNodes.map((node) => [node.lat, node.lon]), [geoNodes]);
  const nodeMap = useMemo(() => new Map((graph?.nodes || []).map((node) => [node.id, node])), [graph]);
  const routeNodes = useMemo(() => routePath.map((id) => nodeMap.get(id)).filter((node) => node && Number.isFinite(node.lat) && Number.isFinite(node.lon)), [nodeMap, routePath]);
  const facilities = useMemo(() => aggregateFacilities((graph?.nodes || []).filter((node) => {
    const layerVisible = node.type === 'exit' ? visibleLayers.exits !== false : node.type === 'hospital' ? visibleLayers.hospitals !== false : node.type === 'evacuation_zone' ? visibleLayers.zones !== false : node.type === 'resource_center' ? visibleLayers.resourceCenters !== false : visibleLayers.junctions !== false;
    const importantJunction = node.type !== 'junction' || (node.degree || 0) >= 4;
    return ['exit', 'hospital', 'resource_center', 'evacuation_zone', 'junction'].includes(node.type) && importantJunction && layerVisible && Number.isFinite(node.lat) && Number.isFinite(node.lon);
  })), [graph, visibleLayers]);
  const roads = useMemo(() => (graph?.edges || []).map((edge) => ({
    ...edge,
    sourceNode: nodeMap.get(edge.source),
    targetNode: nodeMap.get(edge.target),
  })).filter((edge) => edge.sourceNode?.lat && edge.targetNode?.lat), [graph, nodeMap]);

  const toggleLayer = (layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  const centerOnUser = () => {
    setCenterRequest((value) => value + 1);
    onCenterUser?.();
  };

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs">
      <MapContainer center={fallbackCenter} zoom={center ? 16 : 5} zoomControl className="durga-leaflet-map" scrollWheelZoom>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapViewportController center={center} fitBounds={fitBounds} followUser={followUser} centerRequest={centerRequest} />

        {layers.normal && roads.map((edge) => {
          if (edge.blocked || edge.danger > 0.4) return null;
          return <Polyline key={`normal-${edge.id}`} eventHandlers={{ click: () => onSelectEdge?.(edge) }} positions={[[edge.sourceNode.lat, edge.sourceNode.lon], [edge.targetNode.lat, edge.targetNode.lon]]} pathOptions={{ color: selectedEdgeId === edge.id ? '#047857' : '#64748b', weight: selectedEdgeId === edge.id ? 6 : 3, opacity: 0.62 }}><Popup><strong>{edge.name && edge.name !== 'Unnamed OSM road' ? edge.name : 'Unnamed road'}</strong><br />{edge.distance} m · {edge.travelTime} s</Popup></Polyline>;
        })}
        {layers.emergency && roads.filter((edge) => edge.blocked).map((edge) => <Polyline key={`blocked-${edge.id}`} eventHandlers={{ click: () => onSelectEdge?.(edge) }} positions={[[edge.sourceNode.lat, edge.sourceNode.lon], [edge.targetNode.lat, edge.targetNode.lon]]} pathOptions={{ color: selectedEdgeId === edge.id ? '#991b1b' : '#dc2626', weight: selectedEdgeId === edge.id ? 8 : 6, opacity: 0.9, dashArray: '8 6' }}><Popup><strong>{edge.name && edge.name !== 'Unnamed OSM road' ? edge.name : 'Blocked road'}</strong><br />Blocked corridor</Popup></Polyline>)}
        {layers.hazards && roads.filter((edge) => !edge.blocked && edge.danger > 0.4).map((edge) => <Polyline key={`hazard-${edge.id}`} eventHandlers={{ click: () => onSelectEdge?.(edge) }} positions={[[edge.sourceNode.lat, edge.sourceNode.lon], [edge.targetNode.lat, edge.targetNode.lon]]} pathOptions={{ color: selectedEdgeId === edge.id ? '#c2410c' : '#f97316', weight: selectedEdgeId === edge.id ? 7 : 5, opacity: 0.72 }}><Popup><strong>{edge.name && edge.name !== 'Unnamed OSM road' ? edge.name : 'Dangerous road'}</strong><br />Danger: {Math.round(edge.danger * 100)}%</Popup></Polyline>)}
        {layers.route && routeNodes.length > 1 && <Polyline positions={routeNodes.map((node) => [node.lat, node.lon])} pathOptions={{ color: '#047857', weight: 8, opacity: 0.25 }} />}
        {layers.route && routeNodes.length > 1 && <Polyline positions={routeNodes.map((node) => [node.lat, node.lon])} pathOptions={{ color: '#059669', weight: 4, opacity: 1, dashArray: '12 7' }} />}

        {layers.facilities && <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>{facilities.map((facility) => <Marker key={`${facility.type}-${facility.id}`} position={[facility.lat, facility.lon]} icon={poiIcon(facility.type, facility.items.length, facility.items.some((item) => item.id === selectedNodeId))} eventHandlers={{ click: () => onSelectNode?.(facility.items[0]) }}><Popup><strong>{facility.items.length > 1 ? `${facility.items.length} nearby ${facility.type.replace('_', ' ')} entities` : facility.name}</strong><br />{facility.type.replace('_', ' ')} · {facility.dataSource || 'OpenStreetMap mapped feature'}</Popup></Marker>)}</MarkerClusterGroup>}
        {location && <><Circle center={[location.lat, location.lon]} radius={35} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.12, weight: 1 }} /><Marker position={[location.lat, location.lon]} icon={userIcon}><Popup><strong>Current GPS position</strong><br />{location.lat.toFixed(5)}, {location.lon.toFixed(5)}</Popup></Marker></>}
      </MapContainer>

      <div className="absolute left-3 top-3 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-lg">
        <div className="mr-1 flex items-center gap-1.5 border-r border-slate-200 pr-2 text-[10px] font-mono font-bold uppercase text-slate-700"><Layers3 className="h-3.5 w-3.5 text-emerald-700" /> Layers</div>
        {Object.entries({ normal: 'Normal', emergency: 'Emergency', route: 'Evacuation Route', hazards: 'Hazards', facilities: 'Facilities' }).map(([key, label]) => <button key={key} type="button" onClick={() => toggleLayer(key)} className={`rounded px-2 py-1 text-[10px] font-mono font-bold ${layers[key] ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-500'}`}>{label}</button>)}
      </div>
      <button type="button" onClick={centerOnUser} disabled={!location} className="absolute bottom-3 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] font-mono font-bold text-slate-700 shadow-lg disabled:cursor-not-allowed disabled:opacity-50"><LocateFixed className="h-3.5 w-3.5 text-emerald-700" />Center on My Location</button>
      {!location && <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] font-mono text-amber-900"><MapIcon className="h-3.5 w-3.5" />Waiting for live GPS; geographic map will center when permission is granted.</div>}
    </div>
  );
}
