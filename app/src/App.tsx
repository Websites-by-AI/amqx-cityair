import { useEffect, useState } from "react";
import { Shell } from "./components/layout";
import { ChatWidget } from "./components/Chat";
import Home from "./pages/Home";
import Guidance from "./pages/Guidance";
import Assess from "./pages/Assess";
import Results from "./pages/Results";
import ActionPlan from "./pages/ActionPlan";
import Cities, { CityDetail } from "./pages/Cities";
import Innovations, { InnovationMatch } from "./pages/Innovations";
import Resources from "./pages/Resources";
import Methodology from "./pages/Methodology";
import About from "./pages/About";
import Expo from "./pages/Expo";
import Partners from "./pages/Partners";
import AiResearch from "./pages/AiResearch";
import Market from "./pages/Market";
import Admin from "./pages/Admin";
import { LangProvider } from "./i18n";
import Assistant from "./pages/Assistant";
import { Button, Card } from "./components/ui";

/** Normalises /cities/istanbul -> #/cities/istanbul so deep links work on any host. */
function normaliseDeepLink() {
  const { pathname, hash, search } = window.location;
  if (!hash && pathname && pathname !== "/" && !pathname.endsWith(".html")) {
    window.location.replace(`${window.location.origin}/#${pathname}${search}`);
  }
}

function useRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, "") || "/");
  useEffect(() => {
    const onChange = () => {
      setRoute(window.location.hash.replace(/^#/, "") || "/");
      const anchor = window.location.hash.split("#")[1];
      if (anchor && anchor !== route.split("#")[1]) {
        setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }), 60);
      }
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [route]);
  return route;
}

function NotFound({ route }: { route: string }) {
  return (
    <div className="container-page py-24">
      <Card className="mx-auto max-w-lg text-center">
        <p className="eyebrow text-accent-600">404</p>
        <h1 className="mt-2 text-2xl font-extrabold text-brand-950">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{route}</code> is not part of
          CityAir. Try the assessment, the guidance domains or the assistant.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button href="#/">Home</Button>
          <Button href="#/assess" variant="outline">
            Assessment
          </Button>
          <Button href="#/assistant" variant="ghost">
            Assistant
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const route = useRoute();

  useEffect(() => {
    normaliseDeepLink();
  }, []);

  const [path] = route.split("?");
  const cityMatch = path.match(/^\/cities\/(.+)$/);

  let page = <NotFound route={route} />;
  if (cityMatch) page = <CityDetail id={decodeURIComponent(cityMatch[1])} />;
  else
    switch (path) {
      case "/":
        page = <Home />;
        break;
      case "/guidance":
        page = <Guidance />;
        break;
      case "/assess":
        page = <Assess />;
        break;
      case "/results":
        page = <Results />;
        break;
      case "/action-plan":
        page = <ActionPlan />;
        break;
      case "/expo":
        page = <Expo />;
        break;
      case "/market":
        return <Market />;
      case "/ai-research":
        return <AiResearch />;
      case "/partners":
        page = <Partners />;
        break;
      case "/admin":
        page = <Admin />;
        break;
      case "/cities":
        page = <Cities />;
        break;
      case "/innovations":
        page = <Innovations />;
        break;
      case "/innovation-match":
        page = <InnovationMatch />;
        break;
      case "/resources":
        page = <Resources />;
        break;
      case "/methodology":
        page = <Methodology />;
        break;
      case "/about":
        page = <About />;
        break;
      case "/assistant":
        page = <Assistant />;
        break;
      default:
        page = <NotFound route={route} />;
    }

  return (
    <LangProvider>
      <Shell route={path}>
        <div key={path} className="animate-fade-up">
          {page}
        </div>
        <ChatWidget />
      </Shell>
    </LangProvider>
  );
}
