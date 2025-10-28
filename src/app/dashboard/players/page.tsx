'use client'

import { useRouter } from 'next/navigation'
import MobilePlayerList from '@/components/MobilePlayerList'

export default function PlayersPage() {
  const router = useRouter()

  const handleAddPlayer = () => {
    router.push('/dashboard/players/new')
  }

  return (
    <MobilePlayerList onAddPlayer={handleAddPlayer} />
  )
}