import { mainMenuItems } from '../components/nav/navItems'
import { PageHeader } from '../components/ui'
import { MenuGrid } from '../features/menu/MenuGrid'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSession } from '../hooks/useSession'
import { AppShell } from '../layouts/AppShell'

/** SCREEN-02 COMEN01 — main menu for regular users (STORY-004). */
export function MainMenuPage() {
  useDocumentTitle('Main Menu')
  const { session } = useSession()

  return (
    <AppShell>
      <PageHeader
        screen="COMEN01"
        eyebrow="Main Menu"
        title={session ? `Welcome back, ${session.userId}` : 'Welcome back'}
        description="Choose a function. All ten options are available to regular users."
      />
      <MenuGrid items={mainMenuItems} />
    </AppShell>
  )
}

export default MainMenuPage
