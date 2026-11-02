import { Redirect } from 'expo-router';

// The centre tab button pushes /order/form directly; this route only exists so the tab has a slot.
export default function NewOrderTab() {
  return <Redirect href="/order/form" />;
}
