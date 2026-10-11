/**
 * DURGA: Dynamic Urban Rescue & Guidance Architecture
 * Server-Side Utilities & Canonical Urban Graph Topology
 * 
 * Invariants:
 *  - Exactly 47 Vertices (4 Exits, 2 Hospitals, 2 Resource Centers, 5 Zones, 12 Junctions, 22 Buildings)
 *  - Exactly 58 Bidirectional Arterial Corridors (E01 - E58)
 */

/**
 * Global Haversine distance calculator between two WGS-84 coordinates.
 * @param {number} lat1 Latitude 1
 * @param {number} lon1 Longitude 1
 * @param {number} lat2 Latitude 2
 * @param {number} lon2 Longitude 2
 * @returns {number} Distance in meters
 */
function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

/**
 * Projects latitude/longitude to 2D canvas coordinates.
 */
function projectPoint(point, bounds) {
  const width = Math.max(bounds.maxLon - bounds.minLon, 0.00001);
  const height = Math.max(bounds.maxLat - bounds.minLat, 0.00001);
  return {
    x: Math.round(60 + ((point.lon - bounds.minLon) / width) * 680),
    y: Math.round(600 - ((point.lat - bounds.minLat) / height) * 520),
  };
}

/**
 * Evaluates dynamic edge traversal impedance cost.
 * Cost(e) = TravelTime * (1 + 1.5 * Congestion) * (1 + 2.5 * Danger)
 */
function calcCorridorCost(edge, congestion = 0, danger = 0) {
  if (edge.blocked) return Infinity;
  const travelTime = edge.travelTime || (edge.distance / ((edge.speedKmh || 40) / 3.6));
  const congMod = 1 + 1.5 * Math.max(0, Math.min(1, congestion));
  const dangMod = 1 + 2.5 * Math.max(0, Math.min(1, danger));
  return travelTime * congMod * dangMod;
}

