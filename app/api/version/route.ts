import { NextResponse } from 'next/server'

/**
 * Build-versie voor PWA update detectie.
 * Bij elke deploy verandert VERCEL_GIT_COMMIT_SHA.
 */
export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.BUILD_ID ||
    'dev'
  return NextResponse.json(
    { version },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
