import { z } from "zod";

export const appointmentRequest = z.object({
  patientFirstName: z.string().trim().min(1).max(80),
  appointmentType: z.enum(["routine", "follow-up", "urgent"]),
  scheduledAt: z.string().datetime({ offset: true }),
  symptoms: z.array(z.string().trim().min(1).max(160)).min(1).max(12)
}).strict();

export type AppointmentRequest = z.infer<typeof appointmentRequest>;

const emergencySignals = [
  "chest pain",
  "difficulty breathing",
  "severe bleeding",
  "unconscious",
  "stroke"
] as const;

export type SafetyDecision = {
  urgency: "emergency" | "scheduled";
  operationalNotice: string;
};

export function decideSafetyNotice(input: AppointmentRequest): SafetyDecision {
  const symptomText = input.symptoms.join(" ").toLowerCase();
  const emergency = emergencySignals.some((signal) => symptomText.includes(signal));

  if (emergency) {
    return {
      urgency: "emergency",
      operationalNotice: "Do not wait for this appointment. Contact local emergency services now."
    };
  }

  return {
    urgency: "scheduled",
    operationalNotice: `Appointment queued for ${input.scheduledAt}. Contact the clinic if symptoms worsen.`
  };
}

export function buildModelPrompt(input: AppointmentRequest, decision: SafetyDecision): string {
  return [
    "Write a concise appointment status update for a healthtech UI.",
    "Do not diagnose, recommend medication, or alter the operational notice.",
    `Patient first name: ${input.patientFirstName}`,
    `Appointment type: ${input.appointmentType}`,
    `Scheduled at: ${input.scheduledAt}`,
    `Reported symptoms: ${input.symptoms.join(", ")}`,
    `Required operational notice: ${decision.operationalNotice}`
  ].join("\n");
}
