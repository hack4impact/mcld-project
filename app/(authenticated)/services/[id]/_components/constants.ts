export const STATUS_VARIANT: Record<
   string,
   "success" | "warning" | "info" | "destructive" | "secondary"
> = {
   confirmed: "success",
   pending: "warning",
   awaiting_payment: "info",
   cancelled: "destructive",
};

export const GENDER_LABELS: Record<string, string> = {
   male: "Male",
   female: "Female",
   prefer_not_to_say: "Prefer not to say",
};
