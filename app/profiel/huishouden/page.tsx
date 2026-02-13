'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  email: string
  first_name: string
}

interface Invitation {
  id: string
  email: string
  created_at: string
}

export default function ProfielHuishoudenPage() {
  const router = useRouter()
  const [householdName, setHouseholdName] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitedEmails, setInvitedEmails] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const userResponse = await fetch('/api/user/current')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setCurrentUserId(userData.id)
        }

        // Get household members and invitations
        const membersResponse = await fetch('/api/household/members')
        if (membersResponse.ok) {
          const data = await membersResponse.json()
          setMembers(data.members || [])
          setInvitations(data.invitations || [])
          
          // Get household name from first member or fetch separately
          if (data.members && data.members.length > 0) {
            // We'll need to fetch household name separately
            const householdResponse = await fetch('/api/household/current')
            if (householdResponse.ok) {
              const householdData = await householdResponse.json()
              setHouseholdName(householdData.name || '')
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setInitialLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/household/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName }),
      })

      const data = await response.json()

      if (response.ok) {
        router.refresh()
      } else {
        setError(data.error || 'Kon naam niet updaten')
      }
    } catch (err) {
      setError('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleAddInvitations = async () => {
    const emailsToInvite = invitedEmails.filter((e) => e.trim())
    if (emailsToInvite.length === 0) {
      setError('Voeg ten minste één email toe')
      return
    }

    setError('')
    setLoading(true)

    try {
      // Get household_id from current user
      const userResponse = await fetch('/api/user/current')
      if (!userResponse.ok) {
        throw new Error('Kon gebruiker niet ophalen')
      }
      const userData = await userResponse.json()

      const response = await fetch('/api/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: emailsToInvite,
          household_id: userData.household_id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setInvitedEmails([''])
        // Refresh members and invitations
        const membersResponse = await fetch('/api/household/members')
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setMembers(membersData.members || [])
          setInvitations(membersData.invitations || [])
        }
      } else {
        setError(data.error || 'Kon uitnodigingen niet versturen')
      }
    } catch (err) {
      setError('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMemberClick = (memberId: string) => {
    setMemberToRemove(memberId)
    setShowRemoveMemberModal(true)
  }

  const handleRemoveMemberConfirm = async () => {
    if (!memberToRemove) return

    const memberId = memberToRemove
    setShowRemoveMemberModal(false)
    setMemberToRemove(null)
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/household/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh members
        const membersResponse = await fetch('/api/household/members')
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setMembers(membersData.members || [])
        }
      } else {
        setError(data.error || 'Kon lid niet verwijderen')
      }
    } catch (err) {
      setError('Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveInvitation = async (invitationId: string) => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/household/remove-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh invitations
        const membersResponse = await fetch('/api/household/members')
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setInvitations(membersData.invitations || [])
        }
      } else {
        setError(data.error || 'Kon uitnodiging niet verwijderen')
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

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-sm text-gray-500">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col pb-20">
      <div className="absolute inset-0 z-0 min-h-full bg-[#2563eb]" aria-hidden />
      <div className="absolute inset-0 z-0 min-h-full" style={{ background: 'linear-gradient(180deg, rgba(249, 250, 251, 0) 0%, rgba(249, 250, 251, 1) 28%)' }} aria-hidden />
      <header className="relative z-10 min-h-[240px] bg-gradient-to-b from-blue-600 via-blue-600 to-transparent pt-[env(safe-area-inset-top)]">
        <div className="relative z-10 mx-auto max-w-2xl px-4 pt-6 pb-2 sm:px-6 sm:pt-8 sm:pb-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-white/90 hover:text-white"
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
            <h1 className="text-3xl font-bold text-white">Huishouden beheren</h1>
          </div>
        </div>
      </header>

      <main className="-mt-[172px] sm:-mt-[156px] relative z-10 mx-auto w-full max-w-2xl flex-1 px-4 pt-10 pb-8 sm:px-6 sm:pt-10 lg:px-8">
        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Huishouden naam */}
          <div className="rounded-[16px] bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Naam van het huishouden</h2>
            <form onSubmit={handleUpdateName} className="flex gap-4">
              <input
                type="text"
                required
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Janssen"
              />
              <button
                type="submit"
                disabled={loading || !householdName.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Opslaan...' : 'Opslaan'}
              </button>
            </form>
          </div>

          {/* Leden */}
          <div className="rounded-[16px] bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Leden</h2>
            {members.length === 0 ? (
              <p className="text-sm text-gray-600">Geen leden</p>
            ) : (
              <ul className="space-y-2">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{member.first_name}</p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                    {member.id === currentUserId && (
                      <button
                        onClick={() => handleRemoveMemberClick(member.id)}
                        className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
                      >
                        Verwijder
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Leden toevoegen */}
          <div className="rounded-[16px] bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Leden toevoegen</h2>
            {invitations.length > 0 && (
              <div className="mb-4 rounded-md bg-blue-50 p-3 space-y-3">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-start justify-between gap-3">
                    <p className="text-sm text-blue-800 flex-1 min-w-0">
                      <span className="font-semibold">{invitation.email}</span> kan zich nu aanmelden en heeft direct toegang tot het huishouden <span className="font-semibold">{householdName || 'huishouden'}</span>.
                    </p>
                    <button
                      onClick={() => handleRemoveInvitation(invitation.id)}
                      className="shrink-0 rounded-md border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
                    >
                      Verwijder
                    </button>
                  </div>
                ))}
              </div>
            )}
            {invitations.length === 0 && (
              <p className="text-sm text-gray-600 mb-4">Nog geen e-mailadressen toegevoegd</p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mailadres toevoegen
              </label>
              {invitedEmails.map((email, index) => (
                <div key={index} className="mb-2 flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addEmailField}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Nog een email toevoegen
                </button>
                <button
                  type="button"
                  onClick={handleAddInvitations}
                  disabled={loading || invitedEmails.every((e) => !e.trim())}
                  className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Toevoegen...' : 'Toevoegen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showRemoveMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden onClick={() => { setShowRemoveMemberModal(false); setMemberToRemove(null) }} />
          <div className="relative rounded-[16px] bg-white p-4 shadow-lg max-w-sm w-full">
            <p className="text-gray-900">Weet je zeker dat je dit lid wilt verwijderen?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowRemoveMemberModal(false); setMemberToRemove(null) }}
                className="rounded-[16px] px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleRemoveMemberConfirm}
                disabled={loading}
                className="rounded-[16px] bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
