import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

export async function hashPassword(password: string, config: ConfigService): Promise<string> {
  return bcrypt.hash(password, config.getOrThrow<number>('BCRYPT_ROUNDS'));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
