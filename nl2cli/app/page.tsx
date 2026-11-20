"use client";

import { FormEvent, KeyboardEvent, useState } from "react";

type RiskLevel = "low" | "medium" | "high";

interface GenerateResponse {
  command: string;
  risk: RiskLevel;
  explanation: string;
  warning: string;
}

const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800 border-green-300",
  medium: "bg-orange-100 text-orange-800 border-orange-300",
  high: "bg-red-100 text-red-800 border-red-300",
};

export default function HomePage() {
  const [os, setOs] = useState<"linux" | "macos" | "windows">("linux");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function submitRequest() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) return;

    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          os,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Erreur lors de la génération de la commande.");
        setResult(null);
        return;
      }

      setResult(data as GenerateResponse);
    } catch {
      setError("Impossible de joindre le serveur.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitRequest();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submitRequest();
    }
  }

  async function handleCopy() {
    if (!result?.command) return;
    await navigator.clipboard.writeText(result.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">
        Générateur de commandes Shell / Git / Docker
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Décrivez ce que vous voulez faire en français.
      </p>

      <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="os-select" className="block text-sm font-medium">
            Environnement cible
          </label>
          <select
            id="os-select"
            value={os}
            onChange={(e) =>
              setOs(e.target.value as "linux" | "macos" | "windows")
            }
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
          >
            <option value="linux">Linux / macOS</option>
            <option value="windows">Windows PowerShell</option>
          </select>
        </div>

        <div>
          <label htmlFor="prompt-input" className="block text-sm font-medium">
            Demande en français (Ctrl + Entrée pour envoyer)
          </label>
          <textarea
            id="prompt-input"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex. : Supprime tous les conteneurs Docker arrêtés et les volumes non utilisés"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Génération en cours..." : "Générer la commande"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <section className="mt-6 space-y-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                RISK_BADGE_CLASSES[result.risk]
              }`}
            >
              Risque : {result.risk}
            </span>

            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50"
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>

          <pre className="overflow-x-auto rounded-md bg-gray-900 p-3 text-sm text-gray-100">
            <code>{result.command}</code>
          </pre>

          <p className="text-sm text-gray-700">{result.explanation}</p>

          {result.warning && (
            <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
              <strong>Avertissement :</strong> {result.warning}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
