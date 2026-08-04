import SubscriptionClient from "@/features/subscriptions/SubscriptionClient";
import { CreditCard } from "lucide-react";
import {
  SubscriptionWithCount,
  getAllSubscriptionsWithCount,
} from "@/actions/subscription-action";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  let subscriptionsWithCount: SubscriptionWithCount[] = [];

  try {
    subscriptionsWithCount = await getAllSubscriptionsWithCount();
  } catch (error) {
    console.error("Error loading SubscriptionsPage data:", error);
  }

  return (
    <div className="space-y-6 p-4 pt-16 lg:pt-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          WAHA Bot Subscriptions
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Manage client access controls, subscription tiers, and active container limits for WhatsApp bot commands.
        </p>
      </div>

      <SubscriptionClient initialSubscriptions={subscriptionsWithCount} />
    </div>
  );
}
