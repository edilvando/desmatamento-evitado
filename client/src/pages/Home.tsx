/*
 * Home.tsx — Página principal / Panorama
 * Design: "Terra Viva" — hero com imagem aérea, contadores animados, resumo nacional
 */
import Layout from "@/components/Layout";
import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, TreePine, MapPin, TrendingDown, BarChart3 } from "lucide-react";
import desmatamentoData from "@/data/desmatamento.json";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/hero-amazonia-7RADVFFLPdKKonoZx4vaUp.webp";
const CONTRAST_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/deforestation-contrast-fzQ9XAFdzhoR6bApfFgYDX.webp";
const RECOVERY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/forest-recovery-YSdwfGToooEWBghRTVzxxQ.webp";

function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          animate();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <div ref={ref} className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif", color: "#2E7D32" }}>
      {count.toLocaleString("pt-BR")}{suffix}
    </div>
  );
}

function FadeInSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const totalDesmatamento2024 = desmatamentoData.estados.reduce(
    (sum, e) => sum + (e.desmatamento_anual["2024"] || 0), 0
  );
  const totalDesmatamento2023 = desmatamentoData.estados.reduce(
    (sum, e) => sum + (e.desmatamento_anual["2023"] || 0), 0
  );
  const variacao = ((totalDesmatamento2024 - totalDesmatamento2023) / totalDesmatamento2023 * 100).toFixed(1);

  const topEstados = [...desmatamentoData.estados]
    .sort((a, b) => (b.desmatamento_anual["2024"] || 0) - (a.desmatamento_anual["2024"] || 0))
    .slice(0, 5);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ minHeight: "85vh" }}>
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Vista aérea da Amazônia" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 60%, rgba(250,250,245,1) 100%)" }} />
        </div>
        <div className="relative container flex flex-col justify-center" style={{ minHeight: "85vh", paddingTop: "6rem", paddingBottom: "8rem" }}>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: "#a8d5a2", fontFamily: "'Source Sans 3', sans-serif" }}>
              Embrapa Agrossilvipastoril · Projeto Rural Sustentável
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: "#ffffff", fontFamily: "'Merriweather', serif" }}>
              Desmatamento Evitado no Brasil
            </h1>
            <p className="text-lg md:text-xl leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.88)", fontFamily: "'Source Sans 3', sans-serif", maxWidth: "600px" }}>
              Sistema interativo para análise e visualização do desmatamento evitado, baseado na metodologia Hectares Indicator (ACEU). Explore dados por estado e município ao longo dos anos.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/estados" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold no-underline transition-all" style={{ background: "#2E7D32", color: "#fff", fontFamily: "'Source Sans 3', sans-serif" }}>
                Explorar Estados <ArrowRight size={16} />
              </Link>
              <Link href="/metodologia" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold no-underline transition-all" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.25)" }}>
                Sobre a Metodologia
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contadores */}
      <FadeInSection>
        <section className="py-16" style={{ background: "#FAFAF5" }}>
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: "rgba(46,125,50,0.1)" }}>
                  <MapPin size={22} style={{ color: "#2E7D32" }} />
                </div>
                <AnimatedCounter target={27} />
                <p className="text-sm mt-1" style={{ color: "#7a7568" }}>Estados monitorados</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: "rgba(46,125,50,0.1)" }}>
                  <TreePine size={22} style={{ color: "#2E7D32" }} />
                </div>
                <AnimatedCounter target={26} />
                <p className="text-sm mt-1" style={{ color: "#7a7568" }}>Municípios do MT</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: "rgba(46,125,50,0.1)" }}>
                  <TrendingDown size={22} style={{ color: "#2E7D32" }} />
                </div>
                <AnimatedCounter target={totalDesmatamento2024} suffix=" km²" />
                <p className="text-sm mt-1" style={{ color: "#7a7568" }}>Desmatamento 2024</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: "rgba(46,125,50,0.1)" }}>
                  <BarChart3 size={22} style={{ color: "#2E7D32" }} />
                </div>
                <AnimatedCounter target={17} suffix=" anos" />
                <p className="text-sm mt-1" style={{ color: "#7a7568" }}>Série histórica</p>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Seção: O que é desmatamento evitado */}
      <FadeInSection>
        <section className="py-20">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "#8D6E63", fontFamily: "'Source Sans 3', sans-serif" }}>
                  Conceito
                </p>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif", lineHeight: 1.3 }}>
                  O que é o Desmatamento Evitado?
                </h2>
                <p className="text-base leading-relaxed mb-4" style={{ color: "#5a5448", fontFamily: "'Source Serif 4', serif", lineHeight: 1.8 }}>
                  O desmatamento evitado é a diferença entre a perda florestal que seria esperada na ausência de intervenções e a perda florestal efetivamente observada. Quando esse valor é positivo, significa que ações de conservação, fiscalização ou políticas públicas conseguiram preservar áreas que, de outra forma, teriam sido desmatadas.
                </p>
                <p className="text-base leading-relaxed mb-6" style={{ color: "#5a5448", fontFamily: "'Source Serif 4', serif", lineHeight: 1.8 }}>
                  A estimativa da perda esperada utiliza a metodologia ACEU (Acessibilidade, Cultivabilidade, Extraibilidade e áreas desprotegidas), desenvolvida por Tipper e Morel (2016) e aplicada pela Embrapa no contexto do Projeto Rural Sustentável.
                </p>
                <div className="p-5 rounded-lg" style={{ background: "rgba(46,125,50,0.06)", borderLeft: "4px solid #2E7D32" }}>
                  <p className="text-sm italic" style={{ color: "#2E7D32", fontFamily: "'Source Serif 4', serif", lineHeight: 1.7 }}>
                    Desmatamento Evitado = Perda Florestal Esperada − Perda Florestal Observada
                  </p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden shadow-lg">
                <img src={CONTRAST_IMG} alt="Contraste entre floresta e área desmatada" className="w-full h-80 object-cover" />
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Top 5 estados */}
      <FadeInSection>
        <section className="py-20" style={{ background: "#f4f3ee" }}>
          <div className="container">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "#8D6E63" }}>
                Dados 2024
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                Estados com Maior Desmatamento
              </h2>
              <p className="text-base mx-auto" style={{ color: "#7a7568", maxWidth: "600px", lineHeight: 1.7 }}>
                Variação de {variacao}% em relação a 2023. Os dados abaixo mostram os cinco estados com maiores taxas de desmatamento registradas em 2024.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {topEstados.map((estado, i) => {
                const val2024 = estado.desmatamento_anual["2024"] || 0;
                const val2023 = estado.desmatamento_anual["2023"] || 0;
                const change = val2023 > 0 ? ((val2024 - val2023) / val2023 * 100).toFixed(1) : "0";
                const isDown = Number(change) < 0;
                return (
                  <div key={estado.sigla} className="rounded-xl p-5 transition-all hover:shadow-md" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(46,125,50,0.1)", color: "#2E7D32" }}>
                        #{i + 1}
                      </span>
                      <span className="text-xs font-medium" style={{ color: "#9a958e" }}>{estado.sigla}</span>
                    </div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif" }}>
                      {estado.nome}
                    </h3>
                    <p className="text-2xl font-bold mb-1" style={{ color: "#2E7D32", fontFamily: "'Source Sans 3', sans-serif" }}>
                      {val2024.toLocaleString("pt-BR")} km²
                    </p>
                    <p className="text-xs" style={{ color: isDown ? "#2E7D32" : "#BF360C" }}>
                      {isDown ? "↓" : "↑"} {change}% vs 2023
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link href="/estados" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold no-underline transition-all hover:shadow-md" style={{ background: "#2E7D32", color: "#fff" }}>
                Ver todos os estados <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Seção Mato Grosso */}
      <FadeInSection>
        <section className="py-20">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="rounded-xl overflow-hidden shadow-lg order-2 lg:order-1">
                <img src={RECOVERY_IMG} alt="Recuperação florestal" className="w-full h-80 object-cover" />
              </div>
              <div className="order-1 lg:order-2">
                <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "#8D6E63" }}>
                  Foco Regional
                </p>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif", lineHeight: 1.3 }}>
                  Mato Grosso em Detalhe
                </h2>
                <p className="text-base leading-relaxed mb-4" style={{ color: "#5a5448", fontFamily: "'Source Serif 4', serif", lineHeight: 1.8 }}>
                  O Mato Grosso é o segundo estado com maior desmatamento acumulado na Amazônia Legal, com mais de 156 mil km² de floresta convertida. A análise municipal permite identificar os focos de pressão e as áreas onde intervenções de conservação têm sido mais efetivas.
                </p>
                <p className="text-base leading-relaxed mb-6" style={{ color: "#5a5448", fontFamily: "'Source Serif 4', serif", lineHeight: 1.8 }}>
                  Explore dados detalhados de 26 municípios, incluindo cobertura florestal, áreas protegidas e cálculo do desmatamento evitado pela metodologia ACEU.
                </p>
                <Link href="/mato-grosso" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold no-underline transition-all hover:shadow-md" style={{ background: "#2E7D32", color: "#fff" }}>
                  Explorar Municípios <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>
    </Layout>
  );
}
