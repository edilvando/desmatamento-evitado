/**
 * RasterMap.tsx — Mapa interativo com tiles de risco ACEU
 * Usa Leaflet + react-leaflet para exibir o raster de probabilidade
 * de desmatamento sobre um mapa base, com zoom e interação.
 */
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { FeatureCollection } from "geojson";

// Metadados dos tiles (gerados pelo pipeline Python)
const TILES_METADATA = {
  bounds: {
    south: -18.05,
    west: -61.63,
    north: -7.35,
    east: -50.22,
  },
  center: { lat: -12.7, lon: -55.9 },
  zoom_min: 5,
  zoom_max: 12,
};

// Legenda de classes de risco
const CLASSES_RISCO = [
  { classe: 1, nome: "Risco muito baixo", cor: "#228B22", prob: "10%" },
  { classe: 2, nome: "Risco baixo", cor: "#90EE90", prob: "30%" },
  { classe: 3, nome: "Risco médio", cor: "#FFFF00", prob: "50%" },
  { classe: 4, nome: "Risco alto", cor: "#FFA500", prob: "70%" },
  { classe: 5, nome: "Risco muito alto", cor: "#DC1414", prob: "90%" },
];

interface RasterMapProps {
  tilesUrl?: string;
  showLegend?: boolean;
  showMunicipios?: boolean;
  onMunicipioClick?: (codigo: string, nome: string) => void;
  className?: string;
}

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    const { south, west, north, east } = TILES_METADATA.bounds;
    map.fitBounds([
      [south, west],
      [north, east],
    ]);
  }, [map]);
  return null;
}

export default function RasterMap({
  tilesUrl = "/tiles/{z}/{x}/{y}.png",
  showLegend = true,
  showMunicipios = true,
  onMunicipioClick,
  className = "",
}: RasterMapProps) {
  const [municipiosGeo, setMunicipiosGeo] = useState<FeatureCollection | null>(null);

  // Carregar GeoJSON dos municípios para overlay
  useEffect(() => {
    if (showMunicipios) {
      fetch("/tiles/municipios_mt.geojson")
        .then((r) => {
          if (r.ok) return r.json();
          return null;
        })
        .then((data) => {
          if (data) setMunicipiosGeo(data);
        })
        .catch(() => {});
    }
  }, [showMunicipios]);

  return (
    <div className={`relative w-full ${className}`} style={{ minHeight: "500px" }}>
      <MapContainer
        center={[TILES_METADATA.center.lat, TILES_METADATA.center.lon]}
        zoom={6}
        minZoom={TILES_METADATA.zoom_min}
        maxZoom={TILES_METADATA.zoom_max}
        style={{ height: "100%", width: "100%", minHeight: "500px", borderRadius: "8px" }}
        scrollWheelZoom={true}
      >
        {/* Mapa base OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.6}
        />

        {/* Tiles do risco ACEU (gerados pelo pipeline Python) */}
        <TileLayer
          url={tilesUrl}
          opacity={0.75}
          tms={false}
          maxZoom={TILES_METADATA.zoom_max}
          minZoom={TILES_METADATA.zoom_min}
        />

        {/* Limites municipais como overlay */}
        {municipiosGeo && (
          <GeoJSON
            data={municipiosGeo}
            style={{
              color: "#333",
              weight: 0.8,
              fillOpacity: 0,
              opacity: 0.5,
            }}
            onEachFeature={(feature, layer) => {
              const nome = feature.properties?.NM_MUN || feature.properties?.nome || "";
              const codigo = feature.properties?.CD_MUN || feature.properties?.codarea || "";
              layer.bindTooltip(nome, { sticky: true });
              if (onMunicipioClick) {
                layer.on("click", () => onMunicipioClick(codigo, nome));
              }
            }}
          />
        )}

        <FitBounds />
      </MapContainer>

      {/* Legenda */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 rounded-lg p-3 shadow-md text-sm">
          <p className="font-medium text-gray-700 mb-2">Risco de Desmatamento</p>
          {CLASSES_RISCO.map((c) => (
            <div key={c.classe} className="flex items-center gap-2 mb-1">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: c.cor, opacity: 0.8 }}
              />
              <span className="text-gray-600 text-xs">
                {c.nome} ({c.prob})
              </span>
            </div>
          ))}
          <p className="text-gray-400 text-xs mt-2 border-t pt-1">
            Modelo ACEU / Hectares Indicator
          </p>
        </div>
      )}
    </div>
  );
}
