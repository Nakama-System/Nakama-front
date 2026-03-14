"use client";

// app/Providers.tsx
// Este es el único archivo con "use client" en el root.
// Contiene AuthProvider y el modal de términos.

import { AuthProvider, useAuth } from "./context/authContext";
import { useTermsUpdate } from "./hooks/useTermsUpdate";
import TermsUpdateModal from "./termsupdatemodal/page";

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const socket = null; // reemplazá con tu socket cuando lo tengas

  const { hasPendingTerms, activeTerms, accepting, acceptTerms, error } =
    useTermsUpdate(user, socket, token);

  return (
    <>
      {hasPendingTerms && activeTerms && (
        <TermsUpdateModal
          terms={activeTerms}
          accepting={accepting}
          error={error}
          onAccept={acceptTerms}
        />
      )}
      {children}
    </>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>
        {children}
      </AppShell>
    </AuthProvider>
  );
}