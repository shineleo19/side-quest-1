import { NextResponse } from "next/server";

type GeneratePosterRequest = {
  prompt?: string;
  theme?: string;
  designerName?: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function extractSvgMarkup(text: string) {
  const fencedMatch = text.match(/```svg\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const svgStart = text.indexOf("<svg");
  const svgEnd = text.lastIndexOf("</svg>");

  if (svgStart >= 0 && svgEnd >= 0) {
    return text.slice(svgStart, svgEnd + "</svg>".length).trim();
  }

  return text.trim();
}

function svgToDataUrl(svgMarkup: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svgMarkup, "utf8").toString("base64")}`;
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  let body: GeneratePosterRequest;

  try {
    body = (await request.json()) as GeneratePosterRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const theme = body.theme?.trim() || "PIXEL_ART";
  const designerName = body.designerName?.trim() || "UNKNOWN";

  const instruction = [
    "Create a bold AI-generated poster as a single SVG image.",
    "Return only raw SVG markup. Do not wrap the response in markdown or code fences.",
    "The SVG must be self-contained and render well at 1000x1500.",
    "CRITICAL RULES FOR SVG GENERATION:",
    "1. Keep the code extremely minimal and lightweight.",
    "2. DO NOT use complex filters like <feTurbulence>, <feColorMatrix>, or complex gradients.",
    "3. DO NOT use base64 embedded images or attempt to draw pixel-level noise/dithering.",
    "4. Use ONLY simple geometric shapes (<rect>, <circle>, <polygon>, <path>) and basic <text> elements.",
    "Style guidance: high-contrast cyberpunk, experimental print, geometric blocks, subtle scanlines (using simple repeating lines), and a strong editorial layout.",
    `Theme: ${theme}`,
    `Designer: ${designerName}`,
    `Prompt: ${prompt}`,
  ].join("\n");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL,
  )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const bodyPayload = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: instruction }],
      },
    ],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 8192,
    },
  });

  const MAX_ATTEMPTS = 5;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyPayload,
    });

    if (response.ok) break;

    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      const waitMs = 2000 * Math.pow(2, attempt - 1);
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }

    break;
  }

  if (!response) {
    return NextResponse.json({ error: "No response from Gemini" }, { status: 502 });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.log("GOOGLE API ERROR RESPONSE:", errorText);
    return NextResponse.json(
      { error: `Gemini request failed (${response.status})`, details: errorText.slice(0, 500) },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
 console.log("RAW GEMINI RESPONSE START:\n", text, "\n:RAW GEMINI RESPONSE END");
  if (!text) {
    return NextResponse.json({ error: "Gemini returned no text" }, { status: 502 });
  }

  const svgMarkup = extractSvgMarkup(text);

  if (!svgMarkup.startsWith("<svg")) {
    return NextResponse.json({ error: "Gemini did not return SVG markup" }, { status: 502 });
  }

  return NextResponse.json({
    imageDataUrl: svgToDataUrl(svgMarkup),
  });
}