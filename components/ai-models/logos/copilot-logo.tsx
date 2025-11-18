interface CopilotLogoProps {
  className?: string;
}

export function CopilotLogo({ className = 'w-5 h-5' }: CopilotLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M34.142 7.325A4.63 4.63 0 0029.7 4H28.35a4.63 4.63 0 00-4.554 3.794L21.48 20.407l.575-1.965a4.63 4.63 0 014.444-3.33h7.853l3.294 1.282 3.175-1.283h-.926a4.63 4.63 0 01-4.443-3.325l-1.31-4.461z"
        fill="url(#copilot-gradient-1)"
      ></path>
      <path
        d="M14.33 40.656A4.63 4.63 0 0018.779 44h2.87a4.63 4.63 0 004.629-4.51l.312-12.163-.654 2.233a4.63 4.63 0 01-4.443 3.329h-7.919l-2.823-1.532-3.057 1.532h.912a4.63 4.63 0 014.447 3.344l1.279 4.423z"
        fill="url(#copilot-gradient-2)"
      ></path>
      <path
        d="M29.5 4H13.46c-4.583 0-7.332 6.057-9.165 12.113C2.123 23.29-.72 32.885 7.503 32.885h6.925a4.63 4.63 0 004.456-3.358 2078.617 2078.617 0 014.971-17.156c.843-2.843 1.544-5.284 2.621-6.805C27.08 4.714 28.086 4 29.5 4z"
        fill="url(#copilot-gradient-3)"
      ></path>
      <path
        d="M29.5 4H13.46c-4.583 0-7.332 6.057-9.165 12.113C2.123 23.29-.72 32.885 7.503 32.885h6.925a4.63 4.63 0 004.456-3.358 2078.617 2078.617 0 014.971-17.156c.843-2.843 1.544-5.284 2.621-6.805C27.08 4.714 28.086 4 29.5 4z"
        fill="url(#copilot-gradient-4)"
      ></path>
      <path
        d="M18.498 44h16.04c4.582 0 7.332-6.058 9.165-12.115 2.171-7.177 5.013-16.775-3.208-16.775h-6.926a4.63 4.63 0 00-4.455 3.358 2084.036 2084.036 0 01-4.972 17.16c-.842 2.843-1.544 5.285-2.62 6.806-.604.852-1.61 1.566-3.024 1.566z"
        fill="url(#copilot-gradient-5)"
      ></path>
      <path
        d="M18.498 44h16.04c4.582 0 7.332-6.058 9.165-12.115 2.171-7.177 5.013-16.775-3.208-16.775h-6.926a4.63 4.63 0 00-4.455 3.358 2084.036 2084.036 0 01-4.972 17.16c-.842 2.843-1.544 5.285-2.62 6.806-.604.852-1.61 1.566-3.024 1.566z"
        fill="url(#copilot-gradient-6)"
      ></path>
      <defs>
        <radialGradient id="copilot-gradient-1">
          <stop offset=".096" stopColor="#00AEFF"></stop>
          <stop offset=".773" stopColor="#2253CE"></stop>
          <stop offset="1" stopColor="#0736C4"></stop>
        </radialGradient>
        <radialGradient id="copilot-gradient-2">
          <stop stopColor="#FFB657"></stop>
          <stop offset=".634" stopColor="#FF5F3D"></stop>
          <stop offset=".923" stopColor="#C02B3C"></stop>
        </radialGradient>
        <radialGradient id="copilot-gradient-5">
          <stop offset=".066" stopColor="#8C48FF"></stop>
          <stop offset=".5" stopColor="#F2598A"></stop>
          <stop offset=".896" stopColor="#FFB152"></stop>
        </radialGradient>
        <linearGradient
          id="copilot-gradient-3"
          x1="12.5"
          y1="7.5"
          x2="14.788"
          y2="33.975"
        >
          <stop offset=".156" stopColor="#0D91E1"></stop>
          <stop offset=".487" stopColor="#52B471"></stop>
          <stop offset=".652" stopColor="#98BD42"></stop>
          <stop offset=".937" stopColor="#FFC800"></stop>
        </linearGradient>
        <linearGradient
          id="copilot-gradient-4"
          x1="14.5"
          y1="4"
          x2="15.75"
          y2="32.885"
        >
          <stop stopColor="#3DCBFF"></stop>
          <stop offset=".247" stopColor="#0588F7" stopOpacity="0"></stop>
        </linearGradient>
        <linearGradient
          id="copilot-gradient-6"
          x1="42.586"
          y1="13.346"
          x2="42.569"
          y2="21.215"
        >
          <stop offset=".058" stopColor="#F8ADFA"></stop>
          <stop offset=".708" stopColor="#A86EDD" stopOpacity="0"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
