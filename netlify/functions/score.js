const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function getResponseText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const message = data.output?.find((item) => item.type === "message");
  const textPart = message?.content?.find((part) => part.type === "output_text");
  return textPart?.text || "";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, {
      error: "OPENAI_API_KEY is not configured on the server."
    });
  }

  let body;

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON request body." });
  }

  const { question, day, keyConcepts, modelAnswer, studentAnswer } = body;

  if (!question || !studentAnswer || !Array.isArray(keyConcepts)) {
    return json(400, {
      error: "Missing question, key concepts, or student answer."
    });
  }

  const prompt = `
You are an interactive Financial Accounting Quiz Agent for bank managers and finance students.

Grade the student's free-text answer based on conceptual understanding, accounting logic, completeness, accuracy, and critical thinking. Do not require exact wording. Reward valid alternative accounting explanations.

Question day: ${day || "Unknown"}
Question: ${question}

Key concepts:
${keyConcepts.map((concept) => `- ${concept}`).join("\n")}

Reference model answer:
${modelAnswer || "No model answer supplied."}

Student answer:
${studentAnswer}

Scoring standards:
- 9-10 Excellent: accurate, complete, uses accounting vocabulary correctly, explains why concepts matter, and includes financial statement or ratio impacts where relevant.
- 7-8 Good: mostly correct, minor missing details, good conceptual understanding.
- 5-6 Moderate: partial understanding, some correct ideas, missing important concepts, weak explanation.
- 0-4 Weak: major misunderstandings, important concepts incorrect or missing, confused logic.

Return constructive educational feedback. Never simply say "wrong"; explain missing concepts clearly.
`;

  const responseSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "score",
      "assessment",
      "strengths",
      "weaknesses",
      "correctAccountingLogic",
      "strongerAnswer",
      "coaching"
    ],
    properties: {
      score: {
        type: "number"
      },
      assessment: {
        type: "string",
        enum: ["Excellent", "Good", "Moderate", "Weak"]
      },
      strengths: {
        type: "array",
        items: { type: "string" }
      },
      weaknesses: {
        type: "array",
        items: { type: "string" }
      },
      correctAccountingLogic: {
        type: "string"
      },
      strongerAnswer: {
        type: "string"
      },
      coaching: {
        type: "string"
      }
    }
  };

  try {
    const apiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "accounting_quiz_feedback",
            strict: true,
            schema: responseSchema
          }
        }
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return json(apiResponse.status, {
        error: data.error?.message || "OpenAI scoring request failed."
      });
    }

    const outputText = getResponseText(data);

    if (!outputText) {
      return json(502, { error: "The scoring model returned an empty response." });
    }

    return json(200, JSON.parse(outputText));
  } catch (error) {
    return json(500, {
      error: error.message || "Unexpected scoring error."
    });
  }
};
