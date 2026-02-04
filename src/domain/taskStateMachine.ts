export type TaskState = 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

const transitions: Record<TaskState, TaskState[]> = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['DONE', 'CANCELLED'],
  DONE: [],
  CANCELLED: []
}

export function assertValidTransition(from: TaskState, to: TaskState) {
  if (!transitions[from].includes(to)) {
    throw new InvalidTransitionError(`Invalid transition ${from} -> ${to}`)
  }
}
