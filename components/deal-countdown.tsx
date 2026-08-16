'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { useEffect, useState } from 'react';

// Static target date (Dec 25, 2025 at 12:00 AM)
const TARGET_DATE = new Date('2025-12-25T00:00:00');

// Function to calculate the time remaining
const calculateTimeRemaining = (targetDate: Date) => {
  const currentTime = new Date();
  const timeDifference = Math.max(Number(targetDate) - Number(currentTime), 0);
  return {
    days: Math.floor(timeDifference / (1000 * 60 * 60 * 24)),
    hours: Math.floor(
      (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    ),
    minutes: Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((timeDifference % (1000 * 60)) / 1000),
  };
};

const DealCountdown = () => {
  const [time, setTime] = useState<ReturnType<typeof calculateTimeRemaining>>();

  const photos = [
    { id: 3, label: 'Rocken My Vibe', src: '/images/twolightblue.png' },
    { id: 2, label: 'Behind the Scenes', src: '/images/light2.png' },
    { id: 1, label: 'Deal Spotlight', src: '/images/light1.png' },
  ];

  useEffect(() => {
    // Calculate initial time on client
    setTime(calculateTimeRemaining(TARGET_DATE));

    const timerInterval = setInterval(() => {
      const newTime = calculateTimeRemaining(TARGET_DATE);
      setTime(newTime);

      if (
        newTime.days === 0 &&
        newTime.hours === 0 &&
        newTime.minutes === 0 &&
        newTime.seconds === 0
      ) {
        clearInterval(timerInterval);
      }

      return () => clearInterval(timerInterval);
    }, 1000);
  }, []);

  if (!time) {
    return (
      <section className='grid grid-cols-1 md:grid-cols-2 my-20'>
        <div className='flex flex-col gap-2 justify-center'>
          <h3 className='text-3xl font-bold'>Loading Countdown...</h3>
        </div>
      </section>
    );
  }

  if (
    time.days === 0 &&
    time.hours === 0 &&
    time.minutes === 0 &&
    time.seconds === 0
  ) {
    return (
      <section className='grid grid-cols-1 md:grid-cols-2 my-20'>
        <div className='flex flex-col gap-2 justify-center'>
          <h3 className='text-3xl font-bold'>Deal Has Ended</h3>
          <p>
            This deal is no longer available. Check out our latest promotions!
          </p>

          <div className='text-center'>
            <Button asChild>
              <Link href='/search'>View Products</Link>
            </Button>
          </div>
        </div>
        {/* <div className='flex justify-center'>
          <Image
            src='/images/light1.png'
            alt='promotion'
            width={300}
            height={200}
          />
        </div> */}
      </section>
    );
  }

  return (
    <section className='grid grid-cols-1 md:grid-cols-2 my-20 gap-10 items-start'>
      <div className='flex flex-col gap-4 justify-center'>
        <h3 className='text-3xl md:text-4xl font-bold text-white'>Deal Of The Month</h3>
        <p className='text-sm md:text-base text-gray-200'>
          Get ready for a shopping experience like never before with our Deals of the Month! Every purchase comes with
          exclusive perks and offers, making this month a celebration of savvy choices and amazing deals. Don&apos;t miss
          out! 🎁🛒
        </p>
        <ul className='grid grid-cols-4 rounded-2xl border border-white/10 bg-slate-950/70 overflow-hidden'>
          <StatBox label='Days' value={time.days} />
          <StatBox label='Hours' value={time.hours} />
          <StatBox label='Minutes' value={time.minutes} />
          <StatBox label='Seconds' value={time.seconds} />
        </ul>
        <div className='text-center'>
          <Button asChild>
            <Link href='/search'>View Products</Link>
          </Button>
        </div>
      </div>

      <div className='relative h-[320px] md:h-[380px] lg:h-[420px] mt-4 md:mt-8'>
        <div className='absolute inset-0 bg-gradient-radial from-violet-500/35 via-transparent to-transparent blur-3xl opacity-80' />

        <div className='relative h-full flex items-start justify-center'>
          <div className='relative w-full max-w-md aspect-[4/5]'>
            {/* Floating photos (same concept as About page) */}
            <div className='group/pile absolute inset-0'>
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`absolute rounded-2xl border border-white/15 overflow-hidden bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.85)] transition-all duration-300 ease-out cursor-pointer
                    hover:z-30 hover:scale-105 hover:-translate-y-2
                    group-hover/pile:opacity-70 hover:!opacity-100
                  `}
                  style={{
                    top: `${10 + index * 6}%`,
                    left: `${index % 2 === 0 ? 4 + index * 10 : 22 + index * 8}%`,
                    width: index === 1 || index === 2 ? '56%' : '48%',
                    height: index === 1 ? '52%' : index === 2 ? '50%' : '44%',
                    transform: `rotate(${index % 2 === 0 ? -6 + index * 2 : 8 - index * 2}deg)`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt={photo.label}
                    className='h-full w-full object-cover'
                  />
                  <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-4 text-[11px] text-gray-100 flex items-center justify-between'>
                    <span className='uppercase tracking-[0.15em] text-gray-300'>{photo.label}</span>
                    <span className='text-[10px] text-violet-300'>Limited Time</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatBox = ({ label, value }: { label: string; value: number }) => (
  <li className='p-4 w-full text-center'>
    <p className='text-3xl font-bold'>{value}</p>
    <p>{label}</p>
  </li>
);

export default DealCountdown;
