import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageShellProps {
  title: string;
  children: ReactNode;
  showBack?: boolean;
  action?: ReactNode;
}

export default function PageShell({ title, children, showBack, action }: PageShellProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-foreground hover:bg-accent">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
          </div>
          {action}
        </div>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
