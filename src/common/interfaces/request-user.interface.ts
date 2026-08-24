import { ActorType, AdminRole } from '@prisma/client';

export interface RequestUser {
  id: string;
  actorType: ActorType;
  sessionId: string;
  sessionVersion: number;
  role?: AdminRole;
  email?: string;
  login?: string;
}
