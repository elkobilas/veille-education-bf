import { env } from "@/lib/env";

interface SummaryResult {
  summary: string;
  targetAudience: string;
  importantDates: string;
  requiredDocs: string;
}

interface AIProvider {
  name: string;
  url: string;
  apiKey: string;
  model: string;
}

function getProvider(): AIProvider | null {
  // DeepSeek
  if (env.DEEPSEEK_API_KEY) {
    return {
      name: "DeepSeek",
      url: "https://api.deepseek.com/v1/chat/completions",
      apiKey: env.DEEPSEEK_API_KEY,
      model: env.DEEPSEEK_MODEL || "deepseek-chat",
    };
  }

  // OpenAI
  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== "sk-...") {
    return {
      name: "OpenAI",
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }

  return null;
}

/**
 * Génère un résumé structuré d'un communiqué via l'IA.
 * Supporte DeepSeek et OpenAI. Fallback si aucune clé configurée.
 */
export async function summarizeCommunique(
  title: string,
  content: string
): Promise<SummaryResult> {
  const provider = getProvider();
  if (!provider) {
    return fallbackSummary(title, content);
  }

  try {
    const prompt = `Tu es un assistant qui analyse des communiqués officiels du secteur de l'éducation au Burkina Faso.

Analyse le communiqué suivant et extrait les informations selon ce format JSON strict :

{
  "summary": "Résumé de 3 à 5 phrases en français, clair et concis.",
  "targetAudience": "Personnes concernées : CEP, BEPC, BAC, bourses, enseignants, parents, élèves, étudiants, etc. (liste à puces courte)",
  "importantDates": "Dates importantes mentionnées (format: JJ/MM/AAAA ou période), ou 'Aucune' si rien.",
  "requiredDocs": "Pièces à fournir si mentionnées, ou 'Aucune' si rien."
}

Titre : ${title}

Contenu :
${content.slice(0, 4000)}`;

    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: "system",
            content:
              "Tu réponds toujours en JSON valide, sans markdown, sans commentaires.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider.name} API ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const raw = data.choices[0]?.message?.content ?? "{}";
    const json = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(json) as SummaryResult;

    return {
      summary: parsed.summary ?? "Résumé non disponible.",
      targetAudience: parsed.targetAudience ?? "Non spécifiée.",
      importantDates: parsed.importantDates ?? "Aucune.",
      requiredDocs: parsed.requiredDocs ?? "Aucune.",
    };
  } catch (err) {
    console.error(
      `[summarizeCommunique] Erreur IA, fallback:`,
      (err as Error).message
    );
    return fallbackSummary(title, content);
  }
}

function fallbackSummary(title: string, content: string): SummaryResult {
  const excerpt = content.slice(0, 500).replace(/\s+/g, " ").trim();
  return {
    summary: `${title}. ${excerpt}...`,
    targetAudience:
      "Non déterminé (configurer DEEPSEEK_API_KEY ou OPENAI_API_KEY pour l'analyse automatique).",
    importantDates:
      "Non déterminé (configurer DEEPSEEK_API_KEY ou OPENAI_API_KEY pour l'extraction automatique).",
    requiredDocs:
      "Non déterminé (configurer DEEPSEEK_API_KEY ou OPENAI_API_KEY pour l'extraction automatique).",
  };
}
