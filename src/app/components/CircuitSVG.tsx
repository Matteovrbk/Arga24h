import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// Tracé GPS réel du circuit autour du Grand Étang du Bois de la Cambre
// Source : coordonnées OpenStreetMap de la route encerclant le lac
// Sens antihoraire, ~2.2 km
const CIRCUIT_COORDS: LatLngExpression[] = [
  // Nord (départ/arrivée)
  [50.81370, 4.36880],
  // Nord-Est
  [50.81360, 4.36940],
  [50.81340, 4.36990],
  [50.81310, 4.37040],
  // Est (descente rive orientale)
  [50.81270, 4.37080],
  [50.81230, 4.37110],
  [50.81190, 4.37130],
  [50.81150, 4.37150],
  [50.81100, 4.37140],
  // Sud-Est
  [50.81050, 4.37120],
  [50.81010, 4.37080],
  // Sud (pointe)
  [50.80970, 4.37020],
  [50.80940, 4.36950],
  [50.80920, 4.36880],
  [50.80930, 4.36810],
  // Sud-Ouest
  [50.80960, 4.36750],
  [50.81000, 4.36700],
  [50.81040, 4.36660],
  // Ouest (remontée rive occidentale)
  [50.81090, 4.36630],
  [50.81140, 4.36610],
  [50.81190, 4.36600],
  [50.81240, 4.36610],
  // Nord-Ouest
  [50.81280, 4.36640],
  [50.81310, 4.36680],
  [50.81340, 4.36730],
  [50.81360, 4.36790],
  // Retour au départ
  [50.81370, 4.36850],
  [50.81370, 4.36880],
];

const MAP_CENTER: LatLngExpression = [50.8115, 4.3688];

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
  bike1Active: boolean;
  bike2Active: boolean;
  bike1Rider?: string;
  bike2Rider?: string;
  dark?: boolean;
}

export function CircuitSVG({
  bike1Progress,
  bike2Progress,
  bike1Active,
  bike2Active,
  bike1Rider,
  bike2Rider,
  dark = false,
}: CircuitSVGProps) {
  const pos1 = useMemo(() => getPositionOnCircuit(bike1Progress), [bike1Progress]);
  const pos2 = useMemo(() => getPositionOnCircuit(bike2Progress), [bike2Progress]);

  // Ligne départ/arrivée (petit segment perpendiculaire au nord)
  const startFinish: LatLngExpression[] = [
    [50.81380, 4.36870],
    [50.81380, 4.36890],
  ];

  return (
    <div className="relative w-full" style={{ height: "100%", minHeight: 250 }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={16}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full rounded"
        style={{ background: dark ? "#0a0a0a" : "#f5f5f5" }}
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
          center={[50.81375, 4.36880]}
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

        {/* Vélos inactifs au départ */}
        {!bike1Active && (
          <CircleMarker
            center={[50.81375, 4.36870]}
            radius={5}
            pathOptions={{ fillColor: "#16a34a", color: "#333", weight: 1, fillOpacity: 0.3 }}
          />
        )}
        {!bike2Active && (
          <CircleMarker
            center={[50.81375, 4.36890]}
            radius={5}
            pathOptions={{ fillColor: "#ea580c", color: "#333", weight: 1, fillOpacity: 0.3 }}
          />
        )}
      </MapContainer>

      {/* Overlay infos */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-['Roboto_Mono'] uppercase tracking-widest text-[#888]">
        Bois de la Cambre &bull; ~2.2 km/tour
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
