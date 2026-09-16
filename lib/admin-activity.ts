export const ADMIN_ACTIVITY_ACTIONS = [
  "product.duplicate",
  "product.archive",
  "product.activate",
  "product.deactivate",
  "product.feature",
  "product.unfeature",
  "product.category_change",
] as const;

export type AdminActivityAction = (typeof ADMIN_ACTIVITY_ACTIONS)[number];

export interface AdminActivityRow {
  id: number;
  occurred_at: string;
  actor_id: string;
  action: AdminActivityAction;
  target_ids: string[];
  metadata: Record<string, unknown> | null;
}

const ACTION_LABELS: Record<AdminActivityAction, string> = {
  "product.duplicate": "Product duplicated",
  "product.archive": "Product archived",
  "product.activate": "Products activated",
  "product.deactivate": "Products deactivated",
  "product.feature": "Featured products updated",
  "product.unfeature": "Featured products updated",
  "product.category_change": "Product categories changed",
};

export function isAdminActivityAction(value: string): value is AdminActivityAction {
  return (ADMIN_ACTIVITY_ACTIONS as readonly string[]).includes(value);
}

export function adminActivityLabel(action: AdminActivityAction): string {
  return ACTION_LABELS[action];
}

function safeMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.length <= 500 ? value : null;
}

export function describeAdminActivity(activity: AdminActivityRow): string {
  const count = activity.target_ids.length;
  const products = `${count} product${count === 1 ? "" : "s"}`;

  switch (activity.action) {
    case "product.duplicate": {
      const slug = safeMetadataString(activity.metadata, "new_slug");
      return slug ? `Created archived draft “${slug}”` : "Created an archived draft";
    }
    case "product.archive":
      return `Archived ${products}`;
    case "product.activate":
      return `Activated ${products}`;
    case "product.deactivate":
      return `Deactivated ${products}`;
    case "product.feature":
      return `Added ${products} to the featured set`;
    case "product.unfeature":
      return `Removed ${products} from the featured set`;
    case "product.category_change":
      return `Changed the category for ${products}`;
  }
}

export function formatAdminActivityTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function abbreviatedActor(actorId: string): string {
  return actorId.length >= 8 ? `Admin ${actorId.slice(0, 8)}` : "Admin";
}
