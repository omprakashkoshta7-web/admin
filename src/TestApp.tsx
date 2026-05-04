const TestApp = () => {
  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center', 
      fontFamily: 'system-ui',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Admin Panel Working!</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        React is successfully rendering. The white screen issue is fixed!
      </p>
      
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3>System Status:</h3>
        <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0 }}>
          <li>✅ React: Working</li>
          <li>✅ TypeScript: Working</li>
          <li>✅ Vite: Working</li>
          <li>✅ CSS: Loading</li>
        </ul>
      </div>

      <button 
        onClick={() => window.location.href = '/dashboard'}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          background: 'rgba(255,255,255,0.2)',
          border: '2px solid white',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.color = '#667eea';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.color = 'white';
        }}
      >
        Go to Dashboard
      </button>
    </div>
  );
};

export default TestApp;