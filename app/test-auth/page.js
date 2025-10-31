"use client";

export default function TestAuth() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Test Gmail Auth</h1>
      <br />
      <a
        href="/api/auth/gmail?redirect_to=/quick-setup"
        style={{
          display: 'inline-block',
          padding: '20px 40px',
          backgroundColor: '#4285f4',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold'
        }}
      >
        Click Here to Connect Gmail
      </a>
    </div>
  );
}
