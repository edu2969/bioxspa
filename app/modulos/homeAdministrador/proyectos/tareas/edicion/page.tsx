'use client'
import { useRouter, useSearchParams } from 'next/navigation';
import EditTask from '@/components/EditTask';

export default function Page() {
    const params = useSearchParams();
    const router = useRouter();

    return (
        <main className="p-6 mt-8 h-screen overflow-y-scroll">
            <EditTask params={params} router={router} />
        </main>
    );
}
