import { Wrench } from 'lucide-react'
import { CategoryBrowser } from '@/components/category-browser'
import { CategoryTile } from '@/components/cards/category-tile'
import { PageHeader } from '@/components/layout/page-header'
import { Section } from '@/components/layout/section'
import { SERVICE_IDS } from '@/data/categories'
import { useI18n } from '@/lib/i18n'

export default function ServicesPage() {
  const { t } = useI18n()

  return (
    <>
      <PageHeader
        icon={<Wrench className="size-7" aria-hidden="true" />}
        title={t('services.title')}
        description={t('services.sub')}
      />

      <Section>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {SERVICE_IDS.map((id) => (
            <CategoryTile key={id} id={id} />
          ))}
        </div>

        <CategoryBrowser categoryIds={SERVICE_IDS} />
      </Section>
    </>
  )
}
