import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaExclamationTriangle,
  FaLock,
  FaSlidersH,
  FaSpinner,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import {
  useFeatures,
} from "../Components/FeatureProvider";

import "../Styles/FeatureManagement.css";


/*
 * ============================================================
 * FEATURE DEFINITIONS
 * ============================================================
 */

const FEATURE_GROUPS = [
  {
    key: "core",
    label: "Core Operations",

    features: [
      {
        key: "vehicle_requests",

        label:
          "Vehicle Requests",

        description:
          "Vehicle request, approval, checkout and pre-trip request workflow.",
      },

      {
        key: "trip_history",

        label:
          "Trip History",

        description:
          "Admin fleet history and employee trip-history screens.",
      },
    ],
  },


  {
    key: "people",
    label: "People",

    features: [
      {
        key: "employees",

        label:
          "Employee Register",

        description:
          "Employee register and company work-number management.",
      },

      {
        key: "drivers",

        label:
          "Driver Management",

        description:
          "Driver eligibility, licence and PrDP management.",
      },
    ],
  },


  {
    key: "fleet-care",
    label: "Fleet Care",

    features: [
      {
        key: "defects",

        label:
          "Defect Management",

        description:
          "Vehicle defect review, grounding and resolution workflow.",
      },

      {
        key: "maintenance",

        label:
          "Maintenance",

        description:
          "Maintenance records, repairs and vehicle service workflow.",
      },

      {
        key: "fuel",

        label:
          "Fuel Management",

        description:
          "Fuel purchases, odometer records and fuel-cost tracking.",
      },
    ],
  },


  {
    key: "transport",
    label:
      "Transport Operations",

    features: [
      {
        key: "customers",

        label:
          "Customers",

        description:
          "Customer register used by transport jobs and deliveries.",
      },

      {
        key:
          "transport_jobs",

        label:
          "Jobs & Deliveries",

        description:
          "Transport jobs, assignments, cargo and customer deliveries.",
      },

      {
        key: "dispatch",

        label:
          "Dispatch Board",

        description:
          "Dispatch assigned jobs into approved bookings and active trips.",

        requires: [
          "transport_jobs",
        ],
      },

      {
        key: "pod",

        label:
          "Proof of Delivery",

        description:
          "Digital POD, paper POD, signatures and downloadable delivery documents.",

        requires: [
          "transport_jobs",
        ],
      },
    ],
  },


  {
    key: "safety",
    label: "Safety",

    features: [
      {
        key: "incidents",

        label:
          "Incident Reporting",

        description:
          "Vehicle incident reporting during active trips.",
      },
    ],
  },


  {
    key: "access",
    label: "Access",

    features: [
      {
        key:
          "employee_portal",

        label:
          "Employee Portal",

        description:
          "Employee-facing request, delivery, POD, return and history screens.",
      },
    ],
  },
];


const ALL_FEATURES =
  FEATURE_GROUPS.flatMap(
    (group) =>
      group.features
  );


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getFeatureLabel(
  featureKey
) {
  return (
    ALL_FEATURES.find(
      (feature) =>
        feature.key ===
        featureKey
    )?.label ||
    featureKey
  );
}


function formatDateTime(
  value
) {
  if (!value) {
    return "Not recorded";
  }


  try {
    return new Intl.DateTimeFormat(
      "en-ZA",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    ).format(
      new Date(value)
    );

  } catch {
    return String(value);
  }
}


