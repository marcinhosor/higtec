import { useState } from "react";
import PageShell from "@/components/PageShell";
import { ExternalLink, Store } from "lucide-react";

const stores = [
  {
    id: "loja-profissional",
    name: "Loja do Profissional",
    url: "https://www.lojadoprofissional.com.br",
    description: "Produtos profissionais para higienização",
  },
  {
    id: "cnx-industry",
    name: "CNX Industry",
    url: "https://www.cnxindustry.com.br",
    description: "Equipamentos e químicos industriais",
  },
];

export default function MarketplacePage() {
  const [activeStore, setActiveStore] = useState(stores[0]);

  return (
    <PageShell title="Marketplace">
      {/* Store tabs */}
      <div className="flex gap-2 mb-4">
        {stores.map((store) => (
          <button
            key={store.id}
            onClick={() => setActiveStore(store)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeStore.id === store.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground border border-border hover:bg-accent"
            }`}
          >
            <Store className="h-4 w-4" />
            {store.name}
          </button>
        ))}
      </div>

      {/* Open in browser link */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{activeStore.description}</p>
        <a
          href={activeStore.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        >
          Abrir no navegador
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Embedded store */}
      <div className="relative rounded-xl border border-border overflow-hidden bg-card shadow-card" style={{ height: "calc(100vh - 280px)" }}>
        <iframe
          key={activeStore.id}
          src={activeStore.url}
          title={activeStore.name}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
        />
      </div>
    </PageShell>
  );
}
