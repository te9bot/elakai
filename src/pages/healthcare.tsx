import { Stethoscope } from 'lucide-react'
import { CategoryBrowser } from '@/components/category-browser'
import { CategoryTile } from '@/components/cards/category-tile'
import { PageHeader } from '@/components/layout/page-header'
import { Section } from '@/components/layout/section'
import { HEALTHCARE_IDS } from '@/data/categories'
import { useI18n } from '@/lib/i18n'

export default function HealthcarePage() {
  const { t } = useI18n()

  return (
    <>
      <PageHeader
        icon={<Stethoscope className="size-7" aria-hidden="true" />}
        title={t('health.title')}
        description={t('health.sub')}
      />

      <Section>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {HEALTHCARE_IDS.map((id) => (
            <CategoryTile key={id} id={id} />
          ))}
        </div>

        <CategoryBrowser categoryIds={HEALTHCARE_IDS} />
      </Section>
    </>
  )
}
