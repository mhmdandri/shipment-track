export const WORKFLOW_STEPS = [
  "Shipment Received",
  "Check ETA & Port",
  "Draft PIB",
  "Input Internal System",
  "Waiting ETA",
  "Request Invoice DO",
  "Payment Finance",
  "Request DO",
  "Confirm Draft PIB",
  "BC 1.1 Available",
  "Create Billing",
  "Customer Payment",
  "SPPB Released",
  "DO Released",
  "Container Position Available",
  "Booking Trucking",
  "Delivered",
] as const;

export const REMINDER_TEMPLATES = [
  { daysBeforeEta: 7, title: "Check Draft PIB", priority: "MEDIUM" as const },
  { daysBeforeEta: 3, title: "Request Invoice DO", priority: "HIGH" as const },
  { daysBeforeEta: 2, title: "Payment Finance", priority: "HIGH" as const },
  { daysBeforeEta: 1, title: "Confirm Draft PIB", priority: "URGENT" as const },
  { daysBeforeEta: 0, title: "Monitor BC 1.1", priority: "URGENT" as const },
];
