import { BadRequestException } from '@nestjs/common';
import { normalizeMacAddress } from './mac-address.util';

describe('normalizeMacAddress', () => {
  it.each([
    ['aa:bb:cc:dd:ee:ff', 'AA:BB:CC:DD:EE:FF'],
    ['aa-bb-cc-dd-ee-ff', 'AA:BB:CC:DD:EE:FF'],
    ['aabbccddeeff', 'AA:BB:CC:DD:EE:FF'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeMacAddress(input)).toBe(expected);
  });

  it('rejects an invalid address', () => {
    expect(() => normalizeMacAddress('not-a-mac')).toThrow(BadRequestException);
  });
});
