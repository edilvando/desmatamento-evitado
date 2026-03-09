/*
 * CodigoProtegido.tsx — Área protegida com senha para código documentado
 * Senha: 123Troc@r (verificação no frontend)
 */
import Layout from "@/components/Layout";
import { useState } from "react";
import { Lock, Unlock, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const SENHA_CORRETA = "123Troc@r";

interface CodeSection {
  titulo: string;
  arquivo: string;
  linguagem: string;
  descricao: string;
  codigo: string;
}

const secoesCodigo: CodeSection[] = [
  {
    titulo: "Geração dos Dados",
    arquivo: "generate_data.py",
    linguagem: "Python",
    descricao: "Script Python que gera os dados JSON utilizados pelo sistema. Contém os dados de desmatamento por estado (2008-2024), municípios do Mato Grosso (2016-2024), cálculo do desmatamento evitado, metadados das fontes de dados e publicações científicas. Os dados são baseados em fontes públicas do PRODES/INPE, MapBiomas e Global Forest Change.",
    codigo: `#!/usr/bin/env python3
"""
generate_data.py — Geração dos dados para o Sistema de Desmatamento Evitado
Autor: Edilvando Pereira Eufrazio
Embrapa Agrossilvipastoril (CPAMT)

Este script gera o arquivo JSON com todos os dados utilizados pelo sistema web.
Os dados são baseados em fontes públicas:
- PRODES/INPE (TerraBrasilis) — desmatamento na Amazônia Legal
- MapBiomas — cobertura e uso da terra
- Global Forest Change (Hansen et al., 2013) — perda florestal global
- IBGE — limites municipais e estaduais

Metodologia de Desmatamento Evitado:
- Baseada no Hectares Indicator (Tipper & Morel, 2016)
- Modelo ACEU: Acessibilidade, Cultivabilidade, Extraibilidade, Unprotected
- Perda esperada estimada pela média móvel de 3 anos (proxy simplificada)
- Desmatamento evitado = Perda esperada - Perda observada
"""

import json
import os

def calcular_desmatamento_evitado(serie_anual: dict) -> dict:
    """
    Calcula o desmatamento evitado usando média móvel de 3 anos
    como proxy da perda esperada.
    
    Args:
        serie_anual: dicionário {ano: valor_km2}
    
    Returns:
        dicionário {ano: {esperado, observado, evitado}}
    """
    anos = sorted(serie_anual.keys())
    resultado = {}
    
    for i, ano in enumerate(anos):
        if i >= 3:  # precisa de 3 anos anteriores
            media_3anos = sum(
                serie_anual[anos[j]] for j in range(i-3, i)
            ) / 3
            observado = serie_anual[ano]
            evitado = round(media_3anos - observado, 1)
            resultado[ano] = {
                "esperado": round(media_3anos, 1),
                "observado": observado,
                "evitado": evitado
            }
    
    return resultado

def gerar_dados_estados() -> list:
    """
    Gera dados de desmatamento para todos os 27 estados brasileiros.
    Valores baseados em dados públicos do PRODES/INPE e MapBiomas.
    """
    estados = [
        # ... dados de cada estado com série histórica
        # Exemplo:
        {
            "nome": "Pará",
            "sigla": "PA",
            "bioma_principal": "Amazônia",
            "desmatamento_acumulado_km2": 268742,
            "desmatamento_anual": {
                "2008": 5180, "2009": 4281, "2010": 3770,
                # ... demais anos
            }
        },
        # ... demais estados
    ]
    
    # Calcula desmatamento evitado para cada estado
    for estado in estados:
        estado["desmatamento_evitado"] = calcular_desmatamento_evitado(
            estado["desmatamento_anual"]
        )
    
    return estados

def gerar_dados_municipios_mt() -> list:
    """
    Gera dados detalhados para municípios do Mato Grosso.
    Inclui cobertura florestal, áreas protegidas e série temporal.
    """
    municipios = [
        # ... dados de cada município
        # Exemplo:
        {
            "nome": "São Félix do Araguaia",
            "bioma": "Amazônia/Cerrado",
            "area_km2": 16832,
            "cobertura_florestal_pct": 42.3,
            "area_protegida_km2": 3200,
            "desmatamento_anual": {
                "2016": 185, "2017": 210, "2018": 195,
                # ... demais anos
            }
        },
        # ... demais municípios
    ]
    
    for mun in municipios:
        mun["desmatamento_evitado"] = calcular_desmatamento_evitado(
            mun["desmatamento_anual"]
        )
    
    return municipios

def gerar_metadados() -> dict:
    """Gera metadados com fontes de dados e publicações."""
    return {
        "fontes_dados": [
            {
                "nome": "PRODES — INPE",
                "descricao": "Monitoramento do desmatamento na Amazônia Legal por satélite",
                "url": "http://terrabrasilis.dpi.inpe.br/"
            },
            # ... demais fontes
        ],
        "publicacoes": [
            {
                "titulo": "Hectares Indicator Methods and Guidance V2.0",
                "autores": "Tipper, R.; Morel, A.",
                "ano": 2016,
                "tipo": "Guia Metodológico",
                "instituicao": "Ecometrica",
                "url": "https://ecometrica.com/"
            },
            # ... demais publicações
        ]
    }

if __name__ == "__main__":
    dados = {
        "estados": gerar_dados_estados(),
        "municipios_mt": gerar_dados_municipios_mt(),
        "metadata": gerar_metadados()
    }
    
    output_path = "client/src/data/desmatamento.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    
    print(f"Dados gerados: {output_path}")
    print(f"  Estados: {len(dados['estados'])}")
    print(f"  Municípios MT: {len(dados['municipios_mt'])}")`,
  },
  {
    titulo: "Layout Principal",
    arquivo: "client/src/components/Layout.tsx",
    linguagem: "TypeScript/React",
    descricao: "Componente de layout compartilhado por todas as páginas. Inclui o header institucional com logo da Embrapa e navegação responsiva, e o footer com créditos e fontes. Design baseado na estética 'Terra Viva' — editorial ambiental.",
    codigo: `// Layout.tsx — Componente de layout principal
// Design: "Terra Viva" — Estética Editorial Ambiental
// Paleta: verde-musgo (#2E7D32), terra-queimada (#8D6E63),
//         dourado-cerrado (#C8A951), off-white (#FAFAF5)
// Tipografia: Merriweather (títulos), Source Sans 3 (corpo)

import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const EMBRAPA_LOGO = "https://...embrapa-logo.png";

const navItems = [
  { href: "/", label: "Panorama" },
  { href: "/estados", label: "Estados" },
  { href: "/mato-grosso", label: "Mato Grosso" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/fontes", label: "Fontes de Dados" },
  { href: "/codigo", label: "Código" },
];

export default function Layout({ children }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 ...">
        {/* Logo + Nav desktop + Menu mobile */}
      </header>
      <main className="flex-1">{children}</main>
      <footer>
        {/* Créditos: Edilvando Pereira Eufrazio */}
        {/* Fontes: PRODES/INPE, MapBiomas, GFC, IBGE */}
      </footer>
    </div>
  );
}`,
  },
  {
    titulo: "Página de Estados",
    arquivo: "client/src/pages/Estados.tsx",
    linguagem: "TypeScript/React",
    descricao: "Visão macro do desmatamento por estado. Inclui gráfico de série temporal nacional (AreaChart), tabela interativa com filtros por bioma e busca, e painel de detalhes com gráficos de barras e linhas para o estado selecionado. Utiliza Recharts para visualizações.",
    codigo: `// Estados.tsx — Visão macro por estados do Brasil
// Funcionalidades:
// - Gráfico de evolução nacional (AreaChart)
// - Filtro por bioma (Amazônia, Cerrado, Mata Atlântica, etc.)
// - Busca por nome/sigla
// - Tabela ordenável por nome, desmatamento 2024, acumulado
// - Painel de detalhes com série histórica e desmatamento evitado

import { BarChart, LineChart, AreaChart } from "recharts";
import desmatamentoData from "@/data/desmatamento.json";

// Cálculo da série nacional agregada
const serieNacional = anos.map((ano) => ({
  ano,
  total: estados.reduce((sum, e) => sum + e.desmatamento_anual[ano], 0)
}));

// Detalhe do estado: gráfico de barras + linhas esperado/observado/evitado
// Desmatamento evitado = Perda esperada - Perda observada
// Quando positivo → conservação efetiva
// Quando negativo → pressão maior que o esperado`,
  },
  {
    titulo: "Página de Mato Grosso",
    arquivo: "client/src/pages/MatoGrosso.tsx",
    linguagem: "TypeScript/React",
    descricao: "Análise municipal detalhada do Mato Grosso. Inclui indicadores resumo (desmatamento total, cobertura florestal média, áreas protegidas), ranking dos top 10 municípios com gráfico horizontal, tabela completa com barras de progresso para cobertura florestal, e painel de detalhes por município.",
    codigo: `// MatoGrosso.tsx — Visão detalhada por municípios do MT
// 26 municípios com dados de:
// - Área total (km²)
// - Cobertura florestal (%)
// - Áreas protegidas (km²)
// - Série de desmatamento (2016-2024)
// - Desmatamento evitado (esperado vs observado)

// Ranking horizontal com cores por gravidade:
// Top 3: vermelho-terra (#BF360C)
// 4-6: dourado-cerrado (#C8A951)
// 7-10: verde-musgo (#2E7D32)

// Seletor de ano permite comparar diferentes períodos`,
  },
  {
    titulo: "Metodologia ACEU",
    arquivo: "client/src/pages/Metodologia.tsx",
    linguagem: "TypeScript/React",
    descricao: "Documentação completa da metodologia Hectares Indicator. Explica os quatro fatores ACEU (Acessibilidade, Cultivabilidade, Extraibilidade, Unprotected), as cinco classes de risco com probabilidades de perda, e as equações de cálculo do desmatamento evitado. Inclui referências bibliográficas.",
    codigo: `// Metodologia.tsx — Documentação científica
// Equação do Risco: R = (R_A + R_C + R_E) - R_U
// 
// Classes de Risco (Likert/Quintis):
// 1 - Muito Alto: 90% perda em 20 anos
// 2 - Alto: 70%
// 3 - Médio: 50%
// 4 - Baixo: 30%
// 5 - Muito Baixo: 10%
//
// Perda Esperada = Σ(Área_classe × Prob_classe) / 20
// Desmatamento Evitado = Perda Esperada - Perda Observada
//
// Referências:
// [1] Tipper & Morel, 2016 — Hectares Indicator V2.0
// [2] Vendrusculo et al., 2019 — Boletim 46 Embrapa
// [3] Hansen et al., 2013 — Global Forest Change`,
  },
  {
    titulo: "Estrutura de Dados JSON",
    arquivo: "client/src/data/desmatamento.json",
    linguagem: "JSON",
    descricao: "Estrutura do arquivo de dados principal. Contém três seções: 'estados' (27 UFs com série 2008-2024), 'municipios_mt' (26 municípios com dados detalhados), e 'metadata' (fontes de dados e publicações com URLs).",
    codigo: `{
  "estados": [
    {
      "nome": "Pará",
      "sigla": "PA",
      "bioma_principal": "Amazônia",
      "desmatamento_acumulado_km2": 268742,
      "desmatamento_anual": {
        "2008": 5180,
        "2009": 4281,
        ...
        "2024": 4152
      },
      "desmatamento_evitado": {
        "2011": {
          "esperado": 4410.3,
          "observado": 3008,
          "evitado": 1402.3
        },
        ...
      }
    },
    ...
  ],
  "municipios_mt": [
    {
      "nome": "São Félix do Araguaia",
      "bioma": "Amazônia/Cerrado",
      "area_km2": 16832,
      "cobertura_florestal_pct": 42.3,
      "area_protegida_km2": 3200,
      "desmatamento_anual": { ... },
      "desmatamento_evitado": { ... }
    },
    ...
  ],
  "metadata": {
    "fontes_dados": [
      {
        "nome": "PRODES — INPE",
        "descricao": "Monitoramento do desmatamento...",
        "url": "http://terrabrasilis.dpi.inpe.br/"
      },
      ...
    ],
    "publicacoes": [
      {
        "titulo": "Hectares Indicator Methods...",
        "autores": "Tipper, R.; Morel, A.",
        "ano": 2016,
        "tipo": "Guia Metodológico",
        "instituicao": "Ecometrica",
        "url": "https://ecometrica.com/"
      },
      ...
    ]
  }
}`,
  },
];

function CodeBlock({ code, linguagem }: { code: string; linguagem: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ background: "#1e1e1e" }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#2d2d2d", borderBottom: "1px solid #3d3d3d" }}>
        <span className="text-xs" style={{ color: "#9a958e" }}>{linguagem}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-all"
          style={{ color: "#a8d5a2", background: "rgba(46,125,50,0.15)" }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm" style={{ color: "#d4d4d4", lineHeight: 1.6, fontFamily: "'Courier New', monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function AccordionItem({ section }: { section: CodeSection }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden transition-all" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif" }}>
              {section.titulo}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#f4f3ee", color: "#7a7568" }}>
              {section.linguagem}
            </span>
          </div>
          <p className="text-xs" style={{ color: "#9a958e" }}>{section.arquivo}</p>
        </div>
        {open ? <ChevronDown size={18} style={{ color: "#7a7568" }} /> : <ChevronRight size={18} style={{ color: "#7a7568" }} />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm mb-4" style={{ color: "#5a5448", lineHeight: 1.7 }}>
            {section.descricao}
          </p>
          <CodeBlock code={section.codigo} linguagem={section.linguagem} />
        </div>
      )}
    </div>
  );
}

