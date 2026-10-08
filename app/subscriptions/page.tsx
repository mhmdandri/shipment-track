import SubscriptionClient from "@/features/subscriptions/SubscriptionClient";
import {
  SubscriptionWithCount,
  getAllSubscriptionsWithCount,
} from "@/service/subscription-service";

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
      <SubscriptionClient initialSubscriptions={subscriptionsWithCount} />
    </div>
  );
}
