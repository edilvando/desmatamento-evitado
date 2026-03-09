/*
 * Layout.tsx — Componente de layout principal
 * Design: "Terra Viva" — Estética Editorial Ambiental
 * Paleta: verde-musgo, terra-queimada, dourado-cerrado, off-white
 * Tipografia: Merriweather (títulos), Source Sans 3 (corpo)
 */
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const EMBRAPA_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/embrapa-logo_067cea09.png";

const navItems = [
  { href: "/", label: "Panorama" },
  { href: "/estados", label: "Estados" },
  { href: "/mato-grosso", label: "Mato Grosso" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/fontes", label: "Fontes de Dados" },
  { href: "/codigo", label: "Código" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAFAF5" }}>
      {/* Header institucional */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(250,250,245,0.95)", backdropFilter: "blur(8px)", borderColor: "#e0ddd5" }}>
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <img src={EMBRAPA_LOGO} alt="Embrapa" className="h-9" />
            <div className="hidden sm:block">
              <span className="text-sm font-semibold tracking-tight" style={{ color: "#2E7D32", fontFamily: "'Source Sans 3', sans-serif" }}>
                Desmatamento Evitado
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium rounded-md transition-colors no-underline"
                  style={{
                    color: isActive ? "#2E7D32" : "#5a5448",
                    background: isActive ? "rgba(46,125,50,0.08)" : "transparent",
                    fontFamily: "'Source Sans 3', sans-serif",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-md"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: "#5a5448" }}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t px-4 pb-4 pt-2" style={{ borderColor: "#e0ddd5" }}>
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2.5 text-sm font-medium rounded-md no-underline"
                  style={{
                    color: isActive ? "#2E7D32" : "#5a5448",
                    background: isActive ? "rgba(46,125,50,0.08)" : "transparent",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor: "#e0ddd5", background: "#f4f3ee" }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <img src={EMBRAPA_LOGO} alt="Embrapa" className="h-10 mb-3" />
              <p className="text-sm" style={{ color: "#7a7568", lineHeight: 1.7 }}>
                Sistema de Desmatamento Evitado baseado na metodologia Hectares Indicator (ACEU).
                Projeto Rural Sustentável — Embrapa Agrossilvipastoril.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "#2E7D32", fontFamily: "'Source Sans 3', sans-serif" }}>
                Navegação
              </h4>
              <div className="flex flex-col gap-1.5">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm no-underline hover:underline"
                    style={{ color: "#7a7568" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "#2E7D32", fontFamily: "'Source Sans 3', sans-serif" }}>
                Créditos
              </h4>
              <p className="text-sm" style={{ color: "#7a7568", lineHeight: 1.7 }}>
                Desenvolvido por Edilvando Pereira Eufrazio
              </p>
              <p className="text-sm mt-1" style={{ color: "#7a7568", lineHeight: 1.7 }}>
                Embrapa Agrossilvipastoril (CPAMT)
              </p>
              <p className="text-sm mt-1" style={{ color: "#9a958e", lineHeight: 1.7 }}>
                Dados atualizados em março de 2026
              </p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: "#e0ddd5" }}>
            <p className="text-xs" style={{ color: "#9a958e" }}>
              Fontes: PRODES/INPE (TerraBrasilis) · MapBiomas · Global Forest Change (Hansen et al., 2013) · IBGE
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
