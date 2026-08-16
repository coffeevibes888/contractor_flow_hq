import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';

const Search = async () => {
  return (
    <form action='/search' method='GET'>
      <div className='flex w-full max-w-sm items-center space-x-2'>
        <Input name='q' type='text' placeholder='Search...' className='md:w-[100px] lg:w-[300px]'/>
        <Button>
          <SearchIcon />
        </Button>
      </div>
    </form>
  );
};

export default Search;
