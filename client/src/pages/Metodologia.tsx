/*
 * Metodologia.tsx — Documentação da metodologia ACEU / Hectares Indicator
 */
import Layout from "@/components/Layout";

const CONTRAST_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/deforestation-contrast-fzQ9XAFdzhoR6bApfFgYDX.webp";

const fatoresACEU = [
  {
    letra: "A",
    nome: "Acessibilidade",
    descricao: "Mede a proximidade de estradas e infraestrutura de transporte. Áreas mais acessíveis têm maior risco de desmatamento, pois facilitam a exploração econômica e a conversão da terra. Utilizam-se buffers de distância das rodovias (até 50 km) para classificar o risco.",
    fonte: "DNIT — Malha rodoviária federal e estadual",
    cor: "#BF360C",
  },
  {
    letra: "C",
    nome: "Cultivabilidade",
    descricao: "Avalia a aptidão agrícola do solo. Terras com boa aptidão para cultivo agrícola ou pecuária apresentam maior risco, pois são mais atrativas para a conversão. A classificação varia entre boa, média e ruim, conforme dados pedológicos e climáticos.",
    fonte: "IBGE / Embrapa Solos — Aptidão agrícola das terras",
    cor: "#C8A951",
  },
  {
    letra: "E",
    nome: "Extraibilidade",
    descricao: "Considera a presença de recursos extraíveis, tanto minerais quanto florestais. Áreas com concessões minerárias ou madeireiras ativas têm maior pressão de desmatamento. Inclui dados da Agência Nacional de Mineração e do Serviço Florestal Brasileiro.",
    fonte: "SIGMINE (ANM) / SFB — Concessões minerárias e florestais",
    cor: "#8D6E63",
  },
  {
    letra: "U",
    nome: "Áreas Desprotegidas",
    descricao: "Avalia a ausência de mecanismos de proteção da cobertura florestal. Áreas dentro de Unidades de Conservação, Terras Indígenas ou outras categorias de proteção têm menor risco. Este fator é subtraído dos demais, reduzindo o risco total.",
    fonte: "ICMBio / MMA — Unidades de Conservação e Terras Indígenas",
    cor: "#2E7D32",
  },
];

const classesRisco = [
  { categoria: 1, risco: "Muito Alto", descricao: "Área muito acessível e atrativa para conversão, sem proteção, distante de áreas regulamentadas.", perda: "90%" },
  { categoria: 2, risco: "Alto", descricao: "Área acessível, segunda opção para extração ou conversão agrícola/pecuária, proteção limitada.", perda: "70%" },
  { categoria: 3, risco: "Médio", descricao: "Algum acesso, moderadamente atrativa para extração ou conversão, proteção parcial.", perda: "50%" },
  { categoria: 4, risco: "Baixo", descricao: "Dificuldade de acesso, não atrativa para extração e cultivo, razoavelmente bem protegida.", perda: "30%" },
  { categoria: 5, risco: "Muito Baixo", descricao: "Muito difícil acesso, pouco potencial para extração e cultivo, muito bem protegida.", perda: "10%" },
];

