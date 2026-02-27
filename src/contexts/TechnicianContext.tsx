import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TechnicianSession {
  technician_id: string;
  technician_name: string;
  company_id: string;
  company_name: string;
}

interface TechnicianContextType {
  techSession: TechnicianSession | null;
  isTechnician: boolean;
  loginTechnician: (session: TechnicianSession) => void;
  logoutTechnician: () => void;
}

const TechnicianContext = createContext<TechnicianContextType>({
  techSession: null,
  isTechnician: false,
  loginTechnician: () => {},
  logoutTechnician: () => {},
});

export const useTechnician = () => useContext(TechnicianContext);

const STORAGE_KEY = "technician_session";

export function TechnicianProvider({ children }: { children: ReactNode }) {
  const [techSession, setTechSession] = useState<TechnicianSession | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const loginTechnician = (session: TechnicianSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setTechSession(session);
  };

  const logoutTechnician = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTechSession(null);
  };

  return (
    <TechnicianContext.Provider value={{
      techSession,
      isTechnician: !!techSession,
      loginTechnician,
      logoutTechnician,
    }}>
      {children}
    </TechnicianContext.Provider>
  );
}
