'use client';

interface MissingOrgConfigProps {
  page: string;
}

export function MissingOrgConfig({ page }: MissingOrgConfigProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm px-6 py-5 text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          Missing configuration
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Provide an organization ID to use the hotspot {page} page.
        </p>
      </div>
    </div>
  );
}
