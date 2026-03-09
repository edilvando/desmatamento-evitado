import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Estados from "./pages/Estados";
import MatoGrosso from "./pages/MatoGrosso";
import Metodologia from "./pages/Metodologia";
import FontesDados from "./pages/FontesDados";
import CodigoProtegido from "./pages/CodigoProtegido";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/estados"} component={Estados} />
      <Route path={"/mato-grosso"} component={MatoGrosso} />
      <Route path={"/metodologia"} component={Metodologia} />
      <Route path={"/fontes"} component={FontesDados} />
      <Route path={"/codigo"} component={CodigoProtegido} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
