import { randomUUID } from 'node:crypto'

export function invitationAudit(
  actorSubject: string,
  organizationId: string,
  targetId: string,
  action: string,
  outcome: string,
  afterState?: { role: string; applicationKeys: string[] },
) {
  return {
    action,
    actorSubject,
    correlationId: randomUUID(),
    organizationId,
    outcome,
    targetId,
    targetType: 'member_invitation',
    ...(afterState ? { afterState } : {}),
  }
}
