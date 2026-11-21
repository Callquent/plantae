"use client";

import { useCallback, useEffect, useState } from "react";
import { countQueue, flushQueue, QUEUE_EVENT } from "./photo/queue";

/** Bandeau visible tant que des photos attendent d'être envoyées au PC ; réessaie tout seul. */
export default function UploadBanner() {
  const [pending, setPending] = useState(0);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => setPending(await countQueue()), []);

  const send = useCallback(async () => {
    setSending(true);
    try {
      await flushQueue();
    } finally {
      setSending(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    const kick = async () => {
      if ((await countQueue()) > 0) await send();
      else await refresh();
    };
    void kick();
    const onVisible = () => document.visibilityState === "visible" && void kick();
    window.addEventListener("online", kick);
    window.addEventListener(QUEUE_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(kick, 30_000);
    return () => {
      window.removeEventListener("online", kick);
      window.removeEventListener(QUEUE_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [send, refresh]);

  if (pending === 0) return <div aria-live="polite" />;
  return (
    <div aria-live="polite" className="bg-sun/25 px-4 py-2 text-center text-sm text-sun-deep">
      {pending} photo{pending > 1 ? "s" : ""} en attente d'envoi vers le PC.{" "}
      <button type="button" onClick={send} disabled={sending} className="font-semibold underline disabled:opacity-60">
        {sending ? "Envoi…" : "Renvoyer maintenant"}
      </button>
    </div>
  );
}
