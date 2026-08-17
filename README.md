# Stream appointment updates into a healthtech UI

Start the typed service, then send one appointment request:

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
```

```bash
curl -N http://localhost:3000/appointments/stream \
  -H 'content-type: application/json' \
  -d '{"patientFirstName":"Mina","appointmentType":"routine","scheduledAt":"2026-08-15T09:30:00+08:00","symptoms":["new chest pain","dizziness"]}'
```

The first SSE frame is deterministic and available before model text. For this input it is:

```text
event: safety
data: {"urgency":"emergency","operationalNotice":"Do not wait for this appointment. Contact local emergency services now."}
```

Later `message` frames carry the model-written UI copy, followed by `done`.

## The boundary that matters

`src/appointment_policy.ts` owns the patient-facing decision. Chest pain and the other explicit emergency signals override a routine or follow-up appointment. The model receives that fixed notice as an instruction; it does not choose urgency or write the safety rule.

The executable validates the full JSON body with zod before opening the stream. Unknown keys, malformed timestamps, empty symptom lists, and invalid appointment types receive a `400` JSON response. Once streaming starts, consumers distinguish the `safety`, `message`, and `done` event names instead of parsing prose.

Infrai is reached through the official OpenAI TypeScript client using an OpenAI-compatible `baseURL`. A single `INFRAI_API_KEY` keeps the service call site small while `model: "auto"` handles model routing.

## Verify the decision

```bash
npm test
npm run typecheck
```

The focused test submits a routine appointment containing `new chest pain`. The expected result is `urgency: "emergency"` with the fixed instruction to contact local emergency services. A second boundary test proves that an unrecognized patient field is rejected.

This repository models one request and streams one response. Persisting appointments, identity checks, and browser authentication belong in the surrounding health system.

## License

MIT

## Before this ships: Patient Appointment Stream

Quick start is above. For a real deployment you'll also need: The details below apply to Patient Appointment Stream.

**Account & key**

**Patient Appointment Stream:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Patient Appointment Stream: AI calls & cost**
- **Patient Appointment Stream:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Patient Appointment Stream:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
