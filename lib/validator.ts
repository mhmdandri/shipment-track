import { z } from "zod";

export const shipmentSchema = z
  .object({
    jobNo: z.string().min(3, "Job Number is required"),
    blNo: z.string().min(3, "BL Number is required"),
    consignee: z.string().min(2, "Consignee is required"),
    shipper: z.string().min(2, "Shipper is required"),
    vessel: z.string().min(2, "Vessel is required"),
    portOfLoading: z.string().min(2, "Port of Loading is required"),
    portOfDischarge: z.string().min(2, "Port of Discharge is required"),
    etd: z.date({
      required_error: "ETD is required",
    }),
    eta: z.date({
      required_error: "ETA is required",
    }),
  })
  .refine((data) => data.eta >= data.etd, {
    message: "ETA cannot be earlier than ETD",
    path: ["eta"],
  });

export type ShipmentFormValues = z.infer<typeof shipmentSchema>;
