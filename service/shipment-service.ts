import { subDays, startOfDay } from "date-fns";
import { ShipmentRepository } from "@/repositories/shipment-repository";
import { ShipmentFormValues, UpdateShipmentDatesValues } from "@/lib/validator";
import { IMPORT_REMINDER_TEMPLATES, EXPORT_REMINDER_TEMPLATES, IMPORT_WORKFLOW_STEPS, EXPORT_WORKFLOW_STEPS } from "@/lib/workflow";
import { ShipmentStatus, Prisma } from "@/app/generated/prisma/client";

function getMatchingTaskTitle(reminderTitle: string): string | null {
  const map: Record<string, string> = {
    "Check Draft PIB": "Draft PIB",
    "Request Invoice DO": "Request Invoice DO",
    "Payment Finance": "Payment Finance",
    "Confirm Draft PIB": "Confirm Draft PIB",
    "Monitor BC 1.1": "BC 1.1 Available",
    "Monitor Cargo Readiness": "Check Cargo Readiness for Stuffing",
    "Request Trucking & Stuffing": "Request Trucking",
    "Customs Clearance (PEB)": "Customs Clearance (PEB)",
    "Monitor Container Gate In": "Container Gate In (CY)",
    "Vessel Departure (ETD)": "Vessel Departure (ETD)",
  };
  return map[reminderTitle] || null;
}

function getMatchingReminderTitle(taskTitle: string): string | null {
  const map: Record<string, string> = {
    "Draft PIB": "Check Draft PIB",
    "Request Invoice DO": "Request Invoice DO",
    "Payment Finance": "Payment Finance",
    "Confirm Draft PIB": "Confirm Draft PIB",
    "BC 1.1 Available": "Monitor BC 1.1",
    "Check Cargo Readiness for Stuffing": "Monitor Cargo Readiness",
    "Request Trucking": "Request Trucking & Stuffing",
    "Customs Clearance (PEB)": "Customs Clearance (PEB)",
    "Container Gate In (CY)": "Monitor Container Gate In",
    "Vessel Departure (ETD)": "Vessel Departure (ETD)",
  };
  return map[taskTitle] || null;
}

export class ShipmentService {
  constructor(private repo: ShipmentRepository) { }

  async updateShipmentDates(id: string, values: UpdateShipmentDatesValues) {
    const data: Prisma.ShipmentUpdateInput = {};
    if (values.eta) data.eta = new Date(values.eta);
    if (values.etd) data.etd = new Date(values.etd);
    if (values.openCy !== undefined) data.openCy = values.openCy ? new Date(values.openCy) : null;
    if (values.closeSi !== undefined) data.closeSi = values.closeSi ? new Date(values.closeSi) : null;
    if (values.closeCy !== undefined) data.closeCy = values.closeCy ? new Date(values.closeCy) : null;

    const shipment = await this.repo.updateShipment(id, data);
    await this.repo.createActivityLog(id, "Shipment schedules have been manually updated.");
    return shipment;
  }

  async createShipment(values: ShipmentFormValues) {
    const isExport = values.type === "EXPORT";
    const workflowSteps = isExport ? EXPORT_WORKFLOW_STEPS : IMPORT_WORKFLOW_STEPS;

    const tasks = workflowSteps.map((step, index) => ({
      title: step,
      stepOrder: index,
      completed: false,
    }));

    const reminderTemplates = isExport ? EXPORT_REMINDER_TEMPLATES : IMPORT_REMINDER_TEMPLATES;
    const baseDate = isExport ? (values.openCy ? new Date(values.openCy) : new Date(values.etd)) : new Date(values.eta);

    const reminders = reminderTemplates.map((template) => ({
      title: template.title,
      priority: template.priority,
      dueDate: startOfDay(subDays(baseDate, template.daysBeforeEta)),
      completed: false,
    }));

    const shipment = await this.repo.create({
      jobNo: values.jobNo,
      blNo: values.blNo,
      consignee: values.consignee,
      shipper: values.shipper,
      vessel: values.vessel,
      portOfLoading: values.portOfLoading,
      portOfDischarge: values.portOfDischarge,
      eta: new Date(values.eta),
      etd: new Date(values.etd),
      etb: values.etb ? new Date(values.etb) : null,
      openCy: values.openCy ? new Date(values.openCy) : null,
      closeSi: values.closeSi ? new Date(values.closeSi) : null,
      closeCy: values.closeCy ? new Date(values.closeCy) : null,
      type: values.type,
      currentStep: 0,
      nextAction: workflowSteps[1] || "None",
      status: ShipmentStatus.ACTIVE,
      tasks: { create: tasks },
      reminders: { create: reminders },
    });

    await this.repo.createActivityLog(shipment.id, "Pipeline initialized for job file.");
    return shipment;
  }