function getCanonicalUrbanGraph() {
  return {
  "nodes": [
    {
      "id": "EX01",
      "name": "North Freeway Exit 101",
      "type": "exit",
      "people": 0,
      "capacity": 5000,
      "riskLevel": "NONE",
      "priority": 1,
      "x": 500,
      "y": 50
    },
    {
      "id": "EX02",
      "name": "East Ring Expressway Exit",
      "type": "exit",
      "people": 0,
      "capacity": 4500,
      "riskLevel": "NONE",
      "priority": 1,
      "x": 940,
      "y": 340
    },
    {
      "id": "EX03",
      "name": "South Interstate Interchange 4",
      "type": "exit",
      "people": 0,
      "capacity": 6000,
      "riskLevel": "NONE",
      "priority": 1,
      "x": 580,
      "y": 670
    },
    {
      "id": "EX04",
      "name": "West Coastal Highway Exit",
      "type": "exit",
      "people": 0,
      "capacity": 4000,
      "riskLevel": "NONE",
      "priority": 1,
      "x": 60,
      "y": 360
    },
    {
      "id": "H01",
      "name": "St. Teresa General Trauma Hospital",
      "type": "hospital",
      "people": 640,
      "capacity": 1200,
      "riskLevel": "LOW",
      "priority": 5,
      "x": 240,
      "y": 240
    },
    {
      "id": "H02",
      "name": "Mercy Metropolitan Emergency Center",
      "type": "hospital",
      "people": 520,
      "capacity": 1000,
      "riskLevel": "LOW",
      "priority": 5,
      "x": 740,
      "y": 250
    },
    {
      "id": "RC01",
      "name": "Central Ambulance & Rapid Dispatch Depot",
      "type": "resource_center",
      "people": 85,
      "capacity": 350,
      "riskLevel": "NONE",
      "priority": 4,
      "x": 140,
      "y": 260
    },
    {
      "id": "RC02",
      "name": "Metro Fire & Heavy Rescue Logistics Hub",
      "type": "resource_center",
      "people": 110,
      "capacity": 400,
      "riskLevel": "NONE",
      "priority": 4,
      "x": 840,
      "y": 230
    },
    {
      "id": "EZ01",
      "name": "Zone A - Downtown Commercial Core",
      "type": "evacuation_zone",
      "people": 2850,
      "capacity": 4000,
      "riskLevel": "LOW",
      "priority": 3,
      "x": 500,
      "y": 250
    },
    {
      "id": "EZ02",
      "name": "Zone B - Riverfront District",
      "type": "evacuation_zone",
      "people": 1420,
      "capacity": 2500,
      "riskLevel": "LOW",
      "priority": 3,
      "x": 280,
      "y": 580
    },
    {
      "id": "EZ03",
      "name": "Zone C - North Residential Quarter",
      "type": "evacuation_zone",
      "people": 3100,
      "capacity": 4500,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 320,
      "y": 140
    },
    {
      "id": "EZ04",
      "name": "Zone D - Industrial & Logistics Basin",
      "type": "evacuation_zone",
      "people": 940,
      "capacity": 2000,
      "riskLevel": "LOW",
      "priority": 2,
      "x": 820,
      "y": 620
    },
    {
      "id": "EZ05",
      "name": "Zone E - South Academic & Civic Sector",
      "type": "evacuation_zone",
      "people": 2200,
      "capacity": 3500,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 660,
      "y": 580
    },
    {
      "id": "J01",
      "name": "North Cross Junction",
      "type": "junction",
      "people": 40,
      "capacity": 600,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 500,
      "y": 150
    },
    {
      "id": "J02",
      "name": "Metro Central Square Intersection",
      "type": "junction",
      "people": 120,
      "capacity": 1000,
      "riskLevel": "LOW",
      "priority": 3,
      "x": 480,
      "y": 310
    },
    {
      "id": "J03",
      "name": "East Ring Interchange",
      "type": "junction",
      "people": 60,
      "capacity": 800,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 820,
      "y": 340
    },
    {
      "id": "J04",
      "name": "Riverfront Promenade Crossing",
      "type": "junction",
      "people": 35,
      "capacity": 500,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 340,
      "y": 540
    },
    {
      "id": "J05",
      "name": "South Boulevard Junction",
      "type": "junction",
      "people": 75,
      "capacity": 700,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 580,
      "y": 560
    },
    {
      "id": "J06",
      "name": "West Highway Overpass",
      "type": "junction",
      "people": 50,
      "capacity": 650,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 170,
      "y": 360
    },
    {
      "id": "J07",
      "name": "Midtown Hub Intersection",
      "type": "junction",
      "people": 90,
      "capacity": 900,
      "riskLevel": "LOW",
      "priority": 3,
      "x": 520,
      "y": 410
    },
    {
      "id": "J08",
      "name": "Harborway Fork",
      "type": "junction",
      "people": 25,
      "capacity": 450,
      "riskLevel": "NONE",
      "priority": 1,
      "x": 260,
      "y": 470
    },
    {
      "id": "J09",
      "name": "Civic Center Roundabout",
      "type": "junction",
      "people": 80,
      "capacity": 850,
      "riskLevel": "LOW",
      "priority": 2,
      "x": 440,
      "y": 490
    },
    {
      "id": "J10",
      "name": "Industrial Park Gate Junction",
      "type": "junction",
      "people": 30,
      "capacity": 500,
      "riskLevel": "NONE",
      "priority": 1,
      "x": 740,
      "y": 540
    },
    {
      "id": "J11",
      "name": "Academic Boulevard Crossing",
      "type": "junction",
      "people": 65,
      "capacity": 600,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 660,
      "y": 480
    },
    {
      "id": "J12",
      "name": "Outer Perimeter Interchange",
      "type": "junction",
      "people": 45,
      "capacity": 750,
      "riskLevel": "NONE",
      "priority": 1,
      "x": 840,
      "y": 520
    },
    {
      "id": "B01",
      "name": "Metro Central Plaza",
      "type": "building",
      "people": 850,
      "capacity": 1200,
      "riskLevel": "LOW",
      "priority": 4,
      "x": 420,
      "y": 240
    },
    {
      "id": "B02",
      "name": "Apex Financial Tower",
      "type": "building",
      "people": 1100,
      "capacity": 1600,
      "riskLevel": "LOW",
      "priority": 4,
      "x": 560,
      "y": 240
    },
    {
      "id": "B03",
      "name": "Grand Civic City Hall",
      "type": "building",
      "people": 420,
      "capacity": 800,
      "riskLevel": "NONE",
      "priority": 5,
      "x": 390,
      "y": 360
    },
    {
      "id": "B04",
      "name": "Skyline Residences North",
      "type": "building",
      "people": 680,
      "capacity": 900,
      "riskLevel": "NONE",
      "priority": 3,
      "x": 220,
      "y": 110
    },
    {
      "id": "B05",
      "name": "Skyline Residences South",
      "type": "building",
      "people": 740,
      "capacity": 950,
      "riskLevel": "NONE",
      "priority": 3,
      "x": 500,
      "y": 590
    },
    {
      "id": "B06",
      "name": "Verdant Heights Apartments",
      "type": "building",
      "people": 560,
      "capacity": 750,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 380,
      "y": 100
    },
    {
      "id": "B07",
      "name": "Unity Public High School",
      "type": "building",
      "people": 920,
      "capacity": 1300,
      "riskLevel": "NONE",
      "priority": 5,
      "x": 620,
      "y": 110
    },
    {
      "id": "B08",
      "name": "St. Jude Primary Academy",
      "type": "building",
      "people": 460,
      "capacity": 650,
      "riskLevel": "NONE",
      "priority": 5,
      "x": 760,
      "y": 130
    },
    {
      "id": "B09",
      "name": "Orion Tech Research Park",
      "type": "building",
      "people": 610,
      "capacity": 1000,
      "riskLevel": "NONE",
      "priority": 3,
      "x": 740,
      "y": 410
    },
    {
      "id": "B10",
      "name": "Nova Shopping Mall",
      "type": "building",
      "people": 1450,
      "capacity": 2200,
      "riskLevel": "LOW",
      "priority": 4,
      "x": 610,
      "y": 330
    },
    {
      "id": "B11",
      "name": "Harbor Point Condominiums",
      "type": "building",
      "people": 510,
      "capacity": 700,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 200,
      "y": 570
    },
    {
      "id": "B12",
      "name": "Riverside Cultural Center",
      "type": "building",
      "people": 320,
      "capacity": 600,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 380,
      "y": 620
    },
    {
      "id": "B13",
      "name": "Beacon Hill Terraces",
      "type": "building",
      "people": 480,
      "capacity": 650,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 120,
      "y": 440
    },
    {
      "id": "B14",
      "name": "Mercantile Trade Center",
      "type": "building",
      "people": 790,
      "capacity": 1100,
      "riskLevel": "LOW",
      "priority": 3,
      "x": 430,
      "y": 430
    },
    {
      "id": "B15",
      "name": "Central Library & Archives",
      "type": "building",
      "people": 260,
      "capacity": 500,
      "riskLevel": "NONE",
      "priority": 3,
      "x": 580,
      "y": 460
    },
    {
      "id": "B16",
      "name": "Phoenix Senior Living Community",
      "type": "building",
      "people": 380,
      "capacity": 450,
      "riskLevel": "NONE",
      "priority": 5,
      "x": 730,
      "y": 630
    },
    {
      "id": "B17",
      "name": "Westside Community Sports Complex",
      "type": "building",
      "people": 540,
      "capacity": 1200,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 210,
      "y": 460
    },
    {
      "id": "B18",
      "name": "Midtown Medical Plaza",
      "type": "building",
      "people": 310,
      "capacity": 500,
      "riskLevel": "LOW",
      "priority": 4,
      "x": 490,
      "y": 360
    },
    {
      "id": "B19",
      "name": "Heritage Artisan Quarter",
      "type": "building",
      "people": 290,
      "capacity": 450,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 620,
      "y": 530
    },
    {
      "id": "B20",
      "name": "Crestview Tower Suites",
      "type": "building",
      "people": 620,
      "capacity": 850,
      "riskLevel": "NONE",
      "priority": 3,
      "x": 870,
      "y": 480
    },
    {
      "id": "B21",
      "name": "Cyberdyne Innovation Center",
      "type": "building",
      "people": 530,
      "capacity": 800,
      "riskLevel": "NONE",
      "priority": 3,
      "x": 880,
      "y": 410
    },
    {
      "id": "B22",
      "name": "Riverside Maritime Warehouse",
      "type": "building",
      "people": 180,
      "capacity": 400,
      "riskLevel": "NONE",
      "priority": 2,
      "x": 230,
      "y": 650
    }
  ],
  "edges": [
    {
      "id": "E01",
      "source": "J01",
      "target": "EX01",
      "distance": 450,
      "travelTime": 36,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 80,
      "blocked": false
    },
    {
      "id": "E02",
      "source": "B06",
      "target": "J01",
      "distance": 320,
      "travelTime": 28,
      "congestion": 0.05,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E03",
      "source": "B07",
      "target": "J01",
      "distance": 340,
      "travelTime": 30,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E04",
      "source": "B04",
      "target": "EZ03",
      "distance": 210,
      "travelTime": 18,
      "congestion": 0.05,
      "danger": 0,
      "capacity": 45,
      "blocked": false
    },
    {
      "id": "E05",
      "source": "EZ03",
      "target": "B06",
      "distance": 190,
      "travelTime": 16,
      "congestion": 0.05,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E06",
      "source": "B07",
      "target": "B08",
      "distance": 310,
      "travelTime": 26,
      "congestion": 0.08,
      "danger": 0,
      "capacity": 45,
      "blocked": false
    },
    {
      "id": "E07",
      "source": "J01",
      "target": "J02",
      "distance": 620,
      "travelTime": 48,
      "congestion": 0.35,
      "danger": 0.05,
      "capacity": 90,
      "blocked": false
    },
    {
      "id": "E08",
      "source": "EZ03",
      "target": "H01",
      "distance": 480,
      "travelTime": 40,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E09",
      "source": "B08",
      "target": "H02",
      "distance": 420,
      "travelTime": 35,
      "congestion": 0.12,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E10",
      "source": "B01",
      "target": "EZ01",
      "distance": 180,
      "travelTime": 15,
      "congestion": 0.3,
      "danger": 0.1,
      "capacity": 65,
      "blocked": false
    },
    {
      "id": "E11",
      "source": "B02",
      "target": "EZ01",
      "distance": 190,
      "travelTime": 16,
      "congestion": 0.28,
      "danger": 0.08,
      "capacity": 70,
      "blocked": false
    },
    {
      "id": "E12",
      "source": "EZ01",
      "target": "J02",
      "distance": 220,
      "travelTime": 18,
      "congestion": 0.4,
      "danger": 0.05,
      "capacity": 85,
      "blocked": false
    },
    {
      "id": "E13",
      "source": "B01",
      "target": "B03",
      "distance": 360,
      "travelTime": 30,
      "congestion": 0.25,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E14",
      "source": "J02",
      "target": "B18",
      "distance": 170,
      "travelTime": 14,
      "congestion": 0.32,
      "danger": 0.05,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E15",
      "source": "J02",
      "target": "B10",
      "distance": 380,
      "travelTime": 32,
      "congestion": 0.45,
      "danger": 0.05,
      "capacity": 75,
      "blocked": false
    },
    {
      "id": "E16",
      "source": "B10",
      "target": "J03",
      "distance": 490,
      "travelTime": 38,
      "congestion": 0.3,
      "danger": 0,
      "capacity": 80,
      "blocked": false
    },
    {
      "id": "E17",
      "source": "RC01",
      "target": "H01",
      "distance": 230,
      "travelTime": 18,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 70,
      "blocked": false
    },
    {
      "id": "E18",
      "source": "RC01",
      "target": "J06",
      "distance": 310,
      "travelTime": 25,
      "congestion": 0.12,
      "danger": 0,
      "capacity": 65,
      "blocked": false
    },
    {
      "id": "E19",
      "source": "H01",
      "target": "J06",
      "distance": 350,
      "travelTime": 28,
      "congestion": 0.2,
      "danger": 0,
      "capacity": 70,
      "blocked": false
    },
    {
      "id": "E20",
      "source": "J06",
      "target": "EX04",
      "distance": 380,
      "travelTime": 30,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 85,
      "blocked": false
    },
    {
      "id": "E21",
      "source": "H01",
      "target": "B03",
      "distance": 460,
      "travelTime": 38,
      "congestion": 0.22,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E22",
      "source": "J06",
      "target": "B13",
      "distance": 260,
      "travelTime": 22,
      "congestion": 0.08,
      "danger": 0,
      "capacity": 45,
      "blocked": false
    },
    {
      "id": "E23",
      "source": "B13",
      "target": "B17",
      "distance": 240,
      "travelTime": 20,
      "congestion": 0.08,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E24",
      "source": "B17",
      "target": "J08",
      "distance": 220,
      "travelTime": 18,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E25",
      "source": "B03",
      "target": "J09",
      "distance": 390,
      "travelTime": 32,
      "congestion": 0.2,
      "danger": 0,
      "capacity": 65,
      "blocked": false
    },
    {
      "id": "E26",
      "source": "J02",
      "target": "J07",
      "distance": 320,
      "travelTime": 26,
      "congestion": 0.38,
      "danger": 0.05,
      "capacity": 85,
      "blocked": false
    },
    {
      "id": "E27",
      "source": "B18",
      "target": "J07",
      "distance": 180,
      "travelTime": 15,
      "congestion": 0.2,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E28",
      "source": "J07",
      "target": "B14",
      "distance": 240,
      "travelTime": 20,
      "congestion": 0.25,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E29",
      "source": "J07",
      "target": "B15",
      "distance": 210,
      "travelTime": 18,
      "congestion": 0.18,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E30",
      "source": "B14",
      "target": "J09",
      "distance": 220,
      "travelTime": 18,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E31",
      "source": "B15",
      "target": "J11",
      "distance": 250,
      "travelTime": 20,
      "congestion": 0.12,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E32",
      "source": "H02",
      "target": "RC02",
      "distance": 260,
      "travelTime": 21,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 70,
      "blocked": false
    },
    {
      "id": "E33",
      "source": "RC02",
      "target": "J03",
      "distance": 330,
      "travelTime": 26,
      "congestion": 0.14,
      "danger": 0,
      "capacity": 75,
      "blocked": false
    },
    {
      "id": "E34",
      "source": "H02",
      "target": "J03",
      "distance": 310,
      "travelTime": 25,
      "congestion": 0.18,
      "danger": 0,
      "capacity": 70,
      "blocked": false
    },
    {
      "id": "E35",
      "source": "J03",
      "target": "EX02",
      "distance": 370,
      "travelTime": 29,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 90,
      "blocked": false
    },
    {
      "id": "E36",
      "source": "J03",
      "target": "B09",
      "distance": 270,
      "travelTime": 22,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E37",
      "source": "B09",
      "target": "B21",
      "distance": 320,
      "travelTime": 26,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E38",
      "source": "B21",
      "target": "B20",
      "distance": 200,
      "travelTime": 16,
      "congestion": 0.08,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E39",
      "source": "B20",
      "target": "J12",
      "distance": 210,
      "travelTime": 17,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E40",
      "source": "B09",
      "target": "J11",
      "distance": 300,
      "travelTime": 24,
      "congestion": 0.12,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E41",
      "source": "J08",
      "target": "EZ02",
      "distance": 280,
      "travelTime": 23,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E42",
      "source": "B11",
      "target": "EZ02",
      "distance": 190,
      "travelTime": 16,
      "congestion": 0.08,
      "danger": 0,
      "capacity": 45,
      "blocked": false
    },
    {
      "id": "E43",
      "source": "EZ02",
      "target": "B22",
      "distance": 180,
      "travelTime": 15,
      "congestion": 0.05,
      "danger": 0,
      "capacity": 40,
      "blocked": false
    },
    {
      "id": "E44",
      "source": "EZ02",
      "target": "J04",
      "distance": 210,
      "travelTime": 17,
      "congestion": 0.18,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E45",
      "source": "J04",
      "target": "B12",
      "distance": 230,
      "travelTime": 19,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E46",
      "source": "J08",
      "target": "J09",
      "distance": 410,
      "travelTime": 33,
      "congestion": 0.2,
      "danger": 0,
      "capacity": 65,
      "blocked": false
    },
    {
      "id": "E47",
      "source": "J04",
      "target": "J09",
      "distance": 330,
      "travelTime": 27,
      "congestion": 0.22,
      "danger": 0,
      "capacity": 65,
      "blocked": false
    },
    {
      "id": "E48",
      "source": "J09",
      "target": "B05",
      "distance": 250,
      "travelTime": 20,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E49",
      "source": "B05",
      "target": "J05",
      "distance": 210,
      "travelTime": 17,
      "congestion": 0.18,
      "danger": 0,
      "capacity": 65,
      "blocked": false
    },
    {
      "id": "E50",
      "source": "J05",
      "target": "EX03",
      "distance": 340,
      "travelTime": 27,
      "congestion": 0.2,
      "danger": 0,
      "capacity": 90,
      "blocked": false
    },
    {
      "id": "E51",
      "source": "J07",
      "target": "J05",
      "distance": 430,
      "travelTime": 34,
      "congestion": 0.25,
      "danger": 0,
      "capacity": 80,
      "blocked": false
    },
    {
      "id": "E52",
      "source": "J11",
      "target": "B19",
      "distance": 160,
      "travelTime": 13,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E53",
      "source": "B19",
      "target": "EZ05",
      "distance": 170,
      "travelTime": 14,
      "congestion": 0.12,
      "danger": 0,
      "capacity": 55,
      "blocked": false
    },
    {
      "id": "E54",
      "source": "EZ05",
      "target": "J05",
      "distance": 230,
      "travelTime": 18,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E55",
      "source": "J11",
      "target": "J10",
      "distance": 270,
      "travelTime": 22,
      "congestion": 0.15,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E56",
      "source": "J10",
      "target": "B16",
      "distance": 240,
      "travelTime": 19,
      "congestion": 0.1,
      "danger": 0,
      "capacity": 50,
      "blocked": false
    },
    {
      "id": "E57",
      "source": "J10",
      "target": "EZ04",
      "distance": 230,
      "travelTime": 18,
      "congestion": 0.12,
      "danger": 0,
      "capacity": 60,
      "blocked": false
    },
    {
      "id": "E58",
      "source": "EZ04",
      "target": "J12",
      "distance": 240,
      "travelTime": 19,
      "congestion": 0.14,
      "danger": 0,
      "capacity": 65,
      "blocked": false
    }
  ]
};
}

