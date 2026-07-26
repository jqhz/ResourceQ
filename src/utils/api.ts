export const jsonError = (message: string, status = 400) =>
  Response.json({ error: message }, { status });

export const readResponseError = async (
  response: Response,
  fallback: string,
) => {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error?.trim() || fallback;
  } catch {
    return fallback;
  }
};

export const parseCardBody = async (request: Request) => {
  const body = (await request.json()) as { card?: unknown };
  if (!body.card) return { error: jsonError("Missing card payload.") };
  return { card: body.card };
};
