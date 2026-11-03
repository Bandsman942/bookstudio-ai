/** Contracts only: never import DTSC Platform runtime or credentials. */
export type ExternalServiceStatus = 'READY' | 'DEGRADED' | 'DISABLED';
export interface IdentityFederationPort {
  validateIdentityAssertion(token: string): Promise<{issuer: string; subject: string; emailVerified: boolean} | null>;
}
export interface EntitlementsPort {
  getCapabilities(subjectId: string): Promise<{capabilities: string[]; expiresAt: string}>;
}
export interface PaymentsPort {
  createCheckout(input: {userId:string; productCode:string; idempotencyKey:string}): Promise<{redirectUrl:string}>;
}
export interface NotificationsPort {
  notify(input: {subjectId:string; kind:string; payload:Record<string,unknown>}): Promise<void>;
}
export interface AiPort {
  suggest(input: {subjectId:string; projectId:string; revisionId:string; excerpt:string; instructions:string; consentId:string}): Promise<{suggestion:string; provider:string; model:string; costUsd:number}>;
}
