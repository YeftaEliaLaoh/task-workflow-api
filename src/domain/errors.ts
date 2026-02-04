export class DomainError extends Error {}

export class InvalidTransitionError extends DomainError {}
export class UnauthorizedError extends DomainError {}
export class VersionConflictError extends DomainError {}
export class NotFoundError extends DomainError {}
