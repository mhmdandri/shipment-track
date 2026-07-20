import {
  Reminder,
  Shipment,
  ShipmentTask,
  ActivityLog,
  Todo,
} from "@/app/generated/prisma/client";

export type ShipmentWithRelations = Shipment & {
  tasks: ShipmentTask[];
  reminders: Reminder[];
  activityLogs: ActivityLog[];
  todos: Todo[];
};

export type ShipmentWithTasks = Shipment & {
  tasks: ShipmentTask[];
};

export interface DashboardStats {
  totalActive: number;
  needActionToday: number;
  overdueReminders: number;
  etaThisWeek: number;
}

export interface ActionBoardData {
  overdue: (Reminder & { shipment: Shipment })[];
  today: (Reminder & { shipment: Shipment })[];
  upcoming: (Reminder & { shipment: Shipment })[];
}

export type ActionResponse<T = void> = 
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };
