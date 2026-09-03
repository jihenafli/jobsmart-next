'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Page pricing supprimée — redirection automatique vers dashboard
export default function Pricing() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, []);
  return null;
}
