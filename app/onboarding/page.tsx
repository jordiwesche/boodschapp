'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [firstName, setFirstName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [invitedEmails, setInvitedEmails] = useState<string[]>([''])
  const [hasInvitation, setHasInvitation] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
      checkInvitation(emailParam)
    }
  }, [searchParams])

  const checkInvitation = async (emailToCheck: string) => {
    try {
      const response = await fetch('/api/auth/check-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      })

      const data = await response.json()
      setHasInvitation(data.hasInvitation || false)
    } catch (err) {
      setHasInvitation(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          pin,
          first_name: firstName,
          household_name: hasInvitation ? null : householdName,
          invited_emails: hasInvitation ? [] : invitedEmails.filter((e) => e.trim()),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError(data.error || 'Er is een fout opgetreden')
      }
    } catch (err) {
      setError('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const addEmailField = () => {
    setInvitedEmails([...invitedEmails, ''])
  }

  const removeEmailField = (index: number) => {
    setInvitedEmails(invitedEmails.filter((_, i) => i !== index))
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...invitedEmails]
    newEmails[index] = value
    setInvitedEmails(newEmails)
  }

  if (hasInvitation === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      <div className="w-full max-w-md space-y-8 rounded-[16px] bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Welkom bij Boodschapp
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {hasInvitation
              ? 'Je bent uitgenodigd! Vul je gegevens in om te beginnen.'
              : 'Maak je account aan'}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Emailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                checkInvitation(e.target.value)
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="jouw@email.nl"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
              6-cijferige PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              required
              maxLength={6}
              pattern="[0-9]{6}"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl tracking-widest text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="000000"
            />
            <p className="mt-1 text-xs text-gray-500">Kies een 6-cijferige PIN die je makkelijk onthoudt</p>
          </div>

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Voornaam
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Jan"
            />
          </div>

          {!hasInvitation && (
            <>
              <div>
                <label htmlFor="householdName" className="block text-sm font-medium text-gray-700">
                  Naam van het huishouden
                </label>
                <input
                  id="householdName"
                  name="householdName"
                  type="text"
                  required
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Janssen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Andere leden uitnodigen (optioneel)
                </label>
                {invitedEmails.map((email, index) => (
                  <div key={index} className="mb-2 flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      placeholder="email@voorbeeld.nl"
                    />
                    {invitedEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailField(index)}
                        className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100"
                      >
                        Verwijder
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEmailField}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Nog een email toevoegen
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || (hasInvitation ? false : !householdName)}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Bezig...' : 'Account aanmaken'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  )
}
