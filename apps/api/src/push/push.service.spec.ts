import { afterEach, describe, expect, it, vi } from 'vitest';
import { PushService } from './push.service.js';

const order = { orderId: 12, name: 'Priya', deliveryDate: '2026-11-07', itemCount: 3, totalPaise: 45000 };

function setup(tokens: string[], tickets: unknown[]) {
  const rows = tokens.map((token, i) => ({ token, channelId: i === 0 ? 'orders' : 'new-orders' }));
  const repo = { find: vi.fn().mockResolvedValue(rows), delete: vi.fn() };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: tickets }) });
  vi.stubGlobal('fetch', fetchMock);
  return { service: new PushService(repo as never), repo, fetchMock };
}

describe('PushService.newWebOrder', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends one message per phone, to that phone's channel, with the order id for the tap", async () => {
    const { service, fetchMock } = setup(
      ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
      [{ status: 'ok' }, { status: 'ok' }],
    );
    await service.newWebOrder(order);
    const messages = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      to: 'ExponentPushToken[a]',
      title: 'New order request #12',
      body: 'Priya · Sat, 7 Nov · 3 items · ₹450',
      data: { orderId: 12 },
      channelId: 'orders',
    });
    // A 1.2.0 phone registered the channel with the custom order sound.
    expect(messages[1]).toMatchObject({ to: 'ExponentPushToken[b]', channelId: 'new-orders' });
  });

  it('forgets phones that uninstalled the app', async () => {
    const { service, repo } = setup(
      ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
      [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }],
    );
    await service.newWebOrder(order);
    expect(repo.delete).toHaveBeenCalledWith({ token: expect.objectContaining({ _value: ['ExponentPushToken[b]'] }) });
  });

  it('does nothing without registered phones, and never throws', async () => {
    const { service, fetchMock } = setup([], []);
    await service.newWebOrder(order);
    expect(fetchMock).not.toHaveBeenCalled();

    const withPhone = setup(['ExponentPushToken[a]'], []);
    withPhone.fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(withPhone.service.newWebOrder(order)).resolves.toBeUndefined();
  });
});
