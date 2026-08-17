import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='border-t border-black/20'>
      <div className='max-w-7xl mx-auto px-4 md:px-6 py-6'>
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-6'>

          {/* Logo & Copyright */}
          <div className='flex items-center gap-3'>
            <Link href='/'>
              <div className='relative w-10 h-10'>
                <Image
                  src='/images/logo.svg'
                  fill
                  className='object-contain'
                  alt={`${APP_NAME} Logo`}
                />
              </div>
            </Link>
            <p className='text-black/70 text-sm font-medium'>
              © {currentYear} {APP_NAME}
            </p>
          </div>

          {/* Links */}
          <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold'>
            <Link href='/' className='text-black hover:text-blue-500 transition-colors'>Home</Link>
            <Link href='/contractor-marketplace' className='text-black hover:text-blue-500 transition-colors'>Marketplace</Link>
            <Link href='/free-contract-builder' className='text-black hover:text-blue-500 transition-colors'>Contract Builder</Link>
            <Link href='/blog' className='text-black hover:text-blue-500 transition-colors'>Blog</Link>
            <Link href='/faq' className='text-black hover:text-blue-500 transition-colors'>FAQs</Link>
            <Link href='/docs/api' className='text-black hover:text-blue-500 transition-colors'>API</Link>
            <Link href='/about' className='text-black hover:text-blue-500 transition-colors'>About</Link>
            <Link href='/contact' className='text-black hover:text-blue-500 transition-colors'>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
