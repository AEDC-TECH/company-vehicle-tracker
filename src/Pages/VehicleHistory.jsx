import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  FaArrowLeft,
  FaCar,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaGasPump,
  FaHistory,
  FaKey,
  FaMapMarkerAlt,
  FaRoad,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import VehicleEvidenceGallery from "../Components/VehicleEvidenceGallery";

import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/VehicleForms.css";

const inspectionLabels = {
  bodywork: "Exterior Bodywork",
  tyres: "Tyres",
  windscreen: "Windscreen",
  lights: "Lights",
};

function VehicleHistory() {
  const [history, setHistory] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    expandedTrip,
    setExpandedTrip,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from("vehicle_trips")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      setHistory(data || []);
    } catch (error) {
      console.error(
        "History load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load the vehicle logbook."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredHistory =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return history.filter(
        (trip) => {
          const matchesStatus =
            statusFilter ===
              "all" ||
            trip.status ===
              statusFilter;

          const searchable = [
            trip.booking_reference,
            trip.driver_name,
            trip.employee_number,
            trip.department,
            trip.destination,
            trip.purpose,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !searchValue ||
            searchable.includes(
              searchValue
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      history,
      search,
      statusFilter,
    ]);

  function toggleTrip(id) {
    setExpandedTrip(
      (current) =>
        current === id
          ? null
          : id
    );
  }

  function formatDate(value) {
    if (!value) {
      return "Not recorded";
    }

    return new Date(
      value
    ).toLocaleString(
      "en-ZA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function formatFuel(value) {
    if (!value) {
      return "Not recorded";
    }

    return value
      .replaceAll("-", " ")
      .toUpperCase();
  }

  function formatCondition(
    value
  ) {
    if (!value) {
      return "NOT RECORDED";
    }

    return value.toUpperCase();
  }

  function maskLicence(value) {
    if (!value) {
      return "Not recorded";
    }

    const visible =
      value.slice(-4);

    return `****${visible}`;
  }

  function formatStatus(status) {
    if (!status) {
      return "";
    }

    return status
      .replaceAll("-", " ")
      .toUpperCase();
  }

  if (loading) {
    return (
      <main className="vehicle-form-page">
        <div className="page-loading">
          Loading digital logbook...
        </div>
      </main>
    );
  }

  return (
    <main className="vehicle-form-page history-page">
      <header className="form-header">
        <div className="form-header-inner">
          <Link
            to="/"
            className="back-button"
          >
            <FaArrowLeft />
            Dashboard
          </Link>

          <div className="form-brand">
  <AEDCLogo
    compact
    className="form-brand-logo"
  />

  <span>
    Digital Logbook
  </span>
</div>
        </div>
      </header>

      <section className="form-hero">
        <div className="form-hero-inner">
          <span>
            OFFICIAL VEHICLE RECORD
          </span>

          <h1>
            Vehicle Usage History
          </h1>

          <p>
            Review completed journeys,
            active trips, vehicle
            inspections, fuel, security,
            incidents and photographic
            evidence.
          </p>
        </div>
      </section>

      <section className="history-content">
        <div className="history-toolbar">
          <div>
            <span>
              VOLKSWAGEN POLO TSI
            </span>

            <h2>
              Digital Logbook
            </h2>
          </div>

          <div className="history-filter-controls">
            <input
              type="search"
              placeholder="Search driver, booking, destination..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Records
              </option>

              <option value="in-use">
                In Use
              </option>

              <option value="returned">
                Completed
              </option>

              <option value="incident-open">
                Incident Open
              </option>
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="damage-warning">
            <FaExclamationTriangle />

            <div>
              <strong>
                Unable to load history
              </strong>

              <p>
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {!errorMessage &&
          filteredHistory.length ===
            0 && (
            <div className="empty-history">
              <FaClipboardList />

              <h3>
                No vehicle records
              </h3>

              <p>
                Vehicle trips will
                automatically appear here.
              </p>
            </div>
          )}

        <div className="policy-history-list">
          {filteredHistory.map(
            (trip) => {
              const expanded =
                expandedTrip ===
                trip.id;

              const conditionChanges =
                Array.isArray(
                  trip.condition_changes
                )
                  ? trip.condition_changes
                  : [];

              const hasIssue =
                trip.status ===
                  "incident-open" ||
                trip.new_damage ||
                trip.warning_light_reported ||
                trip.mechanical_issue_reported;

              return (
                <article
                  key={trip.id}
                  className={`policy-history-card ${
                    hasIssue
                      ? "policy-history-card-issue"
                      : ""
                  }`}
                >
                  <div className="policy-history-header">
                    <div>
                      <span className="booking-reference">
                        {trip.booking_reference ||
                          "NO BOOKING REFERENCE"}
                      </span>

                      <h3>
                        {trip.driver_name}
                      </h3>

                      <p>
                        {trip.department ||
                          "Department not recorded"}
                      </p>
                    </div>

                    <TripStatus
                      status={
                        trip.status
                      }
                    />
                  </div>

                  <div className="history-summary-grid">
                    <div>
                      <FaMapMarkerAlt />

                      <span>
                        Destination
                      </span>

                      <strong>
                        {trip.destination ||
                          "Not recorded"}
                      </strong>
                    </div>

                    <div>
                      <FaRoad />

                      <span>
                        Distance
                      </span>

                      <strong>
                        {trip.end_odometer !==
                          null &&
                        trip.end_odometer !==
                          undefined
                          ? `${Number(
                              trip.distance_travelled ||
                                Number(
                                  trip.end_odometer
                                ) -
                                  Number(
                                    trip.start_odometer ||
                                      0
                                  )
                            ).toLocaleString()} km`
                          : "Trip in progress"}
                      </strong>
                    </div>

                    <div>
                      <FaGasPump />

                      <span>
                        Fuel
                      </span>

                      <strong>
                        {formatFuel(
                          trip.fuel_before
                        )}

                        {trip.fuel_after
                          ? ` → ${formatFuel(
                              trip.fuel_after
                            )}`
                          : ""}
                      </strong>
                    </div>

                    <div>
                      <FaCar />

                      <span>
                        {trip.returned_at
                          ? "Returned"
                          : "Departure"}
                      </span>

                      <strong>
                        {formatDate(
                          trip.returned_at ||
                            trip.departure_at ||
                            trip.created_at
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="history-purpose-block">
                    <span>
                      APPROVED PURPOSE
                    </span>

                    <p>
                      {trip.purpose ||
                        "Not recorded"}
                    </p>
                  </div>

                  {conditionChanges.length >
                    0 && (
                    <div className="history-condition-alert">
                      <FaExclamationTriangle />

                      <div>
                        <strong>
                          Vehicle condition
                          changed
                        </strong>

                        {conditionChanges.map(
                          (
                            change,
                            index
                          ) => (
                            <p
                              key={`${change.key}-${index}`}
                            >
                              {change.label ||
                                change.key}
                              :{" "}
                              {formatCondition(
                                change.before
                              )}{" "}
                              →{" "}
                              {formatCondition(
                                change.after
                              )}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {trip.new_damage && (
                    <div className="history-condition-alert">
                      <FaExclamationTriangle />

                      <div>
                        <strong>
                          New Damage
                        </strong>

                        <p>
                          {trip.new_damage_description ||
                            "Damage reported without description."}
                        </p>
                      </div>
                    </div>
                  )}

                  {trip.warning_light_reported && (
                    <div className="history-condition-alert">
                      <FaExclamationTriangle />

                      <div>
                        <strong>
                          Warning Light
                          Reported
                        </strong>

                        <p>
                          {trip.warning_light_description ||
                            "Warning light reported."}
                        </p>
                      </div>
                    </div>
                  )}

                  {trip.mechanical_issue_reported && (
                    <div className="history-condition-alert">
                      <FaExclamationTriangle />

                      <div>
                        <strong>
                          Mechanical Issue
                        </strong>

                        <p>
                          {trip.mechanical_issue_description ||
                            "Mechanical issue reported."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="history-record-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        toggleTrip(
                          trip.id
                        )
                      }
                    >
                      {expanded
                        ? "Hide Full Logbook"
                        : "View Full Logbook"}
                    </button>

                    {trip.status ===
                      "incident-open" && (
                      <Link
                        to={`/incidents/report/${trip.id}`}
                        className="incident-report-button"
                      >
                        <FaExclamationTriangle />

                        Report Incident
                      </Link>
                    )}

                    {trip.status ===
                      "in-use" && (
                      <Link
                        to={`/vehicles/return/${trip.id}`}
                        className="incident-report-button"
                      >
                        Return Vehicle
                      </Link>
                    )}
                  </div>

                  {expanded && (
                    <div className="expanded-logbook">
                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaUser />

                          <div>
                            <span>
                              DRIVER
                            </span>

                            <h4>
                              Driver Details
                            </h4>
                          </div>
                        </div>

                        <div className="logbook-detail-grid">
                          <Detail
                            label="Full Name"
                            value={
                              trip.driver_name
                            }
                          />

                          <Detail
                            label="Employee Number"
                            value={
                              trip.employee_number
                            }
                          />

                          <Detail
                            label="Department"
                            value={
                              trip.department
                            }
                          />

                          <Detail
                            label="Contact Number"
                            value={
                              trip.phone
                            }
                          />

                          <Detail
                            label="Driver Licence"
                            value={maskLicence(
                              trip.driver_license_number
                            )}
                          />

                          <Detail
                            label="Booking Reference"
                            value={
                              trip.booking_reference
                            }
                          />
                        </div>
                      </section>

                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaRoad />

                          <div>
                            <span>
                              TRIP
                            </span>

                            <h4>
                              Journey Details
                            </h4>
                          </div>
                        </div>

                        <div className="logbook-detail-grid">
                          <Detail
                            label="Departure"
                            value={formatDate(
                              trip.departure_at ||
                                trip.created_at
                            )}
                          />

                          <Detail
                            label="Expected Return"
                            value={formatDate(
                              trip.expected_return_at
                            )}
                          />

                          <Detail
                            label="Actual Return"
                            value={formatDate(
                              trip.returned_at
                            )}
                          />

                          <Detail
                            label="Destination"
                            value={
                              trip.destination
                            }
                          />

                          <Detail
                            label="Approved Purpose"
                            value={
                              trip.purpose
                            }
                          />

                          <Detail
                            label="Matches Approved Booking"
                            value={
                              trip.matches_approved_booking
                                ? "YES"
                                : "NO"
                            }
                          />

                          <Detail
                            label="Start Odometer"
                            value={`${Number(
                              trip.start_odometer ||
                                0
                            ).toLocaleString()} km`}
                          />

                          <Detail
                            label="End Odometer"
                            value={
                              trip.end_odometer !==
                                null &&
                              trip.end_odometer !==
                                undefined
                                ? `${Number(
                                    trip.end_odometer
                                  ).toLocaleString()} km`
                                : "Not recorded"
                            }
                          />

                          <Detail
                            label="Distance"
                            value={
                              trip.end_odometer !==
                                null &&
                              trip.end_odometer !==
                                undefined
                                ? `${Number(
                                    trip.distance_travelled ||
                                      Number(
                                        trip.end_odometer
                                      ) -
                                        Number(
                                          trip.start_odometer ||
                                            0
                                        )
                                  ).toLocaleString()} km`
                                : "Not completed"
                            }
                          />
                        </div>
                      </section>

                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaGasPump />

                          <div>
                            <span>
                              FUEL
                            </span>

                            <h4>
                              Fuel & Expenses
                            </h4>
                          </div>
                        </div>

                        <div className="logbook-detail-grid">
                          <Detail
                            label="Fuel Before"
                            value={formatFuel(
                              trip.fuel_before
                            )}
                          />

                          <Detail
                            label="Fuel After"
                            value={formatFuel(
                              trip.fuel_after
                            )}
                          />

                          <Detail
                            label="Fuel Purchased"
                            value={
                              trip.fuel_purchased
                                ? "YES"
                                : "NO"
                            }
                          />

                          <Detail
                            label="Fuel Amount"
                            value={
                              trip.fuel_purchased
                                ? `R${Number(
                                    trip.fuel_amount ||
                                      0
                                  ).toFixed(
                                    2
                                  )}`
                                : "N/A"
                            }
                          />

                          <Detail
                            label="Receipt Submitted"
                            value={
                              trip.fuel_receipt_submitted
                                ? "YES"
                                : "NO"
                            }
                          />

                          <Detail
                            label="Receipt Reference"
                            value={
                              trip.fuel_receipt_reference ||
                              "N/A"
                            }
                          />
                        </div>
                      </section>

                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaClipboardList />

                          <div>
                            <span>
                              CONDITION
                            </span>

                            <h4>
                              Vehicle Inspection
                            </h4>
                          </div>
                        </div>

                        <div className="condition-history-table">
                          <div className="condition-history-row condition-history-header">
                            <span>
                              Inspection
                            </span>

                            <span>
                              Before
                            </span>

                            <span>
                              After
                            </span>
                          </div>

                          {Object.keys(
                            inspectionLabels
                          ).map(
                            (key) => (
                              <div
                                key={key}
                                className="condition-history-row"
                              >
                                <strong>
                                  {
                                    inspectionLabels[
                                      key
                                    ]
                                  }
                                </strong>

                                <span>
                                  {formatCondition(
                                    trip
                                      .condition_before?.[
                                      key
                                    ]
                                  )}
                                </span>

                                <span>
                                  {formatCondition(
                                    trip
                                      .condition_after?.[
                                      key
                                    ]
                                  )}
                                </span>
                              </div>
                            )
                          )}
                        </div>

                        {trip.pre_existing_damage && (
                          <Note
                            title="Pre-Existing Damage"
                            text={
                              trip.pre_existing_damage_description
                            }
                          />
                        )}

                        {trip.pre_use_notes && (
                          <Note
                            title="Pre-Use Notes"
                            text={
                              trip.pre_use_notes
                            }
                          />
                        )}

                        {trip.new_damage && (
                          <Note
                            title="New Damage"
                            text={
                              trip.new_damage_description
                            }
                          />
                        )}

                        {trip.warning_light_reported && (
                          <Note
                            title="Warning Light"
                            text={
                              trip.warning_light_description
                            }
                          />
                        )}

                        {trip.mechanical_issue_reported && (
                          <Note
                            title="Mechanical Issue"
                            text={
                              trip.mechanical_issue_description
                            }
                          />
                        )}

                        {trip.post_use_notes && (
                          <Note
                            title="Post-Use Notes"
                            text={
                              trip.post_use_notes
                            }
                          />
                        )}
                      </section>

                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaMapMarkerAlt />

                          <div>
                            <span>
                              PARKING
                            </span>

                            <h4>
                              Parking & Location
                            </h4>
                          </div>
                        </div>

                        <div className="logbook-detail-grid">
                          <Detail
                            label="Expected Parking"
                            value={
                              trip.expected_parking_location
                            }
                          />

                          <Detail
                            label="Return Parking"
                            value={
                              trip.return_parking_location
                            }
                          />

                          <Detail
                            label="Returned to Designated Bay"
                            value={
                              trip.returned_to_designated_bay
                                ? "YES"
                                : "NO"
                            }
                          />

                          <Detail
                            label="Alternative Parking Approved"
                            value={
                              trip.alternative_parking_approved
                                ? "YES"
                                : "NO"
                            }
                          />

                          <Detail
                            label="Out of Province"
                            value={
                              trip.out_of_province
                                ? "YES"
                                : "NO"
                            }
                          />

                          <Detail
                            label="Approved Overnight Location"
                            value={
                              trip.approved_overnight_location
                            }
                          />
                        </div>

                        {trip.alternative_parking_reason && (
                          <Note
                            title="Alternative Parking Reason"
                            text={
                              trip.alternative_parking_reason
                            }
                          />
                        )}

                        {trip.approved_itinerary && (
                          <Note
                            title="Approved Itinerary"
                            text={
                              trip.approved_itinerary
                            }
                          />
                        )}
                      </section>

                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaShieldAlt />

                          <div>
                            <span>
                              SECURITY
                            </span>

                            <h4>
                              Vehicle Security
                            </h4>
                          </div>
                        </div>

                        <div className="security-history-grid">
                          <SecurityRecord
                            label="Vehicle Locked"
                            value={
                              trip.vehicle_locked
                            }
                          />

                          <SecurityRecord
                            label="Windows Closed"
                            value={
                              trip.windows_closed
                            }
                          />

                          <SecurityRecord
                            label="Personal Belongings Removed"
                            value={
                              trip.personal_belongings_removed
                            }
                          />

                          <SecurityRecord
                            label="Company Property Removed"
                            value={
                              trip.company_property_removed
                            }
                          />

                          <SecurityRecord
                            label="Vehicle Secured"
                            value={
                              trip.vehicle_secured_confirmed
                            }
                          />

                          <SecurityRecord
                            label="Return Condition Confirmed"
                            value={
                              trip.return_condition_confirmed
                            }
                          />
                        </div>
                      </section>

                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaKey />

                          <div>
                            <span>
                              KEY CONTROL
                            </span>

                            <h4>
                              Key Handover
                            </h4>
                          </div>
                        </div>

                        <div className="logbook-detail-grid">
                          <Detail
                            label="Keys Returned"
                            value={
                              trip.keys_returned
                                ? "YES"
                                : "NO"
                            }
                          />

                          <Detail
                            label="Keys Returned To"
                            value={
                              trip.keys_returned_to
                            }
                          />
                        </div>
                      </section>

                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaCheckCircle />

                          <div>
                            <span>
                              DECLARATIONS
                            </span>

                            <h4>
                              Driver Compliance
                            </h4>
                          </div>
                        </div>

                        <div className="security-history-grid">
                          <SecurityRecord
                            label="Valid Licence Confirmed"
                            value={
                              trip.license_valid_confirmed
                            }
                          />

                          <SecurityRecord
                            label="Fit to Drive"
                            value={
                              trip.fit_to_drive_confirmed
                            }
                          />

                          <SecurityRecord
                            label="Authorized Driver"
                            value={
                              trip.authorized_driver_confirmed
                            }
                          />

                          <SecurityRecord
                            label="Policy Acknowledged"
                            value={
                              trip.policy_acknowledged_confirmed
                            }
                          />

                          <SecurityRecord
                            label="Information Accurate"
                            value={
                              trip.information_accuracy_confirmed
                            }
                          />
                        </div>
                      </section>

                      <section className="logbook-detail-section">
                        <div className="logbook-section-heading">
                          <FaCar />

                          <div>
                            <span>
                              EVIDENCE
                            </span>

                            <h4>
                              Photos & Supporting Records
                            </h4>
                          </div>
                        </div>

                        <VehicleEvidenceGallery
                          tripId={
                            trip.id
                          }
                        />
                      </section>

                      {hasIssue && (
                        <section className="logbook-detail-section">
                          <div className="incident-return-warning">
                            <FaExclamationTriangle />

                            <div>
                              <strong>
                                Incident Follow-Up Required
                              </strong>

                              <p>
                                This trip contains a
                                reported vehicle issue.
                                The Polo should remain
                                unavailable until the
                                issue has been reviewed.
                              </p>
                            </div>
                          </div>

                          {trip.status ===
                            "incident-open" && (
                            <Link
                              to={`/incidents/report/${trip.id}`}
                              className="incident-report-button"
                            >
                              <FaExclamationTriangle />

                              Complete Incident Report
                            </Link>
                          )}
                        </section>
                      )}
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      </section>
    </main>
  );
}

function Detail({
  label,
  value,
}) {
  return (
    <div>
      <span>{label}</span>

      <strong>
        {value === null ||
        value === undefined ||
        value === ""
          ? "Not recorded"
          : value}
      </strong>
    </div>
  );
}

function Note({
  title,
  text,
}) {
  if (!text) {
    return null;
  }

  return (
    <div className="logbook-note">
      <strong>
        {title}
      </strong>

      <p>{text}</p>
    </div>
  );
}

function SecurityRecord({
  label,
  value,
}) {
  return (
    <div
      className={`security-history-item ${
        value
          ? "security-history-ok"
          : "security-history-warning"
      }`}
    >
      {value ? (
        <FaCheckCircle />
      ) : (
        <FaExclamationTriangle />
      )}

      <span>
        {label}
      </span>

      <strong>
        {value
          ? "YES"
          : "NO"}
      </strong>
    </div>
  );
}

function TripStatus({
  status,
}) {
  if (
    status ===
    "incident-open"
  ) {
    return (
      <span className="trip-record-status trip-record-incident">
        <FaExclamationTriangle />

        INCIDENT OPEN
      </span>
    );
  }

  if (status === "in-use") {
    return (
      <span className="trip-record-status trip-record-in-use">
        <FaCar />

        IN USE
      </span>
    );
  }

  return (
    <span className="trip-record-status trip-record-complete">
      <FaCheckCircle />

      {status
        ? status
            .replaceAll(
              "-",
              " "
            )
            .toUpperCase()
        : "COMPLETED"}
    </span>
  );
}

export default VehicleHistory;