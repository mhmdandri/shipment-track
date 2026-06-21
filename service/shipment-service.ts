import { subDays, startOfDay } from "date-fns";
import { ShipmentRepository } from "@/repositories/shipment-repository";
import { ShipmentFormValues } from "@/lib/validator";
import { REMINDER_TEMPLATES, WORKFLOW_STEPS } from "@/lib/workflow";
import { ShipmentStatus } from "@/app/generated/prisma/enums";

function getMatchingTaskTitle(reminderTitle: string): string | null {
  if (reminderTitle === "Check Draft PIB") return "Draft PIB";
  if (reminderTitle === "Monitor BC 1.1") return "BC 1.1 Available";
  return reminderTitle; // For exact matches
}

function getMatchingReminderTitle(taskTitle: string): string | null {
  if (taskTitle === "Draft PIB") return "Check Draft PIB";
  if (taskTitle === "BC 1.1 Available") return "Monitor BC 1.1";
  if (
    taskTitle === "Request Invoice DO" ||
    taskTitle === "Payment Finance" ||
    taskTitle === "Confirm Draft PIB"
  ) {
    return taskTitle;
  }
  return null;
}

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
