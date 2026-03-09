/*
 * Estados.tsx — Visão macro por estados do Brasil
 * Inclui mapa interativo com timeline, gráficos de série temporal,
 * filtros por bioma, e série histórica ao selecionar estado
 */
import Layout from "@/components/Layout";
import BrazilMap from "@/components/BrazilMap";
import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { Search, ArrowUpDown, Filter, X, TrendingDown, TrendingUp, TreePine } from "lucide-react";
import desmatamentoData from "@/data/desmatamento.json";

const CERRADO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/cerrado-landscape-KwYgs7SrYFjYGrh5EpFANX.webp";

const biomas = ["Todos", "Amazônia", "Cerrado", "Mata Atlântica", "Caatinga", "Pantanal", "Pampa"];

export default function Estados() {
  const [selectedBioma, setSelectedBioma] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "2024" | "acumulado">("2024");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Scroll para o detalhe quando selecionar estado
  useEffect(() => {
    if (selectedEstado && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedEstado]);

  const filteredEstados = useMemo(() => {
    let filtered = desmatamentoData.estados;
    if (selectedBioma !== "Todos") {
      filtered = filtered.filter((e) => e.bioma_principal.includes(selectedBioma));
    }
    if (searchTerm) {
      filtered = filtered.filter((e) =>
        e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.sigla.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    filtered = [...filtered].sort((a, b) => {
      let va: number, vb: number;
      if (sortBy === "nome") return sortDir === "asc" ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome);
      if (sortBy === "2024") { va = a.desmatamento_anual["2024"] || 0; vb = b.desmatamento_anual["2024"] || 0; }
      else { va = a.desmatamento_acumulado_km2; vb = b.desmatamento_acumulado_km2; }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return filtered;
  }, [selectedBioma, searchTerm, sortBy, sortDir]);

  // Dados agregados para gráfico de série temporal
  const serieNacional = useMemo(() => {
    const anos = ["2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"];
    return anos.map((ano) => {
      const total = desmatamentoData.estados.reduce((sum, e) => sum + (e.desmatamento_anual[ano as keyof typeof e.desmatamento_anual] || 0), 0);
      return { ano, total };
    });
  }, []);

  const estadoDetail = selectedEstado
    ? desmatamentoData.estados.find((e) => e.sigla === selectedEstado)
    : null;

  const estadoSerie = useMemo(() => {
    if (!estadoDetail) return [];
    return Object.entries(estadoDetail.desmatamento_anual)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, val]) => ({ ano, desmatamento: val }));
  }, [estadoDetail]);

  const estadoEvitado = useMemo(() => {
    if (!estadoDetail?.desmatamento_evitado) return [];
    return Object.entries(estadoDetail.desmatamento_evitado)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, val]: [string, any]) => ({
        ano,
        esperado: val.esperado,
        observado: val.observado,
        evitado: val.evitado,
      }));
  }, [estadoDetail]);

  // Estatísticas do estado selecionado
  const estadoStats = useMemo(() => {
    if (!estadoDetail) return null;
    const v24 = estadoDetail.desmatamento_anual["2024"] || 0;
    const v23 = estadoDetail.desmatamento_anual["2023"] || 0;
    const change = v23 > 0 ? ((v24 - v23) / v23 * 100) : 0;
    const totalEvitado = Object.values(estadoDetail.desmatamento_evitado || {})
      .reduce((s: number, v: any) => s + (v.evitado > 0 ? v.evitado : 0), 0);
    return { v24, change, totalEvitado };
  }, [estadoDetail]);

  const toggleSort = (col: "nome" | "2024" | "acumulado") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const handleSelectEstado = (sigla: string) => {
    setSelectedEstado(selectedEstado === sigla ? null : sigla);
  };

  return (
    <Layout>
      {/* Banner */}
      <section className="relative overflow-hidden" style={{ height: "280px" }}>
        <img src={CERRADO_IMG} alt="Cerrado" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6))" }} />
        <div className="relative container flex flex-col justify-end h-full pb-10">
          <p className="text-sm font-semibold tracking-widest uppercase mb-2" style={{ color: "#a8d5a2" }}>Visão Macro</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "#fff", fontFamily: "'Merriweather', serif" }}>
            Desmatamento por Estado
          </h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.8)", maxWidth: "600px" }}>
            Série histórica de 2008 a 2024 para todos os estados brasileiros, com cálculo de desmatamento evitado.
          </p>
        </div>
      </section>

      {/* Mapa Interativo + Gráfico Nacional lado a lado */}
      <section className="py-12">
        <div className="container">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Mapa do Brasil */}
            <BrazilMap
              estados={desmatamentoData.estados as any}
              onSelectEstado={handleSelectEstado}
              selectedEstado={selectedEstado}
            />

            {/* Gráfico nacional */}
            <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <h3 className="text-lg font-bold mb-1" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                Evolução Nacional do Desmatamento
              </h3>
              <p className="text-sm mb-4" style={{ color: "#7a7568" }}>
                Soma de todos os estados, 2008 a 2024
              </p>
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={serieNacional}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12, fill: "#7a7568" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#7a7568" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "13px" }}
                    formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="#2E7D32" strokeWidth={2.5} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Detalhe do estado selecionado — aparece entre mapa e tabela */}
      {estadoDetail && estadoStats && (
        <section className="py-8" ref={detailRef} style={{ background: "#f9f8f5" }}>
          <div className="container">
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              {/* Header do detalhe */}
              <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3" style={{ borderBottom: "1px solid #f0ede7" }}>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                    {estadoDetail.nome} ({estadoDetail.sigla})
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "#7a7568" }}>
                    Bioma: {estadoDetail.bioma_principal} — Acumulado: {estadoDetail.desmatamento_acumulado_km2.toLocaleString("pt-BR")} km²
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEstado(null)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "#7a7568", background: "#f4f3ee" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Indicadores resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-5" style={{ borderBottom: "1px solid #f0ede7" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(191,54,12,0.08)" }}>
                    <TreePine size={18} style={{ color: "#BF360C" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#2c2417" }}>{estadoStats.v24.toLocaleString("pt-BR")} km²</p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Desmatamento 2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: estadoStats.change < 0 ? "rgba(46,125,50,0.08)" : "rgba(191,54,12,0.08)" }}>
                    {estadoStats.change < 0 ? <TrendingDown size={18} style={{ color: "#2E7D32" }} /> : <TrendingUp size={18} style={{ color: "#BF360C" }} />}
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: estadoStats.change < 0 ? "#2E7D32" : "#BF360C" }}>
                      {estadoStats.change < 0 ? "↓" : "↑"} {Math.abs(estadoStats.change).toFixed(1)}%
                    </p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Variação 2023→2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.08)" }}>
                    <TreePine size={18} style={{ color: "#2E7D32" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#2E7D32" }}>{Math.round(estadoStats.totalEvitado).toLocaleString("pt-BR")} km²</p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Total evitado (acumulado)</p>
                  </div>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Série Histórica de Desmatamento (km²)</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={estadoSerie}>
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
                  {estadoEvitado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={estadoEvitado}>
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
                        <Legend formatter={(value) => value === "esperado" ? "Esperado" : value === "observado" ? "Observado" : "Evitado"} />
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

      {/* Filtros e tabela */}
      <section className="py-8">
        <div className="container">
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9a958e" }} />
              <input
                type="text"
                placeholder="Buscar estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
                style={{ background: "#fff", border: "1px solid #e8e5dd", color: "#2c2417", outline: "none" }}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={16} style={{ color: "#9a958e" }} />
              {biomas.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBioma(b)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: selectedBioma === b ? "#2E7D32" : "#fff",
                    color: selectedBioma === b ? "#fff" : "#5a5448",
                    border: `1px solid ${selectedBioma === b ? "#2E7D32" : "#e8e5dd"}`,
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                    <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" style={{ color: "#5a5448" }} onClick={() => toggleSort("nome")}>
                      <span className="inline-flex items-center gap-1">Estado <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>UF</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Bioma</th>
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none" style={{ color: "#5a5448" }} onClick={() => toggleSort("2024")}>
                      <span className="inline-flex items-center gap-1 justify-end">2024 (km²) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Var. vs 2023</th>
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none" style={{ color: "#5a5448" }} onClick={() => toggleSort("acumulado")}>
                      <span className="inline-flex items-center gap-1 justify-end">Acumulado (km²) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstados.map((estado) => {
                    const v24 = estado.desmatamento_anual["2024"] || 0;
                    const v23 = estado.desmatamento_anual["2023"] || 0;
                    const change = v23 > 0 ? ((v24 - v23) / v23 * 100).toFixed(1) : "0.0";
                    const isDown = Number(change) < 0;
                    const isActive = selectedEstado === estado.sigla;
                    return (
                      <tr
                        key={estado.sigla}
                        className="transition-colors"
                        style={{
                          borderBottom: "1px solid #f0ede7",
                          background: isActive ? "rgba(46,125,50,0.04)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#fafaf5"; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: "#2c2417" }}>{estado.nome}</td>
                        <td className="px-4 py-3" style={{ color: "#7a7568" }}>{estado.sigla}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(46,125,50,0.08)", color: "#2E7D32" }}>
                            {estado.bioma_principal}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif" }}>
                          {v24.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-medium" style={{ color: isDown ? "#2E7D32" : "#BF360C" }}>
                          {isDown ? "↓" : "↑"} {change}%
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#7a7568" }}>
                          {estado.desmatamento_acumulado_km2.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSelectEstado(estado.sigla)}
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
