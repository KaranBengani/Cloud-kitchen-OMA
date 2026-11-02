import { normalizePhone } from './customer.dto.js';

describe('normalizePhone', () => {
  it.each([
    ['9830460199', '919830460199'],
    ['98304 60199', '919830460199'],
    ['+91-98304-60199', '919830460199'],
    ['09830460199', '919830460199'],
    ['', null],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});
