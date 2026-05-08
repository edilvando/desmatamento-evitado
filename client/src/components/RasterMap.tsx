/**
 * RasterMap.tsx — Mapa interativo com tiles de risco ACEU e desmatamento evitado
 * Usa Leaflet + react-leaflet para exibir rasters sobre mapa base.
 * Suporta toggle entre camadas: risco de desmatamento e desmatamento evitado.
 */
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl } from "react-leaflet";
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

// Legenda de classes de desmatamento evitado
const CLASSES_EVITADO = [
  { classe: 1, nome: "Floresta mantida (esperado)", cor: "#C8C8C8" },
  { classe: 2, nome: "Parcialmente evitado", cor: "#ADD8E6" },
  { classe: 3, nome: "Desmatamento evitado", cor: "#008000" },
  { classe: 4, nome: "Fortemente evitado", cor: "#005000" },
  { classe: 5, nome: "Perda confirmada", cor: "#DC1414" },
  { classe: 6, nome: "Perda inesperada", cor: "#800080" },
];

type CamadaAtiva = "risco" | "evitado";

interface RasterMapProps {
  showLegend?: boolean;
  showMunicipios?: boolean;
  onMunicipioClick?: (codigo: string, nome: string) => void;
  className?: string;
  camadaInicial?: CamadaAtiva;
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
  showLegend = true,
  showMunicipios = true,
  onMunicipioClick,
  className = "",
  camadaInicial = "risco",
}: RasterMapProps) {
  const [municipiosGeo, setMunicipiosGeo] = useState<FeatureCollection | null>(null);
  const [camadaAtiva, setCamadaAtiva] = useState<CamadaAtiva>(camadaInicial);

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

  const tilesUrl =
    camadaAtiva === "risco"
      ? "/tiles/risco/{z}/{x}/{y}.png"
      : "/tiles/evitado/{z}/{x}/{y}.png";

  const legendaAtiva = camadaAtiva === "risco" ? CLASSES_RISCO : CLASSES_EVITADO;
  const tituloLegenda =
    camadaAtiva === "risco" ? "Risco de Desmatamento" : "Desmatamento Evitado";

  return (
    <div className={`relative w-full ${className}`} style={{ minHeight: "500px" }}>
      {/* Seletor de camada */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 rounded-lg shadow-md p-2">
        <p className="text-xs text-gray-500 mb-1.5 px-1">Camada</p>
        <button
          onClick={() => setCamadaAtiva("risco")}
          className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
            camadaAtiva === "risco"
              ? "bg-green-700 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Risco de Desmatamento
        </button>
        <button
          onClick={() => setCamadaAtiva("evitado")}
          className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
            camadaAtiva === "evitado"
              ? "bg-green-700 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Desmatamento Evitado
        </button>
      </div>

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

        {/* Tiles da camada ativa (risco ou desmatamento evitado) */}
        <TileLayer
          key={camadaAtiva}
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

      {/* Legenda dinâmica */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 rounded-lg p-3 shadow-md text-sm max-w-[220px]">
          <p className="font-medium text-gray-700 mb-2">{tituloLegenda}</p>
          {legendaAtiva.map((c) => (
            <div key={c.classe} className="flex items-center gap-2 mb-1">
              <div
                className="w-4 h-4 rounded-sm flex-shrink-0"
                style={{ backgroundColor: c.cor, opacity: 0.85 }}
              />
              <span className="text-gray-600 text-xs">
                {c.nome}
                {"prob" in c ? ` (${(c as any).prob})` : ""}
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
