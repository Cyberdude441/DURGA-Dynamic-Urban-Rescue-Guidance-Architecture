/**
 * DURGA Data Store / State Definitions
 * Connects the synthetic urban graph and scenarios layer.
 */

export * from './urbanGraph';

export const INITIAL_SYSTEM_STATE = {
  isOperational: true,
  algorithmEngineStatus: 'UNINITIALIZED',
  activeIncidentsCount: 0,
  networkTopology: null,
  activeSimulation: null,
  allocatedResources: [],
  systemAlertLevel: 'NORMAL',
};

export const EMPTY_KPI_DEFAULTS = [
  {
    id: 'people_at_risk',
    label: 'People at Risk',
    value: '0',
    unit: 'civilians',
    status: 'safe',
    statusText: 'No civilians in danger zones',
    icon: 'Users',
    changeText: 'Zero casualties reported',
  },
  {
    id: 'active_zones',
    label: 'Active Zones',
    value: '0',
    unit: 'active sectors',
    status: 'safe',
    statusText: 'All urban sectors nominal',
    icon: 'Radio',
    changeText: '0 perimeter breaches',
  },
  {
    id: 'available_exits',
    label: 'Available Exits',
    value: '--',
    unit: 'exit corridors',
    status: 'neutral',
    statusText: 'Awaiting graph initialization',
    icon: 'DoorOpen',
    changeText: 'Exit topology pending',
  },
  {
    id: 'blocked_roads',
    label: 'Blocked Roads',
    value: '0',
    unit: 'blocked segments',
    status: 'safe',
    statusText: 'No network hazards detected',
    icon: 'Ban',
    changeText: 'Roadway throughput 100%',
  },
  {
    id: 'ambulances',
    label: 'Ambulances',
    value: '--',
    unit: 'units ready',
    status: 'neutral',
    statusText: 'Fleet telemetry standby',
    icon: 'Ambulance',
    changeText: 'Depot dispatch idle',
  },
  {
    id: 'rescue_teams',
    label: 'Rescue Teams',
    value: '--',
    unit: 'squads available',
    status: 'neutral',
    statusText: 'Response units unassigned',
    icon: 'ShieldCheck',
    changeText: 'Ready for deployment',
  },
  {
    id: 'evacuation_time',
    label: 'Evacuation Time',
    value: '--',
    unit: 'est. minutes',
    status: 'neutral',
    statusText: 'Algorithm run required',
    icon: 'Timer',
    changeText: 'No active route model',
  },
  {
    id: 'network_status',
    label: 'Network Status',
    value: 'STANDBY',
    unit: 'node telemetry',
    status: 'warning',
    statusText: 'Graph engine idle',
    icon: 'Activity',
    changeText: 'Awaiting network load',
  },
];