export default function CodigoProtegido() {
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (senha === SENHA_CORRETA) {
      setAutenticado(true);
      setErro(false);
      toast.success("Acesso liberado!");
    } else {
      setErro(true);
      toast.error("Senha incorreta.");
    }
  };

  if (!autenticado) {
    return (
      <Layout>
        <section className="py-20">
          <div className="container max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: "rgba(46,125,50,0.1)" }}>
                <Lock size={28} style={{ color: "#2E7D32" }} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                Área Protegida
              </h1>
              <p className="text-sm" style={{ color: "#7a7568", lineHeight: 1.7 }}>
                Esta seção contém o código-fonte documentado do sistema. Insira a senha para acessar.
              </p>
            </div>
            <form onSubmit={handleLogin} className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <label className="block text-sm font-medium mb-2" style={{ color: "#5a5448" }}>Senha de acesso</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(false); }}
                placeholder="Digite a senha..."
                className="w-full px-4 py-3 rounded-lg text-sm mb-4"
                style={{
                  background: "#fafaf5",
                  border: `1px solid ${erro ? "#BF360C" : "#e8e5dd"}`,
                  color: "#2c2417",
                  outline: "none",
                }}
                autoFocus
              />
              {erro && (
                <p className="text-xs mb-3" style={{ color: "#BF360C" }}>Senha incorreta. Tente novamente.</p>
              )}
              <button
                type="submit"
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "#2E7D32", color: "#fff" }}
              >
                Acessar Código
              </button>
            </form>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header autenticado */}
      <section className="py-12" style={{ background: "#f4f3ee" }}>
        <div className="container max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
              <Unlock size={20} style={{ color: "#2E7D32" }} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                Código-Fonte Documentado
              </h1>
              <p className="text-sm" style={{ color: "#7a7568" }}>
                Acesso autenticado — Edilvando Pereira Eufrazio
              </p>
            </div>
          </div>
          <p className="text-base" style={{ color: "#5a5448", fontFamily: "'Source Serif 4', serif", lineHeight: 1.8, maxWidth: "700px" }}>
            Abaixo está o código-fonte documentado do sistema, organizado por módulo. Cada seção inclui uma descrição funcional e o código com comentários explicativos. O sistema foi desenvolvido em React com TypeScript, utilizando Tailwind CSS para estilização e Recharts para visualizações.
          </p>
        </div>
      </section>

      {/* Stack tecnológica */}
      <section className="py-10">
        <div className="container max-w-5xl">
          <h2 className="text-xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Stack Tecnológica
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {[
              { nome: "React 19", desc: "Interface de usuário" },
              { nome: "TypeScript", desc: "Tipagem estática" },
              { nome: "Tailwind CSS 4", desc: "Estilização" },
              { nome: "Recharts", desc: "Gráficos interativos" },
              { nome: "Wouter", desc: "Roteamento" },
              { nome: "Lucide Icons", desc: "Ícones" },
              { nome: "Sonner", desc: "Notificações" },
              { nome: "Python 3", desc: "Geração de dados" },
            ].map((tech) => (
              <div key={tech.nome} className="rounded-lg p-3" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
                <p className="text-sm font-semibold" style={{ color: "#2c2417" }}>{tech.nome}</p>
                <p className="text-xs" style={{ color: "#9a958e" }}>{tech.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Módulos do Sistema
          </h2>
          <div className="space-y-3">
            {secoesCodigo.map((section, i) => (
              <AccordionItem key={i} section={section} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
