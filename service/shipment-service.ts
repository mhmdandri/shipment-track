import { subDays, startOfDay } from "date-fns";
import { ShipmentRepository } from "@/repositories/shipment-repository";
import { ShipmentFormValues } from "@/lib/validator";
import { REMINDER_TEMPLATES, WORKFLOW_STEPS } from "@/lib/workflow";
import { ShipmentStatus } from "@/app/generated/prisma/enums";

export class ShipmentService {
  constructor(private repo: ShipmentRepository) { }

  async createShipment(values: ShipmentFormValues) {
    const tasks = WORKFLOW_STEPS.map((step, index) => ({
      title: step,
      stepOrder: index,
      completed: false,
    }));

    const reminders = REMINDER_TEMPLATES.map((template) => ({
      title: template.title,
      priority: template.priority,
      dueDate: startOfDay(
        subDays(new Date(values.eta), template.daysBeforeEta),
      ),
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
      currentStep: 0,
      nextAction: WORKFLOW_STEPS[1] || "None",
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
    let nextAction: string = WORKFLOW_STEPS[1] || "None";
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
