import logoImg from '../../assets/logo.png';

export default function Logo({ size = 36, showText = true, variant = 'light' }) {
  const isLight = variant === 'light'; // light text for dark backgrounds, dark text for light backgrounds
  return (
    <div className="bridge-logo-container" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <img
        src={logoImg}
        alt="B.R.I.D.G.E. Logo"
        style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
      />
      {showText && (
        <div className="bridge-logo-text-wrap" style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            className="bridge-logo-title"
            style={{
              fontWeight: 800,
              fontSize: size >= 40 ? '1.25rem' : '1.1rem',
              letterSpacing: '0.08em',
              color: isLight ? '#FFFFFF' : '#0F172A',
              fontFamily: 'inherit',
              lineHeight: 1,
            }}
          >
            B.R.I.D.G.E.
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: isLight ? '#94A3B8' : '#64748B',
              marginTop: '2px',
            }}
          >
            Academic SaaS
          </span>
        </div>
      )}
    </div>
  );
}