export default function Metodologia() {
  return (
    <Layout>
      {/* Banner */}
      <section className="relative overflow-hidden" style={{ height: "280px" }}>
        <img src={CONTRAST_IMG} alt="Desmatamento" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.7))" }} />
        <div className="relative container flex flex-col justify-end h-full pb-10">
          <p className="text-sm font-semibold tracking-widest uppercase mb-2" style={{ color: "#a8d5a2" }}>Fundamentação Científica</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "#fff", fontFamily: "'Merriweather', serif" }}>
            Metodologia ACEU
          </h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.8)", maxWidth: "600px" }}>
            Hectares Indicator — como estimamos o risco de desmatamento e o desmatamento evitado.
          </p>
        </div>
      </section>

      {/* Visão geral */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Visão Geral
          </h2>
          <div style={{ fontFamily: "'Source Serif 4', serif", color: "#5a5448", lineHeight: 1.85, fontSize: "16px" }}>
            <p className="mb-4">
              A metodologia Hectares Indicator foi desenvolvida por Richard Tipper e Arnaud Morel na Ecometrica em 2016, como parte de um esforço para quantificar o impacto de programas de conservação florestal. Ela estima a perda florestal que ocorreria na ausência de intervenções, permitindo calcular o desmatamento que foi efetivamente evitado por ações de conservação, fiscalização ou políticas públicas.
            </p>
            <p className="mb-4">
              No Brasil, a metodologia foi aplicada pela Embrapa no contexto do Projeto Rural Sustentável (PRS), uma cooperação entre o Banco Interamericano de Desenvolvimento (BID), o Ministério da Agricultura, Pecuária e Abastecimento (MAPA) e o Departamento de Meio Ambiente, Alimentação e Assuntos Rurais do governo britânico (DEFRA). Os trabalhos foram conduzidos pela Embrapa Agrossilvipastoril (CPAMT) e pela Embrapa Agricultura Digital (CNPTIA).
            </p>
            <p className="mb-6">
              O modelo central é o ACEU, um acrônimo para os quatro fatores que determinam o risco de desmatamento de uma área florestal: Acessibilidade, Cultivabilidade, Extraibilidade e áreas desprotegidas (Unprotected). A combinação desses fatores gera um mapa de risco que é comparado com a perda florestal real para estimar o desmatamento evitado.
            </p>
          </div>

          {/* Equação */}
          <div className="rounded-xl p-6 mb-10" style={{ background: "rgba(46,125,50,0.04)", border: "1px solid rgba(46,125,50,0.15)" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "#2E7D32" }}>Equação do Risco ACEU</p>
            <div className="text-center py-4">
              <p className="text-xl font-semibold" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif" }}>
                Risco = (R<sub>A</sub> + R<sub>C</sub> + R<sub>E</sub>) − R<sub>U</sub>
              </p>
            </div>
            <p className="text-sm" style={{ color: "#7a7568", lineHeight: 1.7 }}>
              Onde R<sub>A</sub> é o risco pela acessibilidade, R<sub>C</sub> pela aptidão agrícola, R<sub>E</sub> pela presença de recursos extraíveis, e R<sub>U</sub> é a redução de risco pelas áreas protegidas. O resultado é classificado em 5 categorias usando a escala Likert com quintis.
            </p>
          </div>

          {/* Fatores ACEU */}
          <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Os Quatro Fatores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {fatoresACEU.map((f) => (
              <div key={f.letra} className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: f.cor }}>
                    {f.letra}
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif" }}>
                    {f.nome}
                  </h3>
                </div>
                <p className="text-sm mb-3" style={{ color: "#5a5448", lineHeight: 1.7 }}>
                  {f.descricao}
                </p>
                <p className="text-xs" style={{ color: "#9a958e" }}>
                  Fonte: {f.fonte}
                </p>
              </div>
            ))}
          </div>

          {/* Classes de risco */}
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Classes de Risco
          </h2>
          <p className="mb-6" style={{ fontFamily: "'Source Serif 4', serif", color: "#5a5448", lineHeight: 1.85 }}>
            O mapa de risco resultante da combinação dos fatores ACEU é classificado em cinco categorias usando quintis (escala Likert adaptada). Cada categoria representa 20% dos dados e possui uma probabilidade associada de perda florestal nos próximos 20 anos, conforme proposto por Tipper e Bournaze (2018).
          </p>
          <div className="rounded-xl overflow-hidden mb-10" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Categoria</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Risco</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Descrição</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Perda Esperada (20 anos)</th>
                </tr>
              </thead>
              <tbody>
                {classesRisco.map((c) => (
                  <tr key={c.categoria} style={{ borderBottom: "1px solid #f0ede7" }}>
                    <td className="px-4 py-3 font-bold" style={{ color: "#2c2417" }}>{c.categoria}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                        background: c.categoria <= 2 ? "rgba(191,54,12,0.1)" : c.categoria === 3 ? "rgba(200,169,81,0.15)" : "rgba(46,125,50,0.1)",
                        color: c.categoria <= 2 ? "#BF360C" : c.categoria === 3 ? "#8D6E63" : "#2E7D32",
                      }}>
                        {c.risco}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5448", lineHeight: 1.6 }}>{c.descricao}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: "#2c2417" }}>{c.perda}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cálculo do desmatamento evitado */}
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Cálculo do Desmatamento Evitado
          </h2>
          <div style={{ fontFamily: "'Source Serif 4', serif", color: "#5a5448", lineHeight: 1.85, fontSize: "16px" }}>
            <p className="mb-4">
              A perda florestal esperada é calculada multiplicando a área de cada classe de risco pelo seu fator de probabilidade, dividido por 20 (para projeção anual). O desmatamento evitado é então obtido pela diferença entre a perda esperada e a perda observada (dados do PRODES/INPE ou Global Forest Change).
            </p>
          </div>
          <div className="rounded-xl p-6 mb-6" style={{ background: "rgba(46,125,50,0.04)", border: "1px solid rgba(46,125,50,0.15)" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "#2E7D32" }}>Equações</p>
            <div className="space-y-3 text-center py-2">
              <p className="text-base" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif" }}>
                Perda Esperada = Σ (Área<sub>classe</sub> × Probabilidade<sub>classe</sub>) / 20
              </p>
              <p className="text-base font-semibold" style={{ color: "#2E7D32", fontFamily: "'Source Sans 3', sans-serif" }}>
                Desmatamento Evitado = Perda Esperada − Perda Observada
              </p>
            </div>
          </div>
          <div style={{ fontFamily: "'Source Serif 4', serif", color: "#5a5448", lineHeight: 1.85, fontSize: "16px" }}>
            <p className="mb-4">
              Quando o resultado é positivo, indica que as ações de conservação foram efetivas em reduzir o desmatamento abaixo do nível esperado. Quando negativo, significa que o desmatamento real superou as expectativas do modelo, sugerindo que as pressões sobre a floresta foram maiores do que os fatores de risco indicavam.
            </p>
            <p>
              Neste sistema, utilizamos uma abordagem simplificada para o protótipo: a perda esperada é estimada pela média móvel dos três anos anteriores, permitindo capturar a tendência recente de desmatamento como proxy do risco. Essa abordagem, embora simplificada em relação ao modelo ACEU completo com dados espaciais, permite demonstrar o conceito e a lógica do cálculo de forma interativa.
            </p>
          </div>
        </div>
      </section>

      {/* Referências */}
      <section className="py-12" style={{ background: "#f4f3ee" }}>
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Referências Bibliográficas
          </h2>
          <div className="space-y-4">
            {[
              "TIPPER, R.; MOREL, A. Hectares Indicator Methods and Guidance Version 2.0. Ecometrica, 2016.",
              "VENDRUSCULO, L. G. et al. Aplicação da metodologia de Hectare Indicator para estimativa de desmatamento evitado no bioma Amazônia. Boletim de Pesquisa e Desenvolvimento 46. Embrapa Informática Agropecuária, 2019.",
              "COSTA, C. A. da et al. Definição de linha base para o índice de desmatamento evitado no estado do Mato Grosso no Bioma Amazônico. Embrapa Agrossilvipastoril, 2018.",
              "HANSEN, M. C. et al. High-Resolution Global Maps of 21st-Century Forest Cover Change. Science, v. 342, n. 6160, p. 850-853, 2013.",
              "LIKERT, R. A technique for the measurement of attitudes. Archives of Psychology, v. 22, n. 140, p. 1-55, 1932.",
            ].map((ref, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-xs font-bold mt-1 shrink-0" style={{ color: "#2E7D32" }}>[{i + 1}]</span>
                <p className="text-sm" style={{ color: "#5a5448", lineHeight: 1.7, fontFamily: "'Source Serif 4', serif" }}>{ref}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
