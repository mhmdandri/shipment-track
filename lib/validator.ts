import { z } from "zod";

export const shipmentSchema = z
  .object({
    type: z.enum(["IMPORT", "EXPORT"]),
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
    openCy: z.date().optional().nullable(),
    closeSi: z.date().optional().nullable(),
    closeCy: z.date().optional().nullable(),
    etb: z.date().optional().nullable(),
  })
  .refine((data) => data.eta >= data.etd, {
    message: "ETA cannot be earlier than ETD",
    path: ["eta"],
  });

export type ShipmentFormValues = z.infer<typeof shipmentSchema>;

export const updateShipmentDatesSchema = z.object({
  eta: z.union([z.coerce.date(), z.string()]).optional().nullable(),
  etd: z.union([z.coerce.date(), z.string()]).optional().nullable(),
  openCy: z.union([z.coerce.date(), z.string()]).optional().nullable(),
  closeSi: z.union([z.coerce.date(), z.string()]).optional().nullable(),
  closeCy: z.union([z.coerce.date(), z.string()]).optional().nullable(),
});

export type UpdateShipmentDatesValues = z.infer<typeof updateShipmentDatesSchema>;
