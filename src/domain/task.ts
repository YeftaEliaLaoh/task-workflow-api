import { TaskState } from './taskStateMachine'

export class Task {
  constructor(
    public taskId: string,
    public tenantId: string,
    public workspaceId: string,
    public title: string,
    public priority: 'LOW' | 'MEDIUM' | 'HIGH',
    public state: TaskState,
    public assigneeId: string | null,
    public version: number
  ) {}
}
