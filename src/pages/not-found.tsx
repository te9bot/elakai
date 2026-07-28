import { Link } from 'react-router-dom'
import { Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/feedback'
import { useI18n } from '@/lib/i18n'

export default function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className="container py-16">
      <EmptyState
        icon={<Search className="size-6" />}
        titleAs="h1"
        title={t('state.notFound')}
        description={t('state.notFoundSub')}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/">
                <Home />
                {t('biz.backHome')}
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/search">
                <Search />
                {t('nav.search')}
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}
