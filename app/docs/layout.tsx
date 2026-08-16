import Header from '@/components/shared/header';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-600 via-blue-600 to-sky-700">
      <Header />
      {children}
    </div>
  );
}
