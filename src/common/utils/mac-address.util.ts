import { BadRequestException } from '@nestjs/common';

const RAW_MAC_PATTERN = /^[0-9a-fA-F]{12}$/;

export function normalizeMacAddress(value: string): string {
  const raw = value.replace(/[:-]/g, '');
  if (!RAW_MAC_PATTERN.test(raw)) {
    throw new BadRequestException('Некорректный MAC-адрес');
  }
  return raw.toUpperCase().match(/.{2}/g)!.join(':');
}
