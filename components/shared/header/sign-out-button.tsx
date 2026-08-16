"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/actions/auth.actions'

export default function SignOutButton() {
  const handleClick = async () => {
    // Don't wrap in try/catch - signOut throws NEXT_REDIRECT which is expected
    await logout('/')
  }

  return (
    <Button
      onClick={handleClick}
      variant='ghost'
      className='w-full py-4 px-2 h-4 justify-start text-black hover:bg-gray-100'
    >
      Sign Out
    </Button>
  )
}
