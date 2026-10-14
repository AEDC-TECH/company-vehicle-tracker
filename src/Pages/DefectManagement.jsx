import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaCar,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaSearch,
  FaShieldAlt,
  FaTimes,
  FaTools,
  FaUser,
  FaWrench,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/DefectManagement.css";


function formatDateTime(value) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}


function formatLabel(value) {
  if (!value) {
    return "Not recorded";
  }

  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function DefectManagement() {
  const [
    defects,
    setDefects,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("open");

  const [
    resolvingDefect,
    setResolvingDefect,
  ] = useState(null);

  const [
    repairNotes,
    setRepairNotes,
  ] = useState("");

  const [
    resolvedBy,
    setResolvedBy,
  ] = useState("Fleet Admin");

  const [
    returnToService,
    setReturnToService,
  ] = useState(false);


  useEffect(() => {
    loadDefects();
  }, []);


  async function loadDefects() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from("fleet_defects")
        .select(`
          *,
          vehicles (
            id,
            make,
            model,
            registration,
            status,
            roadworthy,
            active
          ),
          fleet_inspections (
            id,
            inspection_type,
            completed_at,
            odometer
          )
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      setDefects(data || []);
    } catch (error) {
      console.error(
        "Defect load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load fleet defects."
      );
    } finally {
      setLoading(false);
    }
  }


  async function updateDefectStatus(
    defect,
    status,
    notes = null,
    resolver = null,
    returnVehicle = false
  ) {
    try {
      setActionLoading(
        defect.id
      );

      setErrorMessage("");
      setSuccessMessage("");

      const {
        error,
      } = await supabase.rpc(
        "admin_update_fleet_defect",
        {
          p_defect_id:
            defect.id,

          p_status:
            status,

          p_repair_notes:
            notes,

          p_resolved_by:
            resolver,

          p_return_vehicle_to_service:
            returnVehicle,
        }
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        status === "resolved"
          ? returnVehicle
            ? "Defect resolved and vehicle returned to service."
            : "Defect marked as resolved."
          : `Defect moved to ${formatLabel(
              status
            )}.`
      );

      await loadDefects();
    } catch (error) {
      console.error(
        "Defect update error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update this defect."
      );

      throw error;
    } finally {
      setActionLoading("");
    }
  }


  function openResolve(defect) {
    setResolvingDefect(
      defect
    );

    setRepairNotes(
      defect.repair_notes || ""
    );

    setResolvedBy(
      "Fleet Admin"
    );

    setReturnToService(
      defect.vehicle_grounded === true
    );

    setErrorMessage("");
    setSuccessMessage("");
  }


  function closeResolve() {
    if (actionLoading) {
      return;
    }

    setResolvingDefect(null);
    setRepairNotes("");
    setResolvedBy("Fleet Admin");
    setReturnToService(false);
  }


  async function submitResolution(
    event
  ) {
    event.preventDefault();

    if (!resolvingDefect) {
      return;
    }

    if (!repairNotes.trim()) {
      setErrorMessage(
        "Enter repair or resolution notes before closing the defect."
      );

      return;
    }

    try {
      await updateDefectStatus(
        resolvingDefect,
        "resolved",
        repairNotes.trim(),
        resolvedBy.trim() ||
          "Fleet Admin",
        returnToService
      );

      closeResolve();
    } catch {
      // updateDefectStatus already shows the error.
    }
  }


  const stats = useMemo(() => {
    return {
      open:
        defects.filter(
          (defect) =>
            defect.status ===
              "open" ||
            defect.status ===
              "under-review"
        ).length,

      critical:
        defects.filter(
          (defect) =>
            defect.severity ===
              "critical" &&
            defect.status !==
              "resolved"
        ).length,

      repair:
        defects.filter(
          (defect) =>
            defect.status ===
            "in-repair"
        ).length,

      resolved:
        defects.filter(
          (defect) =>
            defect.status ===
            "resolved"
        ).length,
    };
  }, [defects]);


  const visibleDefects =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return defects.filter(
        (defect) => {
          if (
            filter === "open" &&
            ![
              "open",
              "under-review",
            ].includes(
              defect.status
            )
          ) {
            return false;
          }

          if (
            filter === "critical" &&
            !(
              defect.severity ===
                "critical" &&
              defect.status !==
                "resolved"
            )
          ) {
            return false;
          }

          if (
            filter === "repair" &&
            defect.status !==
              "in-repair"
          ) {
            return false;
          }

          if (
            filter === "resolved" &&
            defect.status !==
              "resolved"
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          const vehicle =
            defect.vehicles || {};

          return [
            defect.title,
            defect.description,
            defect.category,
            defect.severity,
            defect.status,
            defect.reported_by_name,
            defect
              .reported_by_employee_number,
            vehicle.make,
            vehicle.model,
            vehicle.registration,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(search)
            );
        }
      );
    }, [
      defects,
      filter,
      searchTerm,
    ]);


  return (
    <main className="defect-management-page">
      <header className="defect-header">
        <div className="defect-header-inner">
          <div className="defect-header-left">
            <Link
              to="/"
              className="defect-back-button"
            >
              <FaArrowLeft />
            </Link>

            <AEDCLogo
              compact
              className="defect-logo"
            />

            <div>
              <span>
                FLEET OPERATIONS
              </span>

              <h1>
                Defect Management
              </h1>

              <p>
                Review reported vehicle faults,
                repairs and return-to-service
                decisions.
              </p>
            </div>
          </div>
        </div>
      </header>


      <section className="defect-content">
        {errorMessage && (
          <div className="defect-message defect-message-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="defect-message defect-message-success">
            <FaCheckCircle />

            <span>
              {successMessage}
            </span>
          </div>
        )}


        <section className="defect-summary-grid">
          <article>
            <FaExclamationTriangle />

            <div>
              <span>
                Open / Review
              </span>

              <strong>
                {stats.open}
              </strong>
            </div>
          </article>

          <article>
            <FaShieldAlt />

            <div>
              <span>
                Critical Open
              </span>

              <strong>
                {stats.critical}
              </strong>
            </div>
          </article>

          <article>
            <FaTools />

            <div>
              <span>
                In Repair
              </span>

              <strong>
                {stats.repair}
              </strong>
            </div>
          </article>

          <article>
            <FaCheckCircle />

            <div>
              <span>
                Resolved
              </span>

              <strong>
                {stats.resolved}
              </strong>
            </div>
          </article>
        </section>


        <section className="defect-toolbar">
          <div className="defect-search">
            <FaSearch />

            <input
              type="search"
              value={searchTerm}
              onChange={
                (event) =>
                  setSearchTerm(
                    event.target.value
                  )
              }
              placeholder="Search vehicle, driver, category or defect..."
            />
          </div>

          <div className="defect-filter-tabs">
            {[
              ["open", "Open"],
              ["critical", "Critical"],
              ["repair", "In Repair"],
              ["resolved", "Resolved"],
              ["all", "All"],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    filter === value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(value)
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        </section>


        {loading ? (
          <section className="defect-empty">
            <FaWrench />

            <h2>
              Loading defects...
            </h2>
          </section>
        ) : visibleDefects.length ===
          0 ? (
          <section className="defect-empty">
            <FaCheckCircle />

            <h2>
              No matching defects
            </h2>

            <p>
              There are no defect records
              matching this filter.
            </p>
          </section>
        ) : (
          <section className="defect-grid">
            {visibleDefects.map(
              (defect) => {
                const vehicle =
                  defect.vehicles || {};

                const inspection =
                  defect
                    .fleet_inspections ||
                  {};

                return (
                  <article
                    key={defect.id}
                    className={`defect-card defect-severity-${defect.severity}`}
                  >
                    <div className="defect-card-top">
                      <div>
                        <span
                          className={`defect-severity-badge defect-severity-badge-${defect.severity}`}
                        >
                          {formatLabel(
                            defect.severity
                          )}
                        </span>

                        {defect.vehicle_grounded && (
                          <span className="defect-grounded-badge">
                            VEHICLE GROUNDED
                          </span>
                        )}
                      </div>

                      <span
                        className={`defect-status-badge defect-status-${defect.status}`}
                      >
                        {formatLabel(
                          defect.status
                        )}
                      </span>
                    </div>


                    <div className="defect-card-title">
                      <span>
                        {formatLabel(
                          defect.category
                        )}
                      </span>

                      <h2>
                        {defect.title}
                      </h2>

                      <p>
                        {defect.description ||
                          "No additional description recorded."}
                      </p>
                    </div>


                    <div className="defect-vehicle-box">
                      <FaCar />

                      <div>
                        <span>
                          VEHICLE
                        </span>

                        <strong>
                          {vehicle.make ||
                            "Vehicle"}{" "}
                          {vehicle.model ||
                            ""}
                        </strong>

                        <small>
                          {vehicle.registration ||
                            "Registration not recorded"}
                        </small>
                      </div>

                      <em>
                        {formatLabel(
                          vehicle.status
                        )}
                      </em>
                    </div>


                    <div className="defect-meta-grid">
                      <div>
                        <FaUser />

                        <span>
                          Reported By
                        </span>

                        <strong>
                          {defect.reported_by_name ||
                            "Not recorded"}
                        </strong>

                        <small>
                          {defect.reported_by_employee_number ||
                            ""}
                        </small>
                      </div>

                      <div>
                        <FaClock />

                        <span>
                          Reported
                        </span>

                        <strong>
                          {formatDateTime(
                            defect.created_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <FaWrench />

                        <span>
                          Inspection
                        </span>

                        <strong>
                          {formatLabel(
                            inspection.inspection_type
                          )}
                        </strong>

                        <small>
                          {inspection.odometer != null
                            ? `${Number(
                                inspection.odometer
                              ).toLocaleString(
                                "en-ZA"
                              )} km`
                            : ""}
                        </small>
                      </div>
                    </div>


                    {defect.repair_notes && (
                      <div className="defect-repair-notes">
                        <span>
                          REPAIR / RESOLUTION NOTES
                        </span>

                        <p>
                          {defect.repair_notes}
                        </p>

                        {defect.resolved_at && (
                          <small>
                            Resolved{" "}
                            {formatDateTime(
                              defect.resolved_at
                            )}
                            {defect.resolved_by
                              ? ` · ${defect.resolved_by}`
                              : ""}
                          </small>
                        )}
                      </div>
                    )}


                    {defect.status !==
                      "resolved" && (
                      <div className="defect-actions">
                        {defect.status ===
                          "open" && (
                          <button
                            type="button"
                            className="defect-secondary-action"
                            disabled={
                              actionLoading ===
                              defect.id
                            }
                            onClick={() =>
                              updateDefectStatus(
                                defect,
                                "under-review"
                              )
                            }
                          >
                            Start Review
                          </button>
                        )}

                        {[
                          "open",
                          "under-review",
                          "deferred",
                        ].includes(
                          defect.status
                        ) && (
                          <button
                            type="button"
                            className="defect-repair-action"
                            disabled={
                              actionLoading ===
                              defect.id
                            }
                            onClick={() =>
                              updateDefectStatus(
                                defect,
                                "in-repair"
                              )
                            }
                          >
                            <FaTools />
                            Send to Repair
                          </button>
                        )}

                        {!defect.vehicle_grounded &&
                          defect.status !==
                            "deferred" && (
                            <button
                              type="button"
                              className="defect-secondary-action"
                              disabled={
                                actionLoading ===
                                defect.id
                              }
                              onClick={() =>
                                updateDefectStatus(
                                  defect,
                                  "deferred"
                                )
                              }
                            >
                              Defer
                            </button>
                          )}

                        <button
                          type="button"
                          className="defect-resolve-action"
                          disabled={
                            actionLoading ===
                            defect.id
                          }
                          onClick={() =>
                            openResolve(
                              defect
                            )
                          }
                        >
                          <FaCheckCircle />
                          Resolve
                        </button>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </section>
        )}
      </section>


      {resolvingDefect && (
        <div className="defect-modal-backdrop">
          <section className="defect-modal">
            <div className="defect-modal-heading">
              <div>
                <span>
                  RESOLVE DEFECT
                </span>

                <h2>
                  {
                    resolvingDefect.title
                  }
                </h2>

                <p>
                  Record what was done before
                  closing this defect.
                </p>
              </div>

              <button
                type="button"
                onClick={closeResolve}
                disabled={
                  Boolean(actionLoading)
                }
              >
                <FaTimes />
              </button>
            </div>


            <form
              onSubmit={
                submitResolution
              }
            >
              <label>
                Repair / Resolution Notes *

                <textarea
                  value={repairNotes}
                  onChange={
                    (event) =>
                      setRepairNotes(
                        event.target.value
                      )
                  }
                  rows="5"
                  placeholder="Describe the inspection, repair or corrective action completed..."
                  required
                />
              </label>

              <label>
                Resolved By

                <input
                  type="text"
                  value={resolvedBy}
                  onChange={
                    (event) =>
                      setResolvedBy(
                        event.target.value
                      )
                  }
                  placeholder="Fleet Admin / technician name"
                />
              </label>


              {resolvingDefect
                .vehicle_grounded && (
                <label className="defect-return-service-option">
                  <input
                    type="checkbox"
                    checked={
                      returnToService
                    }
                    onChange={
                      (event) =>
                        setReturnToService(
                          event.target
                            .checked
                        )
                    }
                  />

                  <span>
                    <strong>
                      Return vehicle to
                      service
                    </strong>

                    <small>
                      The database will only
                      make the vehicle
                      AVAILABLE if it is active,
                      roadworthy and has no
                      other unresolved grounded
                      defects.
                    </small>
                  </span>
                </label>
              )}


              <div className="defect-modal-actions">
                <button
                  type="button"
                  className="defect-modal-cancel"
                  onClick={closeResolve}
                  disabled={
                    Boolean(actionLoading)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="defect-modal-resolve"
                  disabled={
                    Boolean(actionLoading)
                  }
                >
                  <FaCheckCircle />

                  {actionLoading
                    ? "Saving..."
                    : returnToService
                    ? "Resolve & Return to Service"
                    : "Resolve Defect"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


export default DefectManagement;