  async toggleTaskProgress(
    taskId: string,
    shipmentId: string,
    completed: boolean,
    notes?: string,
    skipReminderUpdate = false,
  ) {
    const completedAt = completed ? new Date() : null;
    await this.repo.updateTask(taskId, completed, completedAt, notes);

    const shipment = await this.repo.findById(shipmentId);
    if (!shipment) throw new Error("Shipment parameters not matched.");

    const task = shipment.tasks.find((t) => t.id === taskId);
    if (task) {
      const logMessage = `Step '${task.title}' marked as ${completed ? "completed" : "incomplete"}.`;
      await this.repo.createActivityLog(shipmentId, logMessage);
    }

    const sortedTasks = shipment.tasks.sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );
    let lastCompletedIndex = -1;

    for (let i = 0; i < sortedTasks.length; i++) {
      if (sortedTasks[i].completed) {
        lastCompletedIndex = i;
      }
    }

    let currentStep = 0;
    const workflowSteps = shipment.type === "EXPORT" ? EXPORT_WORKFLOW_STEPS : IMPORT_WORKFLOW_STEPS;
    let nextAction: string = workflowSteps[1] || "None";
    let status: ShipmentStatus = ShipmentStatus.ACTIVE;

    if (lastCompletedIndex !== -1) {
      currentStep = lastCompletedIndex;
      if (lastCompletedIndex === sortedTasks.length - 1) {
        nextAction = "Archive Complete";
        status = ShipmentStatus.COMPLETED;
      } else {
        nextAction = sortedTasks[lastCompletedIndex + 1].title;
      }
    }

    await this.repo.updateStep(shipmentId, currentStep, nextAction, status);

    if (status === ShipmentStatus.COMPLETED) {
      await this.repo.createActivityLog(shipmentId, "Shipment file fully completed and archived.");
    }

    // Sync to reminder if not skipped
    if (!skipReminderUpdate && task) {
      const reminderTitle = getMatchingReminderTitle(task.title);
      if (reminderTitle) {
        const reminder = await this.repo.findReminderByTitle(shipmentId, reminderTitle);
        if (reminder && reminder.completed !== completed) {
          await this.repo.updateReminder(reminder.id, completed);
        }
      }
    }
  }

  async toggleReminderProgress(reminderId: string, completed: boolean) {
    await this.repo.updateReminder(reminderId, completed);

    const reminder = await this.repo.findReminderById(reminderId);
    if (!reminder) return;

    const taskTitle = getMatchingTaskTitle(reminder.title);
    if (taskTitle) {
      const task = await this.repo.findTaskByTitle(reminder.shipmentId, taskTitle);
      if (task && task.completed !== completed) {
        await this.toggleTaskProgress(task.id, reminder.shipmentId, completed, undefined, true);
      }
    }
  }

  async updateTaskNote(taskId: string, shipmentId: string, notes: string) {
    const shipment = await this.repo.findById(shipmentId);
    if (!shipment) throw new Error("Shipment not found");

    const task = shipment.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");

    await this.repo.updateTask(taskId, task.completed, task.completedAt, notes);

    const logMessage = `Updated note on step '${task.title}': "${notes}"`;
    await this.repo.createActivityLog(shipmentId, logMessage);
  }
}
