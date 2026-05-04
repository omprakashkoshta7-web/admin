import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Add error handling for development
const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = `
    <div style="padding: 2rem; text-align: center; font-family: system-ui;">
      <h1>Admin Panel Error</h1>
      <p>Root element not found. Please check the HTML structure.</p>
    </div>
  `;
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Admin Panel Render Error:', error);
    rootElement.innerHTML = `
      <div style="padding: 2rem; text-align: center; font-family: system-ui;">
        <h1>Admin Panel Error</h1>
        <p>Failed to render the application.</p>
        <details style="margin-top: 1rem; text-align: left;">
          <summary>Error Details</summary>
          <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto;">${error}</pre>
        </details>
        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}