/**
 * Returns default disaster scenarios for database seeding.
 */
function getDefaultScenarios() {
  return [
    {
      name: 'Academic Block Fire',
      description: 'Catastrophic structural fire in the primary academic sciences complex with thick smoke blocking central stairwells and corridors.',
      emergencyType: 'Fire',
      emergencyLocation: 'B01',
      peopleAffected: 1200,
      riskLevel: 'CRITICAL',
      blockedRoads: ['E10', 'E12', 'E14', 'E26'],
      blockedBuildings: ['B01'],
      exitAvailability: {
        EX01: { available: true, capacity: 5000 },
        EX02: { available: true, capacity: 5000 },
        EX03: { available: true, capacity: 6000 },
        EX04: { available: true, capacity: 4000 },
      },
      fleetBudget: { ambulances: 18, rescueTeams: 12, emergencyVehicles: 10 },
    },
    {
      name: 'Southern Flood Surge',
      description: 'Flash inundation and storm surge breach along the southern riverfront basin submerging low-elevation transit routes.',
      emergencyType: 'Flood',
      emergencyLocation: 'EZ02',
      peopleAffected: 1420,
      riskLevel: 'HIGH',
      blockedRoads: ['E41', 'E43', 'E45'],
      blockedBuildings: ['B22'],
      exitAvailability: {
        EX01: { available: true, capacity: 4000 },
        EX02: { available: true, capacity: 4000 },
        EX03: { available: true, capacity: 5000 },
        EX04: { available: false, capacity: 0 },
      },
      fleetBudget: { ambulances: 16, rescueTeams: 14, emergencyVehicles: 8 },
    },
    {
      name: 'Metropolitan Fault Rupture',
      description: 'Severe 7.1 magnitude seismic fault rupture causing structural collapse, major road fractures, and arterial debris blockages.',
      emergencyType: 'Earthquake',
      emergencyLocation: 'J07',
      peopleAffected: 2100,
      riskLevel: 'CRITICAL',
      blockedRoads: ['E26', 'E28', 'E29', 'E30', 'E51'],
      blockedBuildings: ['B14', 'B15'],
      exitAvailability: {
        EX01: { available: true, capacity: 3000 },
        EX02: { available: true, capacity: 3000 },
        EX03: { available: true, capacity: 3000 },
        EX04: { available: true, capacity: 3000 },
      },
      fleetBudget: { ambulances: 24, rescueTeams: 18, emergencyVehicles: 16 },
    },
    {
      name: 'Industrial Chemical Plume',
      description: 'Pressurized toxic chlorine and ammonia vapor leak in the eastern industrial logistics park spreading downwind.',
      emergencyType: 'Chemical Leak',
      emergencyLocation: 'B16',
      peopleAffected: 1800,
      riskLevel: 'CRITICAL',
      blockedRoads: ['E57', 'E58'],
      blockedBuildings: ['B16'],
      exitAvailability: {
        EX01: { available: true, capacity: 5000 },
        EX02: { available: true, capacity: 5000 },
        EX03: { available: false, capacity: 0 },
        EX04: { available: true, capacity: 3000 },
      },
      fleetBudget: { ambulances: 20, rescueTeams: 15, emergencyVehicles: 12 },
    },
  ];
}
