/*
 * MatoGrosso.tsx — Visão detalhada por municípios do MT
 * Mapa interativo com timeline, ranking, gráficos comparativos
 */
import Layout from "@/components/Layout";
import MatoGrossoMap from "@/components/MatoGrossoMap";
import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Search, ArrowUpDown, TreePine, Shield, Leaf, X, TrendingDown, TrendingUp } from "lucide-react";
import desmatamentoData from "@/data/desmatamento.json";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/hero-amazonia-7RADVFFLPdKKonoZx4vaUp.webp";

export default function MatoGrosso() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "2024" | "florestal">("2024");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("2024");
  const detailRef = useRef<HTMLDivElement>(null);

  const municipios = desmatamentoData.municipios_mt;

  // Scroll para detalhe quando selecionar município
  useEffect(() => {
    if (selectedMunicipio && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedMunicipio]);

  const filtered = useMemo(() => {
    let data = [...municipios];
    if (searchTerm) {
      data = data.filter((m) => m.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    data.sort((a, b) => {
      if (sortBy === "nome") return sortDir === "asc" ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome);
      if (sortBy === "2024") {
        const va = a.desmatamento_anual[selectedYear as keyof typeof a.desmatamento_anual] || 0;
        const vb = b.desmatamento_anual[selectedYear as keyof typeof b.desmatamento_anual] || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc" ? a.cobertura_florestal_pct - b.cobertura_florestal_pct : b.cobertura_florestal_pct - a.cobertura_florestal_pct;
    });
    return data;
  }, [municipios, searchTerm, sortBy, sortDir, selectedYear]);

  const rankingData = useMemo(() => {
    return [...municipios]
      .sort((a, b) => (b.desmatamento_anual[selectedYear as keyof typeof b.desmatamento_anual] || 0) - (a.desmatamento_anual[selectedYear as keyof typeof a.desmatamento_anual] || 0))
      .slice(0, 10)
      .map((m) => ({
        nome: m.nome.length > 12 ? m.nome.substring(0, 12) + "…" : m.nome,
        desmatamento: m.desmatamento_anual[selectedYear as keyof typeof m.desmatamento_anual] || 0,
      }));
  }, [municipios, selectedYear]);

  const detail = selectedMunicipio ? municipios.find((m) => m.nome === selectedMunicipio) : null;

  const detailSerie = useMemo(() => {
    if (!detail) return [];
    return Object.entries(detail.desmatamento_anual)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, val]) => ({ ano, desmatamento: val }));
  }, [detail]);

  const detailEvitado = useMemo(() => {
    if (!detail?.desmatamento_evitado) return [];
    return Object.entries(detail.desmatamento_evitado)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, val]: [string, any]) => ({
        ano,
        esperado: val.esperado,
        observado: val.observado,
        evitado: val.evitado,
      }));
  }, [detail]);

  // Estatísticas do município selecionado
  const detailStats = useMemo(() => {
    if (!detail) return null;
    const v24 = detail.desmatamento_anual["2024"] || 0;
    const v23 = detail.desmatamento_anual["2023"] || 0;
    const change = v23 > 0 ? ((v24 - v23) / v23 * 100) : 0;
    const totalEvitado = Object.values(detail.desmatamento_evitado || {})
      .reduce((s: number, v: any) => s + (v.evitado > 0 ? v.evitado : 0), 0);
    return { v24, change, totalEvitado };
  }, [detail]);

  const toggleSort = (col: "nome" | "2024" | "florestal") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const handleSelectMunicipio = (nome: string) => {
    setSelectedMunicipio(selectedMunicipio === nome ? null : nome);
  };

  const anos = ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];

  // Totais MT
  const totalMT = municipios.reduce((s, m) => s + (m.desmatamento_anual[selectedYear as keyof typeof m.desmatamento_anual] || 0), 0);
  const avgFlorestal = (municipios.reduce((s, m) => s + m.cobertura_florestal_pct, 0) / municipios.length).toFixed(1);
  const totalProtegida = municipios.reduce((s, m) => s + m.area_protegida_km2, 0);

  return (
    <Layout>
      {/* Banner */}
      <section className="relative overflow-hidden" style={{ height: "280px" }}>
        <img src={HERO_IMG} alt="Amazônia" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.65))" }} />
        <div className="relative container flex flex-col justify-end h-full pb-10">
          <p className="text-sm font-semibold tracking-widest uppercase mb-2" style={{ color: "#a8d5a2" }}>Análise Municipal</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "#fff", fontFamily: "'Merriweather', serif" }}>
            Mato Grosso — Municípios
          </h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.8)", maxWidth: "600px" }}>
            Dados detalhados de 26 municípios com desmatamento, cobertura florestal e áreas protegidas.
          </p>
        </div>
      </section>

      {/* Indicadores */}
      <section className="py-10">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
                <TreePine size={20} style={{ color: "#2E7D32" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#2E7D32" }}>{totalMT.toLocaleString("pt-BR")} km²</p>
                <p className="text-xs" style={{ color: "#7a7568" }}>Desmatamento {selectedYear}</p>
              </div>
            </div>
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
                <Leaf size={20} style={{ color: "#2E7D32" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#2E7D32" }}>{avgFlorestal}%</p>
                <p className="text-xs" style={{ color: "#7a7568" }}>Cobertura florestal média</p>
              </div>
            </div>
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
                <Shield size={20} style={{ color: "#2E7D32" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#2E7D32" }}>{totalProtegida.toLocaleString("pt-BR")} km²</p>
                <p className="text-xs" style={{ color: "#7a7568" }}>Áreas protegidas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mapa + Ranking lado a lado */}
      <section className="py-8">
        <div className="container">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Mapa do MT */}
            <MatoGrossoMap
              municipios={municipios as any}
              onSelectMunicipio={handleSelectMunicipio}
              selectedMunicipio={selectedMunicipio}
            />

            {/* Ranking */}
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                    Top 10 Municípios
                  </h3>
                  <p className="text-sm" style={{ color: "#7a7568" }}>Maiores desmatadores em {selectedYear}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "#7a7568" }}>Ano:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm"
                    style={{ background: "#f4f3ee", border: "1px solid #e8e5dd", color: "#2c2417" }}
                  >
                    {anos.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="px-3 pb-3">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={rankingData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#7a7568" }} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: "#5a5448" }} width={110} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                    />
                    <Bar dataKey="desmatamento" radius={[0, 4, 4, 0]}>
                      {rankingData.map((_, i) => (
                        <Cell key={i} fill={i < 3 ? "#BF360C" : i < 6 ? "#C8A951" : "#2E7D32"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detalhe do município selecionado */}
      {detail && detailStats && (
        <section className="py-8" ref={detailRef} style={{ background: "#f9f8f5" }}>
          <div className="container">
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3" style={{ borderBottom: "1px solid #f0ede7" }}>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                    {detail.nome}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "#7a7568" }}>
                    {detail.bioma} — Área: {detail.area_km2.toLocaleString("pt-BR")} km² — Cobertura florestal: {detail.cobertura_florestal_pct}%
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMunicipio(null)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "#7a7568", background: "#f4f3ee" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Indicadores */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 px-6 py-5" style={{ borderBottom: "1px solid #f0ede7" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(191,54,12,0.08)" }}>
                    <TreePine size={18} style={{ color: "#BF360C" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#2c2417" }}>{detailStats.v24.toLocaleString("pt-BR")} km²</p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Desmatamento 2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: detailStats.change < 0 ? "rgba(46,125,50,0.08)" : "rgba(191,54,12,0.08)" }}>
                    {detailStats.change < 0 ? <TrendingDown size={18} style={{ color: "#2E7D32" }} /> : <TrendingUp size={18} style={{ color: "#BF360C" }} />}
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: detailStats.change < 0 ? "#2E7D32" : "#BF360C" }}>
                      {detailStats.change < 0 ? "↓" : "↑"} {Math.abs(detailStats.change).toFixed(1)}%
                    </p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Var. 2023→2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.08)" }}>
                    <Shield size={18} style={{ color: "#2E7D32" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#2E7D32" }}>{detail.area_protegida_km2.toLocaleString("pt-BR")} km²</p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Áreas protegidas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.08)" }}>
                    <TreePine size={18} style={{ color: "#2E7D32" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#2E7D32" }}>{Math.round(detailStats.totalEvitado).toLocaleString("pt-BR")} km²</p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Total evitado</p>
                  </div>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Série Histórica de Desmatamento (km²)</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={detailSerie}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                      <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                      />
                      <Bar dataKey="desmatamento" fill="#8D6E63" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Desmatamento Evitado (Esperado vs Observado)</h4>
                  {detailEvitado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={detailEvitado}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                        <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} />
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                          formatter={(value: number, name: string) => {
                            const label = name === "esperado" ? "Esperado" : name === "observado" ? "Observado" : "Evitado";
                            return [`${value.toLocaleString("pt-BR")} km²`, label];
                          }}
                        />
                        <Legend formatter={(v) => v === "esperado" ? "Esperado" : v === "observado" ? "Observado" : "Evitado"} />
                        <Line type="monotone" dataKey="esperado" stroke="#C8A951" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="observado" stroke="#BF360C" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="evitado" stroke="#2E7D32" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]" style={{ color: "#9a958e" }}>
                      <p className="text-sm">Dados insuficientes para cálculo do desmatamento evitado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tabela de municípios */}
      <section className="py-8">
        <div className="container">
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9a958e" }} />
              <input
                type="text"
                placeholder="Buscar município..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
                style={{ background: "#fff", border: "1px solid #e8e5dd", color: "#2c2417" }}
              />
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                    <th className="text-left px-4 py-3 font-semibold cursor-pointer" style={{ color: "#5a5448" }} onClick={() => toggleSort("nome")}>
                      <span className="inline-flex items-center gap-1">Município <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Bioma</th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Área (km²)</th>
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer" style={{ color: "#5a5448" }} onClick={() => toggleSort("florestal")}>
                      <span className="inline-flex items-center gap-1 justify-end">Floresta (%) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Protegida (km²)</th>
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer" style={{ color: "#5a5448" }} onClick={() => toggleSort("2024")}>
                      <span className="inline-flex items-center gap-1 justify-end">{selectedYear} (km²) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const val = m.desmatamento_anual[selectedYear as keyof typeof m.desmatamento_anual] || 0;
                    const isActive = selectedMunicipio === m.nome;
                    return (
                      <tr
                        key={m.nome}
                        style={{
                          borderBottom: "1px solid #f0ede7",
                          background: isActive ? "rgba(46,125,50,0.04)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#fafaf5"; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? "rgba(46,125,50,0.04)" : "transparent"; }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: "#2c2417" }}>{m.nome}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(46,125,50,0.08)", color: "#2E7D32" }}>
                            {m.bioma}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#7a7568" }}>{m.area_km2.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "#e8e5dd" }}>
                              <div className="h-full rounded-full" style={{ width: `${m.cobertura_florestal_pct}%`, background: "#2E7D32" }} />
                            </div>
                            <span className="text-xs" style={{ color: "#5a5448" }}>{m.cobertura_florestal_pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#7a7568" }}>{m.area_protegida_km2.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: "#2c2417" }}>{val.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSelectMunicipio(m.nome)}
                            className="text-xs px-3 py-1 rounded-md font-medium transition-all"
                            style={{
                              background: isActive ? "#2E7D32" : "rgba(46,125,50,0.08)",
                              color: isActive ? "#fff" : "#2E7D32",
                            }}
                          >
                            {isActive ? "Fechar" : "Ver"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
