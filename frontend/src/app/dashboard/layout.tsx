import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-zinc-950">
            <Sidebar />
            <main className="flex-1 md:ml-64 pt-20 md:pt-0 transition-all duration-300 overflow-auto">
                {children}
            </main>
        </div>
    )
}
