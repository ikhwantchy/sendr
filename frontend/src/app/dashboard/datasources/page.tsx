'use client'

export default function DataSourcesPage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Data Sources</h1>
                <p className="text-gray-600 mt-1">Connect external data sources</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DataSourceCard
                    icon="📊"
                    title="Google Sheets"
                    description="Connect spreadsheets for dynamic data"
                    status="Available"
                />
                <DataSourceCard
                    icon="📄"
                    title="CSV Files"
                    description="Upload CSV files"
                    status="Available"
                />
                <DataSourceCard
                    icon="🔌"
                    title="REST API"
                    description="Connect to external APIs"
                    status="Available"
                />
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 How to use Data Sources</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Create a data source connection</li>
                    <li>Map columns to variables</li>
                    <li>Use variables in rules: {'{'}{'{'} nama {'}'}{'}'}, {'{'}{'{'} email {'}'}{'}'}</li>
                    <li>Data auto-refreshes based on cache TTL</li>
                </ol>
            </div>
        </div>
    )
}

function DataSourceCard({ icon, title, description, status }: any) {
    return (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition cursor-pointer">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 mb-4">{description}</p>
            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                {status}
            </span>
        </div>
    )
}
