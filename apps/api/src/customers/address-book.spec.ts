import { addressSnapshot } from './address-book.js';
import { addressKey } from './customer-address.entity.js';

describe('addressKey', () => {
  it('treats spacing, case and punctuation differences as the same address', () => {
    expect(addressKey('  B-402, Lotus Boulevard,  Noida. ')).toBe('b 402 lotus boulevard noida');
    expect(addressKey('b 402 lotus boulevard noida')).toBe(addressKey('B-402, LOTUS BOULEVARD, Noida'));
  });

  it('keeps Hindi letters', () => {
    expect(addressKey('मकान 12, सॉल्ट लेक')).not.toBe('12');
  });
});

describe('addressSnapshot', () => {
  it('adds who receives it when the order is for someone else', () => {
    expect(addressSnapshot({ address: ' 12 Park Street ' })).toBe('12 Park Street');
    expect(addressSnapshot({ address: '12 Park Street', recipientName: 'Riya', recipientPhone: '919876543210' })).toBe(
      '12 Park Street\nDeliver to: Riya, +919876543210',
    );
  });
});
