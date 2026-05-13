import { USERS_SUBSCRIPTION_STATUS_ACTIVE } from "./subscription-constants";

export const USER_SUBSCRIPTION_VIEW_TABS = [
   { value: "all", label: "All Users" },
   {
      value: "active",
      label: "Active",
      subscriptionStatus: USERS_SUBSCRIPTION_STATUS_ACTIVE,
   },
   { value: "inactive", label: "Inactive" },
] as const;

export type UserSubscriptionViewTab =
   (typeof USER_SUBSCRIPTION_VIEW_TABS)[number]["value"];
