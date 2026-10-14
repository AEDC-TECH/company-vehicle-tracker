import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  FaSlidersH,
} from "react-icons/fa";

import "../Styles/FeatureSettingsShortcut.css";


function FeatureSettingsShortcut() {
  const location =
    useLocation();


  /*
   * Only show the shortcut
   * on the main Admin dashboard.
   */
  if (
    location.pathname !==
    "/"
  ) {
    return null;
  }


  return (
    <Link
      to="/settings/features"
      className="feature-settings-shortcut"
      title="Feature Management"
      aria-label="Open Feature Management"
    >
      <FaSlidersH />

      <span>
        Feature Management
      </span>
    </Link>
  );
}


export default FeatureSettingsShortcut;