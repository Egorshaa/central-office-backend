import { ActorType } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  actorType: ActorType;
  sid: string;
  sv: number;
  tokenType: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
