import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
