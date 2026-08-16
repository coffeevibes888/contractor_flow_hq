// Pure CSS loading spinner — replaces the old 303 KiB animated GIF.
// Savings: ~275 KiB on every navigation that hits the loading state.
const LoadingPage = () => {
  return (
    <div
      role='status'
      aria-label='Loading'
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          border: '4px solid #e2e8f0',
          borderTopColor: '#0ea5e9',
          borderRadius: '50%',
          animation: 'pfhq-spin 0.9s linear infinite',
        }}
      />
      <style>{`
        @keyframes pfhq-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <span className='sr-only'>Loading...</span>
    </div>
  );
};

export default LoadingPage;
