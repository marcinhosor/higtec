import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Heart, Tag } from "lucide-react";
import { trackEvent, getSubscription, saveSubscription } from "@/lib/analytics";
import { db } from "@/lib/storage";

interface ChurnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCanceled: () => void;
}

const reasons = [
  { id: "expensive", label: "Muito caro" },
  { id: "not_using", label: "Não estou usando" },
  { id: "missing_feature", label: "Falta recurso" },
  { id: "other", label: "Outro" },
];

export default function ChurnModal({ open, onOpenChange, onCanceled }: ChurnModalProps) {
  const [step, setStep] = useState<"reason" | "offer">("reason");
  const [selectedReason, setSelectedReason] = useState("");

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
    trackEvent("canceled_subscription", { reason });
    setStep("offer");
  };

  const handleAcceptOffer = () => {
    // Apply 50% discount simulation
    const sub = getSubscription();
    sub.subscriptionStatus = "active";
    sub.churnReason = null;
    saveSubscription(sub);
    trackEvent("churn_prevented", { reason: selectedReason, offer: "50_percent_2months" });
    onOpenChange(false);
  };

  const handleConfirmCancel = () => {
    const sub = getSubscription();
    const company = db.getCompany();
    // Grace period: 3 days
    const grace = new Date();
    grace.setDate(grace.getDate() + 3);
    sub.subscriptionStatus = "grace";
    sub.subscriptionEnd = grace.toISOString();
    sub.churnReason = selectedReason;
    saveSubscription(sub);
    company.isPro = false;
    db.saveCompany(company);
    trackEvent("canceled_subscription", { reason: selectedReason, accepted_offer: false });
    onCanceled();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-none bg-gradient-to-b from-[hsl(0,0%,8%)] to-[hsl(0,0%,4%)] p-0 text-white sm:rounded-2xl overflow-hidden">
        <div className="px-6 pt-8 pb-6">
          {step === "reason" ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(0,84%,60%,0.15)]">
                <AlertTriangle className="h-7 w-7 text-[hsl(0,84%,65%)]" />
              </div>
              <h2 className="text-center text-xl font-bold">Sentiremos sua falta</h2>
              <p className="mt-2 text-center text-sm text-[hsl(0,0%,60%)]">
                O que está faltando para você continuar?
              </p>
              <div className="mt-5 space-y-2">
                {reasons.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectReason(r.id)}
                    className="w-full rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)] px-4 py-3 text-left text-sm text-[hsl(0,0%,80%)] transition hover:border-[hsl(0,0%,30%)] hover:bg-[hsl(0,0%,15%)]"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(43,72%,45%,0.15)]">
                <Tag className="h-7 w-7 text-[hsl(43,72%,60%)]" />
              </div>
              <h2 className="text-center text-xl font-bold">Oferta especial pra você</h2>
              <div className="mt-4 rounded-xl border border-[hsl(43,72%,45%,0.3)] bg-[hsl(43,72%,45%,0.08)] p-4 text-center">
                <p className="text-3xl font-extrabold text-[hsl(43,72%,60%)]">50% OFF</p>
                <p className="mt-1 text-sm text-[hsl(0,0%,65%)]">por 2 meses para continuar</p>
              </div>
              <div className="mt-5 space-y-2.5">
                <Button
                  onClick={handleAcceptOffer}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(43,72%,50%)] to-[hsl(30,80%,45%)] text-white font-semibold border-none"
                >
                  <Heart className="mr-2 h-4 w-4" /> Aceitar oferta
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleConfirmCancel}
                  className="w-full text-[hsl(0,0%,45%)] hover:text-[hsl(0,84%,65%)] hover:bg-[hsl(0,0%,12%)]"
                >
                  Cancelar mesmo assim
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
