/*
 * MatoGrossoMap.tsx — Mapa interativo do Mato Grosso por municípios com timeline
 * Carrega GeoJSON dos municípios e renderiza SVG com cores por desmatamento
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

const MT_GEOJSON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/mt_municipios_simple_c968a762.json";

interface MunicipioData {
  nome: string;
  bioma: string;
  area_km2: number;
  cobertura_florestal_pct: number;
  area_protegida_km2: number;
  desmatamento_anual: Record<string, number>;
  desmatamento_evitado: Record<string, { esperado: number; observado: number; evitado: number }>;
}

interface MatoGrossoMapProps {
  municipios: MunicipioData[];
  onSelectMunicipio?: (nome: string) => void;
  selectedMunicipio?: string | null;
}

interface GeoFeature {
  type: string;
  properties: { id: string; name: string };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
}

interface Tooltip {
  x: number;
  y: number;
  nome: string;
  valor: number;
  ano: string;
  temDados: boolean;
}

// Projeção para o Mato Grosso
function projectPoint(lon: number, lat: number, width: number, height: number): [number, number] {
  const minLon = -62, maxLon = -50, minLat = -18, maxLat = -7;
  const x = ((lon - minLon) / (maxLon - minLon)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;
  return [x, y];
}

function coordsToPath(coords: number[][], w: number, h: number): string {
  return coords.map((c, i) => {
    const [x, y] = projectPoint(c[0], c[1], w, h);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join("") + "Z";
}

function featureToPath(geometry: GeoFeature["geometry"], w: number, h: number): string {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as number[][][]).map(ring => coordsToPath(ring, w, h)).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).map(poly =>
      poly.map(ring => coordsToPath(ring, w, h)).join(" ")
    ).join(" ");
  }
  return "";
}

function getColor(value: number, max: number, hasDados: boolean): string {
  if (!hasDados) return "#f0ede7";
  if (value <= 0) return "#c8e6c9";
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.2) {
    const t = ratio / 0.2;
    return `rgb(${Math.round(76 + t * 63)},${Math.round(175 - t * 10)},${Math.round(80 - t * 10)})`;
  }
  if (ratio < 0.4) {
    const t = (ratio - 0.2) / 0.2;
    return `rgb(${Math.round(139 + t * 61)},${Math.round(165 + t * 4)},${Math.round(70 + t * 11)})`;
  }
  if (ratio < 0.6) {
    const t = (ratio - 0.4) / 0.2;
    return `rgb(${Math.round(200 + t * 20)},${Math.round(169 - t * 50)},${Math.round(81 - t * 40)})`;
  }
  if (ratio < 0.8) {
    const t = (ratio - 0.6) / 0.2;
    return `rgb(${Math.round(220 - t * 29)},${Math.round(119 - t * 65)},${Math.round(41 - t * 29)})`;
  }
  const t = (ratio - 0.8) / 0.2;
  return `rgb(${Math.round(191 - t * 51)},${Math.round(54 - t * 34)},${Math.round(12 - t * 7)})`;
}

const ANOS = ["2016","2017","2018","2019","2020","2021","2022","2023","2024"];

export default function MatoGrossoMap({ municipios, onSelectMunicipio, selectedMunicipio }: MatoGrossoMapProps) {
  const [geoData, setGeoData] = useState<GeoFeature[] | null>(null);
  const [anoIdx, setAnoIdx] = useState(ANOS.length - 1);
  const [playing, setPlaying] = useState(false);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const ano = ANOS[anoIdx];
  const W = 550, H = 500;

  useEffect(() => {
    fetch(MT_GEOJSON_URL)
      .then(r => r.json())
      .then(data => {
        setGeoData(data.features);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Mapa nome -> dados
  const muniMap = useMemo(() => {
    const m: Record<string, MunicipioData> = {};
    for (const mun of municipios) m[mun.nome] = mun;
    return m;
  }, [municipios]);

  // Máximo para escala
  const maxDesmatamento = useMemo(() => {
    let max = 0;
    for (const m of municipios) {
      for (const a of ANOS) {
        const v = m.desmatamento_anual[a] || 0;
        if (v > max) max = v;
      }
    }
    return max;
  }, [municipios]);

  // Play/Pause
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setAnoIdx(prev => {
          if (prev >= ANOS.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  const handlePlay = useCallback(() => {
    if (anoIdx >= ANOS.length - 1) setAnoIdx(0);
    setPlaying(true);
  }, [anoIdx]);

  const handleMouseMove = useCallback((e: React.MouseEvent, name: string) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mun = muniMap[name];
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      nome: name,
      valor: mun?.desmatamento_anual[ano] || 0,
      ano,
      temDados: !!mun,
    });
  }, [muniMap, ano]);

  // Total MT no ano
  const totalAno = useMemo(() => {
    return municipios.reduce((s, m) => s + (m.desmatamento_anual[ano] || 0), 0);
  }, [municipios, ano]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "#7a7568" }}>
        <div className="animate-spin w-6 h-6 border-2 rounded-full mr-3" style={{ borderColor: "#2E7D32", borderTopColor: "transparent" }} />
        Carregando mapa do Mato Grosso...
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Mato Grosso — Municípios — {ano}
          </h3>
          <p className="text-sm" style={{ color: "#7a7568" }}>
            Total (26 municípios monitorados): <span style={{ color: "#BF360C", fontWeight: 600 }}>{totalAno.toLocaleString("pt-BR")} km²</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "#9a958e" }}>Municípios com dados em destaque</p>
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative px-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: "450px" }}
        >
          {geoData?.map((feat) => {
            const name = feat.properties.name;
            const mun = muniMap[name];
            const valor = mun?.desmatamento_anual[ano] || 0;
            const hasDados = !!mun;
            const color = getColor(valor, maxDesmatamento, hasDados);
            const isSelected = selectedMunicipio === name;
            const path = featureToPath(feat.geometry, W, H);

            return (
              <path
                key={feat.properties.id}
                d={path}
                fill={color}
                stroke={isSelected ? "#2c2417" : hasDados ? "#fff" : "#e0ddd5"}
                strokeWidth={isSelected ? 2 : 0.5}
                style={{ cursor: hasDados ? "pointer" : "default", transition: "fill 0.5s ease, stroke-width 0.2s" }}
                onClick={() => hasDados && onSelectMunicipio?.(name)}
                onMouseMove={(e) => handleMouseMove(e, name)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none rounded-lg px-3 py-2 shadow-lg z-10"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
              background: "rgba(44,36,23,0.92)",
              color: "#fff",
            }}
          >
            <p className="text-xs font-semibold">{tooltip.nome}</p>
            {tooltip.temDados ? (
              <p className="text-xs">{tooltip.ano}: <span style={{ color: "#a8d5a2" }}>{tooltip.valor.toLocaleString("pt-BR")} km²</span></p>
            ) : (
              <p className="text-xs" style={{ color: "#9a958e" }}>Sem dados detalhados</p>
            )}
          </div>
        )}

        {/* Legenda */}
        <div className="absolute bottom-3 left-5 flex items-center gap-1">
          <span className="text-xs" style={{ color: "#7a7568" }}>Menor</span>
          <div className="flex h-3 rounded-sm overflow-hidden" style={{ width: "100px" }}>
            {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((r, i) => (
              <div key={i} className="flex-1" style={{ background: getColor(r * maxDesmatamento, maxDesmatamento, true) }} />
            ))}
          </div>
          <span className="text-xs" style={{ color: "#7a7568" }}>Maior</span>
        </div>

        {/* Indicador de sem dados */}
        <div className="absolute bottom-3 right-5 flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: "#f0ede7", border: "1px solid #e0ddd5" }} />
          <span className="text-xs" style={{ color: "#9a958e" }}>Sem dados</span>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid #f0ede7" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setPlaying(false); setAnoIdx(0); }}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "#7a7568" }}
            title="Início"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={playing ? () => setPlaying(false) : handlePlay}
            className="p-2 rounded-full transition-all"
            style={{ background: "#2E7D32", color: "#fff" }}
            title={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => { setPlaying(false); setAnoIdx(ANOS.length - 1); }}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "#7a7568" }}
            title="Fim"
          >
            <SkipForward size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "#5a5448", minWidth: "32px" }}>
              {ANOS[0]}
            </span>
            <input
              type="range"
              min={0}
              max={ANOS.length - 1}
              value={anoIdx}
              onChange={(e) => { setPlaying(false); setAnoIdx(Number(e.target.value)); }}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #2E7D32 ${(anoIdx / (ANOS.length - 1)) * 100}%, #e8e5dd ${(anoIdx / (ANOS.length - 1)) * 100}%)`,
                accentColor: "#2E7D32",
              }}
            />
            <span className="text-xs font-medium" style={{ color: "#5a5448", minWidth: "32px" }}>
              {ANOS[ANOS.length - 1]}
            </span>
          </div>
          <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: "#f4f3ee", color: "#2c2417", minWidth: "50px", textAlign: "center" }}>
            {ano}
          </span>
        </div>
      </div>
    </div>
  );
}
