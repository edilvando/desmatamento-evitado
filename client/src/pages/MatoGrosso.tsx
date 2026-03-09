/*
 * MatoGrosso.tsx — Visão detalhada por municípios do MT
 * Ranking, gráficos comparativos, filtros por bioma
 */
import Layout from "@/components/Layout";
import { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Search, ArrowUpDown, TreePine, Shield, Leaf } from "lucide-react";
import desmatamentoData from "@/data/desmatamento.json";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/hero-amazonia-7RADVFFLPdKKonoZx4vaUp.webp";

export default function MatoGrosso() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "2024" | "florestal">("2024");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("2024");

  const municipios = desmatamentoData.municipios_mt;

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

  const toggleSort = (col: "nome" | "2024" | "florestal") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
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

      {/* Ranking */}
      <section className="py-8">
        <div className="container">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
              Top 10 Municípios — Desmatamento
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "#7a7568" }}>Ano:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: "#fff", border: "1px solid #e8e5dd", color: "#2c2417" }}
              >
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <ResponsiveContainer width="100%" height={350}>
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
      </section>

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
                    return (
                      <tr key={m.nome} style={{ borderBottom: "1px solid #f0ede7" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf5")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                            onClick={() => setSelectedMunicipio(selectedMunicipio === m.nome ? null : m.nome)}
                            className="text-xs px-3 py-1 rounded-md font-medium transition-all"
                            style={{
                              background: selectedMunicipio === m.nome ? "#2E7D32" : "rgba(46,125,50,0.08)",
                              color: selectedMunicipio === m.nome ? "#fff" : "#2E7D32",
                            }}
                          >
                            {selectedMunicipio === m.nome ? "Fechar" : "Ver"}
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

      {/* Detalhe do município */}
      {detail && (
        <section className="py-8">
          <div className="container">
            <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                {detail.nome}
              </h3>
              <p className="text-sm mb-6" style={{ color: "#7a7568" }}>
                {detail.bioma} · Área: {detail.area_km2.toLocaleString("pt-BR")} km² · Cobertura florestal: {detail.cobertura_florestal_pct}% · Áreas protegidas: {detail.area_protegida_km2.toLocaleString("pt-BR")} km²
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Série Histórica</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={detailSerie}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                      <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                      />
                      <Bar dataKey="desmatamento" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Desmatamento Evitado</h4>
                  {detailEvitado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
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
                        <Line type="monotone" dataKey="esperado" stroke="#C8A951" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="observado" stroke="#BF360C" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="evitado" stroke="#2E7D32" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm" style={{ color: "#9a958e" }}>Dados insuficientes.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
