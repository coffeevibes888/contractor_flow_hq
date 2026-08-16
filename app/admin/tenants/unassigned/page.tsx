import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Tenants | Property Flow HQ',
  description: 'Manage tenants who have signed up but not yet been assigned to a property'
};

export default async function UnassignedTenantsPage() {
  // Redirect to main tenants page - unassigned tenants are now in a tab
  redirect('/admin/tenants');
}

// Made with Bob
