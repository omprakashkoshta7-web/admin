/**
 * Diagnostic utilities for troubleshooting API and authentication issues
 */

export interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
}

export const runDiagnostics = async (): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // 1. Check API Base URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  results.push({
    name: 'API Base URL Configuration',
    status: apiBaseUrl ? 'success' : 'error',
    message: apiBaseUrl ? `API Base URL is set to: ${apiBaseUrl}` : 'API Base URL is not configured',
    details: { apiBaseUrl }
  });

  // 2. Check localStorage for auth token
  const authToken = localStorage.getItem('admin_token');
  results.push({
    name: 'Authentication Token',
    status: authToken ? 'success' : 'warning',
    message: authToken ? 'Auth token found in localStorage' : 'No auth token in localStorage (expected if not logged in)',
    details: { hasToken: !!authToken, tokenPreview: authToken ? authToken.substring(0, 20) + '...' : null }
  });

  // 3. Check admin user data
  const adminUser = localStorage.getItem('admin_user');
  results.push({
    name: 'Admin User Data',
    status: adminUser ? 'success' : 'warning',
    message: adminUser ? 'Admin user data found in localStorage' : 'No admin user data (expected if not logged in)',
    details: { hasUserData: !!adminUser, userData: adminUser ? JSON.parse(adminUser) : null }
  });

  // 4. Test gateway connectivity
  try {
    const healthResponse = await fetch(`${apiBaseUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    results.push({
      name: 'Gateway Connectivity',
      status: healthResponse.ok ? 'success' : 'warning',
      message: `Gateway responded with status ${healthResponse.status}`,
      details: { status: healthResponse.status, statusText: healthResponse.statusText }
    });
  } catch (error: any) {
    results.push({
      name: 'Gateway Connectivity',
      status: 'error',
      message: `Failed to connect to gateway: ${error.message}`,
      details: { error: error.message }
    });
  }

  // 5. Test login endpoint
  try {
    const loginResponse = await fetch(`${apiBaseUrl}/staff/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'test' })
    });

    const status = loginResponse.status;
    let statusType: 'success' | 'warning' | 'error' = 'error';
    let message = '';

    if (status === 404) {
      statusType = 'error';
      message = 'Login endpoint not found (404) - Backend endpoint may not be implemented';
    } else if (status === 401 || status === 400) {
      statusType = 'success';
      message = `Login endpoint exists and responded with ${status} (expected for invalid credentials)`;
    } else if (status === 200) {
      statusType = 'success';
      message = 'Login endpoint working correctly';
    } else {
      statusType = 'warning';
      message = `Login endpoint responded with unexpected status ${status}`;
    }

    results.push({
      name: 'Login Endpoint',
      status: statusType,
      message,
      details: { status, statusText: loginResponse.statusText }
    });
  } catch (error: any) {
    results.push({
      name: 'Login Endpoint',
      status: 'error',
      message: `Failed to test login endpoint: ${error.message}`,
      details: { error: error.message }
    });
  }

  // 6. Check environment
  results.push({
    name: 'Environment Configuration',
    status: 'success',
    message: 'Environment variables loaded',
    details: {
      nodeEnv: import.meta.env.VITE_NODE_ENV,
      appName: import.meta.env.VITE_APP_NAME,
      authMode: import.meta.env.VITE_AUTH_MODE
    }
  });

  return results;
};

export const printDiagnostics = async (): Promise<void> => {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 ADMIN PORTAL DIAGNOSTICS');
  console.log('='.repeat(60) + '\n');

  const results = await runDiagnostics();

  results.forEach((result) => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
    console.log();
  });

  // Summary
  const errors = results.filter(r => r.status === 'error');
  const warnings = results.filter(r => r.status === 'warning');

  console.log('='.repeat(60));
  console.log(`Summary: ${results.length - errors.length - warnings.length} OK, ${warnings.length} warnings, ${errors.length} errors`);
  console.log('='.repeat(60) + '\n');

  if (errors.length > 0) {
    console.log('🔧 RECOMMENDED ACTIONS:');
    errors.forEach((error) => {
      if (error.name === 'Login Endpoint' && error.message.includes('404')) {
        console.log('1. Check if backend service is running');
        console.log('2. Verify /auth/login endpoint is implemented in backend');
        console.log('3. Check API gateway routing configuration');
      }
      if (error.name === 'Gateway Connectivity') {
        console.log('1. Verify backend gateway is deployed and running');
        console.log('2. Check network connectivity');
        console.log('3. Verify API base URL is correct');
      }
    });
    console.log();
  }
};

// Auto-run diagnostics on page load in development
if (import.meta.env.DEV) {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      // Expose diagnostics to console
      (window as any).runDiagnostics = runDiagnostics;
      (window as any).printDiagnostics = printDiagnostics;
      
      console.log('💡 Tip: Run printDiagnostics() in console to diagnose issues');
    });
  }
}
