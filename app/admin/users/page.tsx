import { Metadata } from 'next';
import Image from 'next/image';
import { getAllUsers, deleteUser } from '@/lib/actions/user.actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Pagination from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import DeleteDialog from '@/components/shared/delete-dialog';
import { requireAdmin } from '@/lib/auth-guard';

interface User {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  role: string;
  image: string | null;
}

export const metadata: Metadata = {
  title: 'Admin Users',
};

const AdminUserPage = async (props: {
  searchParams: Promise<{
    page: string;
    query: string;
  }>;
}) => {
  await requireAdmin();

  const { page = '1', query: searchText } = await props.searchParams;

  const users = await getAllUsers({ page: Number(page), query: searchText });

  return (
    <div className='w-full px-4 py-8 md:px-0 space-y-4'>
      <div className='max-w-6xl mx-auto space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
          <h1 className='text-2xl md:text-3xl font-semibold text-slate-900'>Users</h1>
          {searchText && (
            <div className='text-sm text-slate-600'>
              Filtered by <i>&quot;{searchText}&quot;</i>{' '}
              <Link href='/admin/users'>
                <Button variant='outline' size='sm'>
                  Remove Filter
                </Button>
              </Link>
            </div>
          )}
        </div>
        <div className='overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AVATAR</TableHead>
              <TableHead>NAME</TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead>PHONE</TableHead>
              <TableHead>ROLE</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data.map((user: User) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || 'User'}
                      width={80}
                      height={80}
                      className='rounded-lg object-cover'
                    />
                  ) : (
                    <div className='w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg'>
                      {user.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </TableCell>
                <TableCell>{user.name || 'Unknown'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.phoneNumber ? (
                    <a
                      href={`tel:${user.phoneNumber}`}
                      className='text-blue-600 hover:text-blue-800 hover:underline text-sm'
                    >
                      {user.phoneNumber}
                    </a>
                  ) : (
                    <span className='text-slate-400 text-xs italic'>—</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.role === 'user' ? (
                    <Badge variant='secondary'>User</Badge>
                  ) : (
                    <Badge variant='default'>Admin</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button asChild variant='outline' size='sm'>
                    <Link href={`/admin/users/${user.id}`}>Edit</Link>
                  </Button>
                  <DeleteDialog id={user.id} action={deleteUser} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        {users.totalPages > 1 && (
          <Pagination page={Number(page) || 1} totalPages={users?.totalPages} />
        )}
      </div>
    </div>
  );
};

export default AdminUserPage;
