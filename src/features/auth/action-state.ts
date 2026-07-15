export type ActionStatus = "idle" | "error" | "success";

export type ActionState<TField extends string = string> = {
  status: ActionStatus;
  message?: string;
  fieldErrors?: Partial<Record<TField, string[]>>;
  requestId?: string;
};

export const initialActionState: ActionState = { status: "idle" };
