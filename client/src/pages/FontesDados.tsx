/*
 * FontesDados.tsx — Aba robusta de documentação, fontes de dados e publicações
 */
import Layout from "@/components/Layout";
import { ExternalLink, Database, BookOpen, FileText, Globe } from "lucide-react";
import desmatamentoData from "@/data/desmatamento.json";

const RECOVERY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/forest-recovery-YSdwfGToooEWBghRTVzxxQ.webp";

export default function FontesDados() {
  const { fontes_dados, publicacoes } = desmatamentoData.metadata;

  return (
    <Layout>
      {/* Banner */}
      <section className="relative overflow-hidden" style={{ height: "280px" }}>
        <img src={RECOVERY_IMG} alt="Recuperação florestal" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.65))" }} />
        <div className="relative container flex flex-col justify-end h-full pb-10">
          <p className="text-sm font-semibold tracking-widest uppercase mb-2" style={{ color: "#a8d5a2" }}>Transparência e Rigor</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "#fff", fontFamily: "'Merriweather', serif" }}>
            Fontes de Dados e Publicações
          </h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.8)", maxWidth: "600px" }}>
            Todas as bases de dados, referências científicas e publicações utilizadas neste sistema.
          </p>
        </div>
      </section>

      {/* Fontes de dados */}
      <section className="py-16">
        <div className="container max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
              <Database size={20} style={{ color: "#2E7D32" }} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
              Bases de Dados
            </h2>
          </div>
          <p className="mb-8" style={{ fontFamily: "'Source Serif 4', serif", color: "#5a5448", lineHeight: 1.85 }}>
            Todos os dados utilizados neste sistema são de domínio público e podem ser acessados gratuitamente. As fontes incluem instituições oficiais brasileiras (INPE, IBGE, ICMBio, DNIT, ANM) e a base internacional Global Forest Change da Universidade de Maryland. Abaixo estão listadas as principais bases com seus respectivos links de acesso.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {fontes_dados.map((fonte, i) => (
              <a
                key={i}
                href={fonte.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl p-5 transition-all hover:shadow-md no-underline group"
                style={{ background: "#fff", border: "1px solid #e8e5dd" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe size={16} style={{ color: "#2E7D32" }} />
                    <h3 className="text-sm font-bold" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif" }}>
                      {fonte.nome}
                    </h3>
                  </div>
                  <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#2E7D32" }} />
                </div>
                <p className="text-sm mb-2" style={{ color: "#5a5448", lineHeight: 1.6 }}>
                  {fonte.descricao}
                </p>
                <p className="text-xs truncate" style={{ color: "#9a958e" }}>
                  {fonte.url}
                </p>
              </a>
            ))}
          </div>

          {/* Tabela resumo das fontes por componente ACEU */}
          <h3 className="text-xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Mapeamento de Dados por Componente ACEU
          </h3>
          <div className="rounded-xl overflow-hidden mb-12" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Componente</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Dado Necessário</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Fonte</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Formato</th>
                  <th className="text-center px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Acesso</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { comp: "Cobertura Florestal", dado: "Extensão e perda florestal", fonte: "Global Forest Change (UMD)", formato: "GeoTIFF", acesso: "Público" },
                  { comp: "Área de Impacto", dado: "Limites municipais", fonte: "IBGE", formato: "Shapefile", acesso: "Público" },
                  { comp: "A — Acessibilidade", dado: "Malha rodoviária", fonte: "DNIT", formato: "Shapefile", acesso: "Público" },
                  { comp: "C — Cultivabilidade", dado: "Aptidão agrícola", fonte: "IBGE / Embrapa Solos", formato: "Shapefile", acesso: "Público" },
                  { comp: "E — Extraibilidade", dado: "Recursos minerais e florestais", fonte: "ANM / SFB", formato: "Shapefile", acesso: "Público" },
                  { comp: "U — Desprotegido", dado: "UCs e Terras Indígenas", fonte: "ICMBio / MMA", formato: "Shapefile", acesso: "Público" },
                  { comp: "Validação", dado: "Cobertura e uso da terra", fonte: "MapBiomas", formato: "GeoTIFF", acesso: "Público" },
                  { comp: "Desmatamento Observado", dado: "Taxas anuais", fonte: "PRODES / INPE", formato: "Shapefile / GeoTIFF", acesso: "Público" },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0ede7" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "#2c2417" }}>{row.comp}</td>
                    <td className="px-4 py-3" style={{ color: "#5a5448" }}>{row.dado}</td>
                    <td className="px-4 py-3" style={{ color: "#5a5448" }}>{row.fonte}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#f4f3ee", color: "#7a7568" }}>{row.formato}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(46,125,50,0.1)", color: "#2E7D32" }}>
                        {row.acesso}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Publicações */}
      <section className="py-16" style={{ background: "#f4f3ee" }}>
        <div className="container max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
              <BookOpen size={20} style={{ color: "#2E7D32" }} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
              Publicações Científicas
            </h2>
          </div>
          <p className="mb-8" style={{ fontFamily: "'Source Serif 4', serif", color: "#5a5448", lineHeight: 1.85 }}>
            As publicações abaixo fundamentam a metodologia utilizada neste sistema. Incluem o guia metodológico original da Ecometrica, os boletins de pesquisa da Embrapa com a aplicação no Brasil, e o artigo seminal de Hansen et al. sobre mudanças na cobertura florestal global.
          </p>

          <div className="space-y-4">
            {publicacoes.map((pub, i) => (
              <a
                key={i}
                href={pub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl p-6 transition-all hover:shadow-md no-underline group"
                style={{ background: "#fff", border: "1px solid #e8e5dd" }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: "rgba(46,125,50,0.08)" }}>
                    <FileText size={18} style={{ color: "#2E7D32" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold mb-1" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif", lineHeight: 1.4 }}>
                        {pub.titulo}
                      </h3>
                      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" style={{ color: "#2E7D32" }} />
                    </div>
                    <p className="text-sm mb-2" style={{ color: "#7a7568" }}>
                      {pub.autores}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(46,125,50,0.08)", color: "#2E7D32" }}>
                        {pub.ano}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f4f3ee", color: "#7a7568" }}>
                        {pub.tipo}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f4f3ee", color: "#7a7568" }}>
                        {pub.instituicao}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Links úteis */}
      <section className="py-16">
        <div className="container max-w-5xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
              <Globe size={20} style={{ color: "#2E7D32" }} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
              Plataformas e Ferramentas Relacionadas
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { nome: "TerraBrasilis — INPE", url: "https://terrabrasilis.dpi.inpe.br/", desc: "Plataforma oficial do INPE para acesso e visualização dos dados do PRODES, DETER e outros programas de monitoramento." },
              { nome: "MapBiomas", url: "https://brasil.mapbiomas.org/", desc: "Iniciativa multi-institucional que gera mapas anuais de cobertura e uso da terra no Brasil desde 1985." },
              { nome: "Global Forest Watch", url: "https://www.globalforestwatch.org/", desc: "Plataforma global de monitoramento florestal em tempo quase real, com dados de perda e ganho de cobertura." },
              { nome: "Google Earth Engine", url: "https://earthengine.google.com/", desc: "Plataforma de análise geoespacial em nuvem com acesso a petabytes de dados de satélite, incluindo Global Forest Change." },
              { nome: "ZARC Plantio Certo", url: "https://www.embrapa.br/agrossilvipastoril/zarc-plantio-certo", desc: "Sistema web da Embrapa para consulta ao Zoneamento Agrícola de Risco Climático, referência de sistema geoespacial." },
              { nome: "Ecometrica", url: "https://ecometrica.com/", desc: "Empresa que desenvolveu a metodologia Hectares Indicator e a plataforma original de visualização dos dados." },
            ].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl p-5 transition-all hover:shadow-md no-underline group"
                style={{ background: "#fff", border: "1px solid #e8e5dd" }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold" style={{ color: "#2c2417" }}>{link.nome}</h3>
                  <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#2E7D32" }} />
                </div>
                <p className="text-sm" style={{ color: "#5a5448", lineHeight: 1.6 }}>{link.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
