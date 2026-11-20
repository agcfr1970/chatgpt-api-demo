import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const commandResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    command: {
      type: "string",
      description: "The exact shell, Git, or Docker command without markdown code fences.",
    },
    risk: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Risk level of running the command.",
    },
    explanation: {
      type: "string",
      description: "Short explanation in French of what the command does (1 sentence max).",
    },
    warning: {
      type: "string",
      description: "Warning message if risk is medium or high, otherwise an empty string.",
    },
  },
  required: ["command", "risk", "explanation", "warning"],
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const os =
      body?.os === "linux" || body?.os === "macos" || body?.os === "windows"
        ? body.os
        : "linux / macOS";

    if (!prompt) {
      return NextResponse.json(
        { error: "Le champ 'prompt' est requis et ne peut pas être vide." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Clé API OpenAI manquante côté serveur (.env.local)." },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            "Tu es un assistant expert en ligne de commande (Bash/Zsh, Git, Docker, PowerShell).",
            `Environnement cible : ${os}.`,
            "Traduis la demande de l'utilisateur en une commande prête à l'emploi.",
            "Ne mets jamais de balises markdown (```) dans 'command'.",
            "Évalue 'risk' : 'low' (lecture/inspection/safe), 'medium' (modifie l'état local ou branches/fichiers de manière réversible ou modérée), 'high' (suppression irréversible, force push, reset --hard, prune, rm -rf).",
            "Si 'risk' est 'medium' ou 'high', remplis 'warning' avec une alerte claire ; sinon mets une chaîne vide ''.",
          ].join(" "),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cli_command_result",
          strict: true,
          schema: commandResponseSchema,
        },
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: "Réponse vide reçue depuis l'API OpenAI." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawContent);
    return NextResponse.json(parsed, { status: 200 });
  } catch (err: unknown) {
    const statusCode =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;

    if (statusCode === 401) {
      return NextResponse.json(
        { error: "Clé API OpenAI invalide (401). Vérifiez OPENAI_API_KEY dans .env.local." },
        { status: 401 }
      );
    }

    if (statusCode === 429) {
      return NextResponse.json(
        { error: "Quota ou limite de requêtes OpenAI dépassé (429)." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Erreur serveur lors de la génération de la commande." },
      { status: 500 }
    );
  }
}