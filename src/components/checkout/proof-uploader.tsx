/* ============================================================================
   CLICSTORE — Componente de subida de comprobante
   ----------------------------------------------------------------------------
   CLIENT COMPONENT que permite al cliente subir una imagen o PDF del
   comprobante de transferencia.
   ============================================================================ */

"use client";

import { useCallback, useRef, useState } from "react";

type ProofUploaderProps = {
  orderId: string;
  onUploaded?: () => void;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

const ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";
const MAX_SIZE = 5 * 1024 * 1024;

export function ProofUploader({ orderId, onUploaded }: ProofUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const selected = e.target.files?.[0];
      if (!selected) {
        setFile(null);
        return;
      }
      if (selected.size > MAX_SIZE) {
        setError(
          `El archivo supera 5 MB. Tu archivo pesa ${(selected.size / 1024 / 1024).toFixed(2)} MB.`
        );
        setFile(null);
        return;
      }
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      if (!validTypes.includes(selected.type)) {
        setError("Formato no permitido. Solo JPG, PNG o PDF.");
        setFile(null);
        return;
      }
      setFile(selected);
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setStatus("uploading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/orders/${orderId}/proof`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos subir tu comprobante.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setWhatsappLink(data.notifications?.whatsappLink ?? null);
      if (onUploaded) onUploaded();
    } catch (err) {
      console.error("Error subiendo comprobante:", err);
      setError("Error de conexión. Revisa tu internet e intenta de nuevo.");
      setStatus("error");
    }
  }, [file, orderId, onUploaded]);

  const handleReset = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setError(null);
    setWhatsappLink(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-success text-white flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-success">
              ¡Comprobante enviado!
            </h3>
            <p className="mt-1 text-sm text-muted">
              Recibimos tu comprobante. Lo verificaremos y te confirmaremos el pago pronto.
            </p>
            {whatsappLink && (
              <>
                <p className="mt-4 text-sm text-muted">
                  Para acelerar la verificación, avísanos por WhatsApp:
                </p>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-success text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  Avisar por WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "uploading") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div>
            <p className="font-semibold">Subiendo comprobante...</p>
            <p className="text-sm text-muted">Por favor espera.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
      <h2 className="text-xl font-bold">Sube tu comprobante</h2>
      <p className="mt-2 text-sm text-muted">
        Después de hacer la transferencia, sube una foto o PDF del comprobante. Aceptamos JPG, PNG o PDF (máximo 5 MB).
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-5">
        {!file ? (
          <label
            htmlFor="proof-file"
            className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <p className="mt-3 font-semibold text-text">
              Haz clic para seleccionar un archivo
            </p>
            <p className="text-xs text-muted mt-1">JPG, PNG o PDF · máx 5 MB</p>
            <input
              ref={inputRef}
              id="proof-file"
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        ) : (
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-lg bg-surface2 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-muted hover:text-text transition-colors"
              >
                Cambiar
              </button>
            </div>
          </div>
        )}
      </div>

      {file && (
        <button
          type="button"
          onClick={handleUpload}
          className="mt-5 w-full h-12 rounded-xl bg-primary text-primaryFg font-semibold hover:opacity-90 active:scale-[0.99] transition-all"
        >
          Subir comprobante
        </button>
      )}
    </div>
  );
}