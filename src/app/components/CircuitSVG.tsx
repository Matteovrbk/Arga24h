import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// Tracé GPS réel du circuit 24h Vélo du Bois de la Cambre
// Source : calculitineraires.fr — 82 points, 2.61 km
const CIRCUIT_COORDS: LatLngExpression[] = [
  [50.80608, 4.38306],
  [50.80638, 4.38280],
  [50.80682, 4.38233],
  [50.80695, 4.38214],
  [50.80716, 4.38166],
  [50.80721, 4.38135],
  [50.80727, 4.38066],
  [50.80733, 4.38048],
  [50.80738, 4.38040],
  [50.80735, 4.38024],
  [50.80724, 4.37976],
  [50.80683, 4.37877],
  [50.80657, 4.37825],
  [50.80651, 4.37808],
  [50.80647, 4.37796],
  [50.80633, 4.37803],
  [50.80616, 4.37807],
  [50.80595, 4.37801],
  [50.80583, 4.37795],
  [50.80543, 4.37758],
  [50.80517, 4.37740],
  [50.80497, 4.37732],
  [50.80477, 4.37731],
  [50.80460, 4.37733],
  [50.80436, 4.37744],
  [50.80406, 4.37766],
  [50.80377, 4.37808],
  [50.80361, 4.37841],
  [50.80346, 4.37888],
  [50.80341, 4.37910],
  [50.80331, 4.37945],
  [50.80324, 4.37958],
  [50.80309, 4.37983],
  [50.80303, 4.37987],
  [50.80290, 4.37988],
  [50.80273, 4.37988],
  [50.80260, 4.37981],
  [50.80217, 4.37949],
  [50.80204, 4.37939],
  [50.80181, 4.37928],
  [50.80159, 4.37921],
  [50.80135, 4.37918],
  [50.80099, 4.37920],
  [50.80064, 4.37929],
  [50.80047, 4.37940],
  [50.80032, 4.37954],
  [50.79997, 4.37996],
  [50.79979, 4.38035],
  [50.79963, 4.38077],
  [50.79927, 4.38210],
  [50.79914, 4.38281],
  [50.79912, 4.38301],
  [50.79911, 4.38372],
  [50.79912, 4.38418],
  [50.79917, 4.38469],
  [50.79929, 4.38536],
  [50.79940, 4.38575],
  [50.79963, 4.38633],
  [50.79970, 4.38646],
  [50.79985, 4.38669],
  [50.79999, 4.38686],
  [50.80021, 4.38708],
  [50.80038, 4.38719],
  [50.80053, 4.38724],
  [50.80071, 4.38731],
  [50.80087, 4.38731],
  [50.80100, 4.38729],
  [50.80113, 4.38722],
  [50.80146, 4.38695],
  [50.80193, 4.38645],
  [50.80256, 4.38555],
  [50.80318, 4.38467],
  [50.80339, 4.38442],
  [50.80354, 4.38431],
  [50.80369, 4.38425],
  [50.80398, 4.38419],
  [50.80434, 4.38411],
  [50.80484, 4.38391],
  [50.80519, 4.38374],
  [50.80552, 4.38351],
  [50.80608, 4.38306],
];

// Centre géographique du circuit
const MAP_CENTER: LatLngExpression = [50.8032, 4.3823];

function getPositionOnCircuit(progress: number): LatLngExpression {
  const p = ((progress % 1) + 1) % 1;
  const totalSegments = CIRCUIT_COORDS.length - 1;
  const segFloat = p * totalSegments;
  const idx = Math.min(Math.floor(segFloat), totalSegments - 1);
  const t = segFloat - idx;
  const start = CIRCUIT_COORDS[idx] as [number, number];
  const end = CIRCUIT_COORDS[Math.min(idx + 1, CIRCUIT_COORDS.length - 1)] as [number, number];
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ];
}

// Composant pour empêcher le zoom/scroll involontaire
function MapConfig() {
  const map = useMap();
  useEffect(() => {
    map.scrollWheelZoom.disable();
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
  }, [map]);
  return null;
}

interface CircuitSVGProps {
  bike1Progress: number;
  bike2Progress: number;
  bike3Progress: number;
  bike1Active: boolean;
  bike2Active: boolean;
  bike3Active: boolean;
  bike1Rider?: string;
  bike2Rider?: string;
  bike3Rider?: string;
  dark?: boolean;
}

