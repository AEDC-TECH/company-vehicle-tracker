import aedcLogo from "../assets/images/aedc-logo.png";

import "./AEDCLogo.css";

function AEDCLogo({
  className = "",
  compact = false,
}) {
  return (
    <div
      className={`aedc-logo-wrap ${
        compact ? "aedc-logo-compact" : ""
      } ${className}`}
    >
      <img
        src={aedcLogo}
        alt="African Entrepreneurship Development Corporation"
        className="aedc-logo-image"
      />
    </div>
  );
}

export default AEDCLogo;