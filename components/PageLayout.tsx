'use client'

import React from 'react'

export type PageLayoutMainPadding = 'compact' | 'normal'

interface PageLayoutProps {
  /** Paginatitel in de header */
  title: string
  /** Optionele subtitle/extra content onder de titel (bijv. lastUpdate, status) */
  headerSubtitle?: React.ReactNode
  /** Optionele custom header content (overschrijft title/subtitle als beide aanwezig) */
  headerContent?: React.ReactNode
  /** Toon terug-knop links van de titel */
  showBackButton?: boolean
  /** Callback bij klik op terug */
  onBack?: () => void
  /** main padding: compact (pt-6 pb-4) voor lijsten, normal (pt-10 pb-8) voor formulieren */
  mainPadding?: PageLayoutMainPadding
  /** Ref voor de main (scroll container, bijv. voor PullToRefresh) */
  mainRef?: React.RefObject<HTMLDivElement | null>
  /** data-pwa-main waarde voor de main */
  dataPwaMain?: string
  /** Extra classNames voor de main */
  mainClassName?: string
  /** Content na de main, binnen de page wrapper (bijv. FloatingAddButton, modals) */
  afterMain?: React.ReactNode
  children: React.ReactNode
}

export default function PageLayout({
  title,
  headerSubtitle,
  headerContent,
  showBackButton = false,
  onBack,
  mainPadding = 'normal',
  mainRef,
  dataPwaMain = 'default',
  mainClassName = '',
  afterMain,
  children,
}: PageLayoutProps) {
  const mainPaddingClasses =
    mainPadding === 'compact'
      ? 'pb-4 sm:pb-4'
      : 'pb-8 sm:pb-8'

  return (
    <div className="relative flex min-h-screen flex-col pb-20">
      <div className="fixed inset-0 z-0 min-h-screen bg-[#2563eb]" aria-hidden />
      <div
        className="fixed inset-0 z-0 min-h-screen"
        style={{
          background:
            'linear-gradient(180deg, rgba(249, 250, 251, 0) 0%, rgba(249, 250, 251, 1) 40%)',
        }}
        aria-hidden
      />
      <header className="relative z-10 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="relative z-10 flex h-[104px] flex-col justify-start">
          <div className="mx-auto flex w-full max-w-2xl items-start gap-4 px-4 pt-8 sm:px-6 lg:px-8">
            {showBackButton && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 text-white/90 hover:text-white"
                aria-label="Terug"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              {headerContent ?? (
                <>
                  <h1 className="text-3xl font-bold text-white">{title}</h1>
                  {headerSubtitle && (
                    <div className="h-5 pt-0 mt-1 align-middle text-sm text-white/80">
                      {headerSubtitle}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main
        ref={mainRef as React.RefObject<HTMLElement | null>}
        data-pwa-main={dataPwaMain}
        className={`relative z-10 mx-auto w-full max-w-2xl flex-1 pt-4 px-4 sm:px-6 lg:px-8 ${mainPaddingClasses} ${mainClassName}`}
      >
        {children}
      </main>
      {afterMain}
    </div>
  )
}
