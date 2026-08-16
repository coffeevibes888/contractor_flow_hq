import { redirect } from 'next/navigation';

// The settings area only has sub-pages (account, api, billing, integrations,
// subscription). Visiting the bare /contractor-dashboard/settings used to
// 404; send it to the Account tab as the sensible default.
export default function ContractorSettingsIndex() {
  redirect('/contractor-dashboard/settings/account');
}
