import { auth } from '@/auth';

export default async function CheckSessionPage() {
  const session = await auth();

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6">Session Debug</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Current Session:</h2>
        <pre className="bg-gray-950 p-4 rounded overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="mt-6 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Access Check:</h2>
        <ul className="space-y-2">
          <li>✅ Logged in: {session?.user ? 'Yes' : 'No'}</li>
          <li>✅ User ID: {session?.user?.id || 'N/A'}</li>
          <li>✅ Email: {session?.user?.email || 'N/A'}</li>
          <li>✅ Role: {session?.user?.role || 'N/A'}</li>
          <li className={session?.user?.role === 'superAdmin' ? 'text-green-400' : 'text-red-400'}>
            {session?.user?.role === 'superAdmin' ? '✅' : '❌'} Super Admin Access: {session?.user?.role === 'superAdmin' ? 'YES' : 'NO'}
          </li>
        </ul>
      </div>

      {session?.user?.role !== 'superAdmin' && (
        <div className="mt-6 bg-red-900/30 border border-red-500 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2 text-red-300">⚠️ Not a Super Admin</h2>
          <p className="text-red-200">
            Your current role is: <strong>{session?.user?.role || 'none'}</strong>
          </p>
          <p className="text-red-200 mt-2">
            You need the <strong>superAdmin</strong> role to access /super-admin routes.
          </p>
          <p className="text-red-200 mt-4">
            To fix this, update your user role in the database:
          </p>
          <pre className="bg-gray-950 p-4 rounded mt-2 text-sm">
{`UPDATE "User" SET role = 'superAdmin' WHERE email = '${session?.user?.email}';`}
          </pre>
        </div>
      )}
    </div>
  );
}