export function CircuitSVG({
  bike1Progress,
  bike2Progress,
  bike3Progress,
  bike1Active,
  bike2Active,
  bike3Active,
  bike1Rider,
  bike2Rider,
  bike3Rider,
  dark = false,
}: CircuitSVGProps) {
  const pos1 = useMemo(() => getPositionOnCircuit(bike1Progress), [bike1Progress]);
  const pos2 = useMemo(() => getPositionOnCircuit(bike2Progress), [bike2Progress]);
  const pos3 = useMemo(() => getPositionOnCircuit(bike3Progress), [bike3Progress]);

  // Ligne départ/arrivée (petit segment perpendiculaire)
  const startFinish: LatLngExpression[] = [
    [50.80620, 4.38296],
    [50.80596, 4.38316],
  ];

  return (
    <div className="relative w-full" style={{ height: 280 }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={14.8}
        zoomSnap={0}
        zoomControl={false}
        attributionControl={false}
        className="w-full rounded"
        style={{ height: "100%", background: dark ? "#0a0a0a" : "#f5f5f5" }}
      >
        <MapConfig />

        {/* Tuiles carte — style sombre ou clair */}
        {dark ? (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* Tracé du circuit — bordure */}
        <Polyline
          positions={CIRCUIT_COORDS}
          pathOptions={{
            color: dark ? "#4a4a6a" : "#999",
            weight: 8,
            opacity: 0.5,
          }}
        />

        {/* Tracé du circuit — route */}
        <Polyline
          positions={CIRCUIT_COORDS}
          pathOptions={{
            color: dark ? "#e11d48" : "#dc2626",
            weight: 4,
            opacity: 0.8,
            dashArray: "12 6",
          }}
        />

        {/* Ligne départ/arrivée */}
        <Polyline
          positions={startFinish}
          pathOptions={{
            color: "#fff",
            weight: 6,
            opacity: 0.9,
          }}
        />

        {/* Marqueur départ/arrivée */}
        <CircleMarker
          center={[50.80608, 4.38306]}
          radius={6}
          pathOptions={{
            fillColor: "#e11d48",
            color: "#fff",
            weight: 2,
            fillOpacity: 1,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]} className="circuit-tooltip">
            S/F
          </Tooltip>
        </CircleMarker>

        {/* Vélo 1 */}
        {bike1Active && (
          <CircleMarker
            center={pos1}
            radius={10}
            pathOptions={{
              fillColor: "#16a34a",
              color: "#fff",
              weight: 3,
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="right" offset={[12, 0]} className="circuit-tooltip bike-tooltip">
              V1{bike1Rider ? ` — ${bike1Rider}` : ""}
            </Tooltip>
          </CircleMarker>
        )}

        {/* Vélo 2 */}
        {bike2Active && (
          <CircleMarker
            center={pos2}
            radius={10}
            pathOptions={{
              fillColor: "#ea580c",
              color: "#fff",
              weight: 3,
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="right" offset={[12, 0]} className="circuit-tooltip bike-tooltip">
              V2{bike2Rider ? ` — ${bike2Rider}` : ""}
            </Tooltip>
          </CircleMarker>
        )}

        {/* Vélo Pi (CuPiDon) */}
        {bike3Active && (
          <CircleMarker
            center={pos3}
            radius={10}
            pathOptions={{
              fillColor: "#dc2626",
              color: "#fff",
              weight: 3,
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="left" offset={[-12, 0]} className="circuit-tooltip bike-tooltip">
              VPi{bike3Rider ? ` — ${bike3Rider}` : ""}
            </Tooltip>
          </CircleMarker>
        )}

        {/* Vélos inactifs au départ */}
        {!bike1Active && (
          <CircleMarker
            center={[50.80605, 4.38300]}
            radius={5}
            pathOptions={{ fillColor: "#16a34a", color: "#333", weight: 1, fillOpacity: 0.3 }}
          />
        )}
        {!bike2Active && (
          <CircleMarker
            center={[50.80611, 4.38312]}
            radius={5}
            pathOptions={{ fillColor: "#ea580c", color: "#333", weight: 1, fillOpacity: 0.3 }}
          />
        )}
        {!bike3Active && (
          <CircleMarker
            center={[50.80598, 4.38290]}
            radius={5}
            pathOptions={{ fillColor: "#dc2626", color: "#333", weight: 1, fillOpacity: 0.3 }}
          />
        )}
      </MapContainer>

      {/* Overlay infos */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-['Roboto_Mono'] uppercase tracking-widest text-[#888]">
        Bois de la Cambre &bull; 2.61 km/tour
      </div>

      <style>{`
        .circuit-tooltip {
          background: rgba(0,0,0,0.85) !important;
          border: 1px solid #333 !important;
          color: #fff !important;
          font-family: 'Roboto Mono', monospace !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          padding: 2px 6px !important;
          border-radius: 3px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
        }
        .circuit-tooltip::before {
          border-right-color: rgba(0,0,0,0.85) !important;
        }
        .leaflet-tooltip-top::before {
          border-top-color: rgba(0,0,0,0.85) !important;
        }
        .bike-tooltip {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
