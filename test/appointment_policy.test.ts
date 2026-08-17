import assert from "node:assert/strict";
import test from "node:test";
import { appointmentRequest, decideSafetyNotice } from "../src/appointment_policy.js";

test("chest pain overrides a routine appointment with the emergency notice", () => {
  const request = appointmentRequest.parse({
    patientFirstName: "Mina",
    appointmentType: "routine",
    scheduledAt: "2026-08-15T09:30:00+08:00",
    symptoms: ["new chest pain", "dizziness"]
  });

  assert.deepEqual(decideSafetyNotice(request), {
    urgency: "emergency",
    operationalNotice: "Do not wait for this appointment. Contact local emergency services now."
  });
});

test("the request boundary rejects unexpected patient fields", () => {
  const result = appointmentRequest.safeParse({
    patientFirstName: "Mina",
    appointmentType: "follow-up",
    scheduledAt: "2026-08-15T09:30:00+08:00",
    symptoms: ["mild headache"],
    diagnosis: "migraine"
  });

  assert.equal(result.success, false);
});
