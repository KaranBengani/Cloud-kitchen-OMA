import { ComingSoon } from '@/components/coming-soon';
import { useI18n } from '@/lib/i18n';

export default function Screen() {
  const { t } = useI18n();
  return <ComingSoon title={t('tabs.newOrder')} />;
}
