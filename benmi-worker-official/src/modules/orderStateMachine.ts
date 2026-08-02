export enum OrderStatus {
  NEW = "NEW",
  ACCEPTED = "ACCEPTED",
  DONE = "DONE",
  PICKED_UP = "PICKED_UP",
  WAITING_CUSTOMER_CHANGE = "WAITING_CUSTOMER_CHANGE",
  WAITING_CUSTOMER_REJECT = "WAITING_CUSTOMER_REJECT",
  REJECTED = "REJECTED"
}

/**
 * Transition State Matrix for Order Lifecycle.
 * Maps current status to allowed next statuses.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [
    OrderStatus.ACCEPTED,
    OrderStatus.WAITING_CUSTOMER_CHANGE,
    OrderStatus.WAITING_CUSTOMER_REJECT,
    OrderStatus.REJECTED
  ],
  [OrderStatus.WAITING_CUSTOMER_CHANGE]: [
    OrderStatus.ACCEPTED,
    OrderStatus.REJECTED
  ],
  [OrderStatus.WAITING_CUSTOMER_REJECT]: [
    OrderStatus.REJECTED,
    OrderStatus.NEW
  ],
  [OrderStatus.ACCEPTED]: [
    OrderStatus.ACCEPTED, // Idempotent re-acceptance
    OrderStatus.DONE,
    OrderStatus.REJECTED
  ],
  [OrderStatus.DONE]: [
    OrderStatus.DONE, // Idempotent
    OrderStatus.PICKED_UP
  ],
  [OrderStatus.PICKED_UP]: [
    OrderStatus.PICKED_UP // Final state (Idempotent)
  ],
  [OrderStatus.REJECTED]: [
    OrderStatus.REJECTED // Final state (Idempotent)
  ]
};

export interface TransitionResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether transitioning from currentStatus to targetStatus is allowed in the state machine.
 */
export function validateOrderTransition(currentStatus: string, targetStatus: string): TransitionResult {
  const current = currentStatus as OrderStatus;
  const target = targetStatus as OrderStatus;

  // Unknown state check
  if (!Object.values(OrderStatus).includes(current)) {
    return {
      valid: false,
      reason: `Trạng thái hiện tại '${currentStatus}' không hợp lệ trong hệ thống.`
    };
  }

  if (!Object.values(OrderStatus).includes(target)) {
    return {
      valid: false,
      reason: `Trạng thái đích '${targetStatus}' không hợp lệ trong hệ thống.`
    };
  }

  const allowedNextStates = ALLOWED_TRANSITIONS[current] || [];
  if (!allowedNextStates.includes(target)) {
    return {
      valid: false,
      reason: `Chuyển đổi trạng thái từ '${current}' sang '${target}' không được phép.`
    };
  }

  return { valid: true };
}
