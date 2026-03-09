/*
 * MatoGrossoMap.tsx — Mapa interativo do Mato Grosso por municípios com timeline
 * Dois modos: "desmatamento" (vermelho=pior) e "evitado" (verde=preservou mais)
 * Sincronizado com a página via selectedYear/onYearChange
 * Suporta filtro por bioma
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, TreePine, Flame } from "lucide-react";

const MT_GEOJSON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/mt_municipios_simple_c968a762.json";

type MapMode = "desmatamento" | "evitado";

interface MunicipioData {
  nome: string;
  bioma: string;
  area_km2: number;
  cobertura_florestal_pct: number;
  desmatamento_anual: Record<string, number>;
  desmatamento_evitado: Record<string, { esperado: number; observado: number; evitado: number }>;
}

interface MatoGrossoMapProps {
  municipios: MunicipioData[];
  onSelectMunicipio?: (nome: string) => void;
  selectedMunicipio?: string | null;
  selectedBioma?: string;
  selectedYear?: string;
  onYearChange?: (year: string) => void;
}

interface GeoFeature {
  type: string;
  properties: { id: string; name: string };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
}

interface TooltipData {
  x: number; y: number;
  nome: string; valor: number; evitado: number;
  ano: string; temDados: boolean; bioma?: string;
}

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

function getColorDesmatamento(value: number, max: number, hasDados: boolean): string {
  if (!hasDados) return "#f0ede7";
  if (value <= 0) return "#c8e6c9";
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.2) {
    const t = ratio / 0.2;
    return `rgb(${Math.round(46 + t * 93)},${Math.round(125 + t * 40)},${Math.round(50 + t * 20)})`;
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

function getColorEvitado(value: number, maxAbs: number, hasDados: boolean): string {
  if (!hasDados) return "#f0ede7";
  if (maxAbs === 0) return "#e8e5dd";
  const ratio = value / maxAbs;
  if (ratio >= 0) {
    const t = Math.min(ratio, 1);
    return `rgb(${Math.round(220 - t * 174)},${Math.round(220 - t * 95)},${Math.round(220 - t * 170)})`;
  } else {
    const t = Math.min(Math.abs(ratio), 1);
    return `rgb(${Math.round(220 - t * 29)},${Math.round(220 - t * 166)},${Math.round(220 - t * 208)})`;
  }
}

const ANOS = ["2016","2017","2018","2019","2020","2021","2022","2023","2024"];

export default function MatoGrossoMap({ municipios, onSelectMunicipio, selectedMunicipio, selectedBioma = "Todos", selectedYear, onYearChange }: MatoGrossoMapProps) {
  const [geoData, setGeoData] = useState<GeoFeature[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapMode, setMapMode] = useState<MapMode>("desmatamento");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const anoIdx = selectedYear ? ANOS.indexOf(selectedYear) : ANOS.length - 1;
  const ano = ANOS[Math.max(0, anoIdx >= 0 ? anoIdx : ANOS.length - 1)];
  const effectiveIdx = Math.max(0, anoIdx >= 0 ? anoIdx : ANOS.length - 1);
  const W = 550, H = 500;

  useEffect(() => {
    fetch(MT_GEOJSON_URL)
      .then(r => r.json())
      .then(data => { setGeoData(data.features); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const muniMap = useMemo(() => {
    const m: Record<string, MunicipioData> = {};
    for (const mun of municipios) m[mun.nome] = mun;
    return m;
  }, [municipios]);

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

  const maxAbsEvitado = useMemo(() => {
    let max = 0;
    for (const m of municipios) {
      const ev = m.desmatamento_evitado?.[ano];
      if (ev) {
        const abs = Math.abs(ev.evitado);
        if (abs > max) max = abs;
      }
    }
    return max || 1;
  }, [municipios, ano]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const nextIdx = effectiveIdx + 1;
        if (nextIdx >= ANOS.length) {
          setPlaying(false);
        } else {
          onYearChange?.(ANOS[nextIdx]);
        }
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, effectiveIdx, onYearChange]);

  const handlePlay = useCallback(() => {
    if (effectiveIdx >= ANOS.length - 1) onYearChange?.(ANOS[0]);
    setPlaying(true);
  }, [effectiveIdx, onYearChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent, name: string) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mun = muniMap[name];
    const ev = mun?.desmatamento_evitado?.[ano];
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      nome: name,
      valor: mun?.desmatamento_anual[ano] || 0,
      evitado: ev?.evitado || 0,
      ano,
      temDados: !!mun,
      bioma: mun?.bioma,
    });
  }, [muniMap, ano]);

  const totalAno = useMemo(() => {
    const filtered = selectedBioma === "Todos" ? municipios : municipios.filter(m => m.bioma.includes(selectedBioma));
    if (mapMode === "desmatamento") {
      return filtered.reduce((s, m) => s + (m.desmatamento_anual[ano] || 0), 0);
    } else {
      return filtered.reduce((s, m) => {
        const ev = m.desmatamento_evitado?.[ano];
        return s + (ev?.evitado || 0);
      }, 0);
    }
  }, [municipios, ano, selectedBioma, mapMode]);

  const countFiltered = useMemo(() => {
    if (selectedBioma === "Todos") return municipios.length;
    return municipios.filter(m => m.bioma.includes(selectedBioma)).length;
  }, [municipios, selectedBioma]);

  const biomaLabel = selectedBioma === "Todos" ? `${municipios.length} municípios monitorados` : `${countFiltered} municípios (${selectedBioma})`;

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
      {/* Header com toggle de modo */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
              {mapMode === "desmatamento" ? "Mato Grosso — Desmatamento" : "Mato Grosso — Desmatamento Evitado"} — {ano}
            </h3>
            <p className="text-sm" style={{ color: "#7a7568" }}>
              {mapMode === "desmatamento" ? (
                <>Total ({biomaLabel}): <span style={{ color: "#BF360C", fontWeight: 600 }}>{totalAno.toLocaleString("pt-BR")} km²</span></>
              ) : (
                <>Saldo ({biomaLabel}): <span style={{ color: totalAno >= 0 ? "#2E7D32" : "#BF360C", fontWeight: 600 }}>{totalAno >= 0 ? "+" : ""}{Math.round(totalAno).toLocaleString("pt-BR")} km²</span></>
              )}
            </p>
          </div>
          <p className="text-xs" style={{ color: "#9a958e" }}>Municípios com dados em destaque</p>
        </div>

        {/* Toggle Desmatamento / Evitado */}
        <div className="flex gap-2">
          <button
            onClick={() => setMapMode("desmatamento")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: mapMode === "desmatamento" ? "#BF360C" : "#f4f3ee",
              color: mapMode === "desmatamento" ? "#fff" : "#7a7568",
              border: `1px solid ${mapMode === "desmatamento" ? "#BF360C" : "#e8e5dd"}`,
            }}
          >
            <Flame size={13} /> Desmatamento
          </button>
          <button
            onClick={() => setMapMode("evitado")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: mapMode === "evitado" ? "#2E7D32" : "#f4f3ee",
              color: mapMode === "evitado" ? "#fff" : "#7a7568",
              border: `1px solid ${mapMode === "evitado" ? "#2E7D32" : "#e8e5dd"}`,
            }}
          >
            <TreePine size={13} /> Desmatamento Evitado
          </button>
        </div>
      </div>

      <div className="relative px-3">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: "450px" }}>
          {geoData?.map((feat) => {
            const name = feat.properties.name;
            const mun = muniMap[name];
            const valor = mun?.desmatamento_anual[ano] || 0;
            const hasDados = !!mun;
            const ev = mun?.desmatamento_evitado?.[ano];
            const evitado = ev?.evitado || 0;

            const color = mapMode === "desmatamento"
              ? getColorDesmatamento(valor, maxDesmatamento, hasDados)
              : getColorEvitado(evitado, maxAbsEvitado, hasDados);

            const isSelected = selectedMunicipio === name;
            const path = featureToPath(feat.geometry, W, H);
            const inBioma = selectedBioma === "Todos" || (mun?.bioma?.includes(selectedBioma) ?? false);
            const opacity = !hasDados ? 0.4 : (inBioma ? 1 : 0.2);

            return (
              <path
                key={feat.properties.id}
                d={path}
                fill={color}
                stroke={isSelected ? "#2c2417" : hasDados ? "#fff" : "#e0ddd5"}
                strokeWidth={isSelected ? 2.5 : 0.5}
                opacity={opacity}
                style={{ cursor: hasDados ? "pointer" : "default", transition: "fill 0.5s ease, opacity 0.4s ease, stroke-width 0.2s" }}
                onClick={() => hasDados && onSelectMunicipio?.(name)}
                onMouseMove={(e) => handleMouseMove(e, name)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </svg>

        {tooltip && (
          <div
            className="absolute pointer-events-none rounded-lg px-3 py-2 shadow-lg z-10"
            style={{
              left: tooltip.x, top: tooltip.y,
              transform: "translate(-50%, -100%)",
              background: "rgba(44,36,23,0.92)", color: "#fff",
            }}
          >
            <p className="text-xs font-semibold">{tooltip.nome}</p>
            {tooltip.temDados ? (
              <>
                <p className="text-xs">{tooltip.ano}: <span style={{ color: "#ffab91" }}>{tooltip.valor.toLocaleString("pt-BR")} km²</span> desmatado</p>
                <p className="text-xs">Evitado: <span style={{ color: tooltip.evitado >= 0 ? "#a8d5a2" : "#ffab91" }}>
                  {tooltip.evitado >= 0 ? "+" : ""}{Math.round(tooltip.evitado).toLocaleString("pt-BR")} km²
                </span></p>
                {tooltip.bioma && <p className="text-xs" style={{ color: "#c8c0b0" }}>{tooltip.bioma}</p>}
              </>
            ) : (
              <p className="text-xs" style={{ color: "#9a958e" }}>Sem dados detalhados</p>
            )}
          </div>
        )}

        {/* Legenda */}
        {mapMode === "desmatamento" ? (
          <div className="absolute bottom-3 left-5 flex items-center gap-1">
            <span className="text-xs" style={{ color: "#7a7568" }}>Menor</span>
            <div className="flex h-3 rounded-sm overflow-hidden" style={{ width: "100px" }}>
              {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((r, i) => (
                <div key={i} className="flex-1" style={{ background: getColorDesmatamento(r * maxDesmatamento, maxDesmatamento, true) }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: "#7a7568" }}>Maior</span>
          </div>
        ) : (
          <div className="absolute bottom-3 left-5 flex items-center gap-1">
            <span className="text-xs" style={{ color: "#BF360C" }}>Desmatou mais</span>
            <div className="flex h-3 rounded-sm overflow-hidden" style={{ width: "120px" }}>
              {[-1, -0.7, -0.3, 0, 0.3, 0.7, 1].map((r, i) => (
                <div key={i} className="flex-1" style={{ background: getColorEvitado(r * maxAbsEvitado, maxAbsEvitado, true) }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: "#2E7D32" }}>Preservou mais</span>
          </div>
        )}

        <div className="absolute bottom-3 right-5 flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: "#f0ede7", border: "1px solid #e0ddd5" }} />
          <span className="text-xs" style={{ color: "#9a958e" }}>Sem dados</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid #f0ede7" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { setPlaying(false); onYearChange?.(ANOS[0]); }} className="p-1.5 rounded-md" style={{ color: "#7a7568" }} title="Início">
            <SkipBack size={16} />
          </button>
          <button onClick={playing ? () => setPlaying(false) : handlePlay} className="p-2 rounded-full" style={{ background: "#2E7D32", color: "#fff" }} title={playing ? "Pausar" : "Reproduzir"}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={() => { setPlaying(false); onYearChange?.(ANOS[ANOS.length - 1]); }} className="p-1.5 rounded-md" style={{ color: "#7a7568" }} title="Fim">
            <SkipForward size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "#5a5448", minWidth: "32px" }}>{ANOS[0]}</span>
            <input
              type="range" min={0} max={ANOS.length - 1} value={effectiveIdx}
              onChange={(e) => { setPlaying(false); onYearChange?.(ANOS[Number(e.target.value)]); }}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #2E7D32 ${(effectiveIdx / (ANOS.length - 1)) * 100}%, #e8e5dd ${(effectiveIdx / (ANOS.length - 1)) * 100}%)`,
                accentColor: "#2E7D32",
              }}
            />
            <span className="text-xs font-medium" style={{ color: "#5a5448", minWidth: "32px" }}>{ANOS[ANOS.length - 1]}</span>
          </div>
          <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: "#f4f3ee", color: "#2c2417", minWidth: "50px", textAlign: "center" }}>
            {ano}
          </span>
        </div>
      </div>
    </div>
  );
}