function FeatureManagement() {

  /*
   * ============================================================
   * FEATURE CONTEXT
   * ============================================================
   */

  const featureContext =
    useFeatures();


  const contextFeatures =
    featureContext?.features ||
    {};


  const refreshFeatures =
    featureContext?.refreshFeatures ||
    featureContext?.reloadFeatures ||
    featureContext?.loadFeatures ||
    null;


  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [
    featureRows,
    setFeatureRows,
  ] = useState({});


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    savingKey,
    setSavingKey,
  ] = useState("");


  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  /*
   * ============================================================
   * LOAD FEATURE METADATA
   * ============================================================
   */

  useEffect(() => {
    loadFeatureRows();
  }, []);


  async function loadFeatureRows() {
    try {
      setLoading(true);

      setErrorMessage("");


      const {
        data,
        error,
      } =
        await supabase
          .from(
            "system_features"
          )
          .select("*")
          .order(
            "feature_key",
            {
              ascending:
                true,
            }
          );


      if (error) {
        throw error;
      }


      const mapped = {};


      for (
        const row
        of data || []
      ) {
        mapped[
          row.feature_key
        ] = row;
      }


      setFeatureRows(
        mapped
      );

    } catch (error) {
      console.error(
        "Feature settings load error:",
        error
      );


      setErrorMessage(
        error.message ||
          "Unable to load feature settings."
      );

    } finally {
      setLoading(false);
    }
  }


  /*
   * ============================================================
   * CURRENT FEATURE STATE
   * ============================================================
   */

  function isEnabled(
    featureKey
  ) {
    if (
      Object.prototype
        .hasOwnProperty.call(
          featureRows,
          featureKey
        )
    ) {
      return Boolean(
        featureRows[
          featureKey
        ]?.enabled
      );
    }


    return Boolean(
      contextFeatures[
        featureKey
      ]
    );
  }


  /*
   * ============================================================
   * DEPENDENCY CHECK
   * ============================================================
   */

  function getEnabledDependants(
    featureKey
  ) {
    return (
      ALL_FEATURES.filter(
        (feature) =>
          feature.requires
            ?.includes(
              featureKey
            ) &&
          isEnabled(
            feature.key
          )
      )
    );
  }


  /*
   * ============================================================
   * TOGGLE
   * ============================================================
   */

  async function toggleFeature(
    feature
  ) {
    if (savingKey) {
      return;
    }


    const current =
      isEnabled(
        feature.key
      );


    const next =
      !current;


    setErrorMessage("");

    setSuccessMessage("");


    /*
     * ============================================
     * ENABLING
     * ============================================
     */

    if (
      next &&
      feature.requires
        ?.length
    ) {
      const missing =
        feature.requires
          .filter(
            (requirement) =>
              !isEnabled(
                requirement
              )
          );


      if (
        missing.length
      ) {
        setErrorMessage(
          `${
            feature.label
          } requires ${
            missing
              .map(
                getFeatureLabel
              )
              .join(", ")
          } to be enabled first.`
        );

        return;
      }
    }


    /*
     * ============================================
     * DISABLING
     * ============================================
     */

    if (!next) {
      const dependants =
        getEnabledDependants(
          feature.key
        );


      if (
        dependants.length
      ) {
        const confirmed =
          window.confirm(
            `${
              feature.label
            } is currently required by ${
              dependants
                .map(
                  (item) =>
                    item.label
                )
                .join(", ")
            }.\n\nDo you still want to try disabling it?`
          );


        if (!confirmed) {
          return;
        }
      }
    }


    /*
     * ============================================
     * SAVE
     * ============================================
     */

    try {
      setSavingKey(
        feature.key
      );


      const {
        error,
      } =
        await supabase.rpc(
          "admin_set_system_feature",
          {
            p_feature_key:
              feature.key,

            p_enabled:
              next,
          }
        );


      if (error) {
        throw error;
      }


      await loadFeatureRows();


      if (
        typeof refreshFeatures ===
        "function"
      ) {
        await refreshFeatures();
      }


      setSuccessMessage(
        `${
          feature.label
        } ${
          next
            ? "enabled"
            : "disabled"
        }.`
      );


      /*
       * If FeatureProvider does not expose
       * a refresh method, refresh the browser
       * so protected routes receive the latest
       * feature state.
       */

      if (
        typeof refreshFeatures !==
        "function"
      ) {
        window.setTimeout(
          () => {
            window.location.reload();
          },
          350
        );
      }

    } catch (error) {
      console.error(
        "Feature update error:",
        error
      );


      setErrorMessage(
        error.message ||
          `Unable to update ${feature.label}.`
      );


      await loadFeatureRows();

    } finally {
      setSavingKey("");
    }
  }


  /*
   * ============================================================
   * ENABLED COUNT
   * ============================================================
   */

  const enabledCount =
    useMemo(
      () =>
        ALL_FEATURES.filter(
          (feature) =>
            isEnabled(
              feature.key
            )
        ).length,
      [
        featureRows,
        contextFeatures,
      ]
    );


  /*
   * ============================================================
   * LAST CHANGED BY
   * ============================================================
   */

  function getChangedBy(
    row
  ) {
    if (!row) {
      return "Admin";
    }


    return (
      row.updated_by_email ||
      row.changed_by_email ||
      row.updated_by ||
      row.changed_by ||
      "Admin"
    );
  }


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <main className="feature-management-page">
{/* ======================================================
          HERO
      ====================================================== */}

      <section className="feature-management-hero">

        <div className="feature-management-hero-inner">

          <div className="feature-management-hero-copy">

            <span>
              SYSTEM SETTINGS
            </span>

            <h2>
              Feature Management
            </h2>

            <p>
              Control which optional
              modules are visible and
              accessible across the AEDC
              Vehicle Management System.
            </p>

          </div>


          <div className="feature-management-summary">

            <small>
              ACTIVE MODULES
            </small>

            <strong>
              {enabledCount}
              <span>
                /
                {
                  ALL_FEATURES
                    .length
                }
              </span>
            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <section className="feature-management-content">

        {/* INTRO */}

        <section className="feature-management-intro">

          <div className="feature-management-intro-icon">

            <FaSlidersH />

          </div>


          <div className="feature-management-intro-copy">

            <span>
              MODULE CONTROL
            </span>

            <h2>
              Turn Features On or Off
            </h2>

            <p>
              Turning a module OFF hides it
              from normal navigation and
              blocks protected access.
              Records are not deleted.
              Turning the module back ON
              restores access.
            </p>

          </div>


          <div className="feature-management-safety-note">

            <FaLock />

            <span>
              Core vehicle registry and the
              vehicle-return lifecycle remain
              permanently available for
              operational safety.
            </span>

          </div>

        </section>


        {/* ERROR */}

        {errorMessage && (

          <div className="feature-management-message error">

            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>

          </div>

        )}


        {/* SUCCESS */}

        {successMessage && (

          <div className="feature-management-message success">

            <span className="feature-management-success-dot" />

            <span>
              {successMessage}
            </span>

          </div>

        )}


        {/* LOADING */}

        {loading ? (

          <div className="feature-management-loading">

            <FaSpinner />

            <span>
              Loading module controls...
            </span>

          </div>

        ) : (

          <>
            {FEATURE_GROUPS.map(
              (group) => (

                <section
                  className="feature-management-group"
                  key={
                    group.key
                  }
                >

                  <div className="feature-management-group-heading">

                    <h2>
                      {group.label}
                    </h2>

                  </div>


                  <div className="feature-management-grid">

                    {group.features.map(
                      (feature) => {

                        const enabled =
                          isEnabled(
                            feature.key
                          );


                        const row =
                          featureRows[
                            feature.key
                          ];


                        const busy =
                          savingKey ===
                          feature.key;


                        return (
                          <article
                            key={
                              feature.key
                            }
                            className={
                              `feature-management-card ${
                                enabled
                                  ? "is-enabled"
                                  : "is-disabled"
                              }`
                            }
                          >

                            <div className="feature-management-card-copy">

                              <div className="feature-management-card-title-row">

                                <h3>
                                  {
                                    feature.label
                                  }
                                </h3>


                                <span
                                  className={
                                    `feature-management-status ${
                                      enabled
                                        ? "enabled"
                                        : "disabled"
                                    }`
                                  }
                                >
                                  {enabled
                                    ? "ON"
                                    : "OFF"}
                                </span>

                              </div>


                              <p>
                                {
                                  feature.description
                                }
                              </p>


                              {feature.requires
                                ?.length >
                                0 && (

                                <p className="feature-management-dependencies">

                                  Requires:{" "}

                                  {feature.requires
                                    .map(
                                      getFeatureLabel
                                    )
                                    .join(", ")}

                                </p>

                              )}


                              <span className="feature-management-meta">

                                Last changed{" "}

                                {formatDateTime(
                                  row?.updated_at
                                )}

                                {" "}by{" "}

                                {getChangedBy(
                                  row
                                )}

                              </span>

                            </div>


                            <div className="feature-management-toggle-wrapper">

                              <button
                                type="button"
                                role="switch"
                                aria-checked={
                                  enabled
                                }
                                aria-label={
                                  `${
                                    enabled
                                      ? "Disable"
                                      : "Enable"
                                  } ${
                                    feature.label
                                  }`
                                }
                                className={
                                  `feature-management-toggle ${
                                    enabled
                                      ? "enabled"
                                      : "disabled"
                                  }`
                                }
                                onClick={() =>
                                  toggleFeature(
                                    feature
                                  )
                                }
                                disabled={
                                  busy ||
                                  Boolean(
                                    savingKey &&
                                    !busy
                                  )
                                }
                              >

                                {busy ? (

                                  <FaSpinner className="feature-management-toggle-spinner" />

                                ) : (

                                  <>
                                    <span className="feature-management-toggle-label">
                                      {enabled
                                        ? "ON"
                                        : "OFF"}
                                    </span>

                                    <span className="feature-management-toggle-knob" />
                                  </>

                                )}

                              </button>

                            </div>

                          </article>
                        );
                      }
                    )}

                  </div>

                </section>
              )
            )}
          </>
        )}

      </section>

    </main>
  );
}


export default FeatureManagement;