export default function ConfigError() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="vdm-card" style={{ maxWidth: 560, padding: 28 }}>
        <h1 className="vdm-serif" style={{ fontSize: 22, fontWeight: 500, marginBottom: 10 }}>
          Supabase configuration missing
        </h1>
        <p style={{ fontSize: 14, color: '#5a5853', lineHeight: 1.55 }}>
          The app loaded but <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> were not set when it was built. Vite
          bakes these in at <strong>build time</strong>, so set them in your host's
          build environment (Cloudflare → Settings → Variables) and redeploy, or in{' '}
          <code>.env.local</code> for local development.
        </p>
      </div>
    </div>
  )
}
