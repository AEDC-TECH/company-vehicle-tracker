import {
  Link,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaLock,
} from "react-icons/fa";

import {
  getFeatureDefinition,
} from "../config/features";

import {
  useFeatures,
} from "./FeatureProvider";

import "../Styles/FeatureRoute.css";


function FeatureRoute({
  feature,
  features,
  children,
}) {
  const {
    areEnabled,
    loading,
  } =
    useFeatures();


  const requiredFeatures =
    features ||
    (feature
      ? [feature]
      : []);


  if (loading) {
    return (
      <main className="feature-route-state">

        <div className="feature-route-card">

          <div className="feature-route-icon">
            <FaLock />
          </div>

          <h1>
            Checking Module Access
          </h1>

          <p>
            Loading system feature settings...
          </p>

        </div>

      </main>
    );
  }


  const disabledFeature =
    requiredFeatures.find(
      (featureKey) =>
        !areEnabled([
          featureKey,
        ])
    );


  if (disabledFeature) {
    const definition =
      getFeatureDefinition(
        disabledFeature
      );

    return (
      <main className="feature-route-state">

        <div className="feature-route-card">

          <div className="feature-route-icon">
            <FaLock />
          </div>

          <span>
            MODULE DISABLED
          </span>

          <h1>
            {definition
              ?.label ||
              "This Module"}
          </h1>

          <p>
            This feature is currently
            disabled by the system
            administrator.
          </p>

          <Link to="/">
            <FaArrowLeft />

            Return to Dashboard
          </Link>

        </div>

      </main>
    );
  }


  return children;
}


export default FeatureRoute;