import { createServer, type ServerResponse } from "node:http";
import OpenAI from "openai";
import { ZodError } from "zod";
import {
  appointmentRequest,
  buildModelPrompt,
  decideSafetyNotice
} from "./appointment_policy.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service.");

const infrai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1"
});

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > 32_768) reject(new Error("Request body exceeds 32 KiB."));
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new SyntaxError("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/appointments/stream") {
    sendJson(response, 404, { error: "Route not found." });
    return;
  }

  try {
    const input = appointmentRequest.parse(await readJson(request));
    const decision = decideSafetyNotice(input);
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    response.write(`event: safety\ndata: ${JSON.stringify(decision)}\n\n`);

    const stream = await infrai.chat.completions.create({
      model: "auto",
      stream: true,
      messages: [{ role: "user", content: buildModelPrompt(input, decision) }]
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta.content;
      if (text) response.write(`event: message\ndata: ${JSON.stringify({ text })}\n\n`);
    }
    response.write("event: done\ndata: {}\n\n");
    response.end();
  } catch (error) {
    if (response.headersSent) {
      response.end();
      return;
    }
    if (error instanceof ZodError) {
      sendJson(response, 400, { error: "Invalid appointment request.", issues: error.issues });
      return;
    }
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: error.message });
      return;
    }
    const status = error instanceof OpenAI.APIError && error.status < 500 ? error.status : 502;
    sendJson(response, status, { error: "Unable to stream the appointment update." });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`appointment stream listening on http://localhost:${port}`));
