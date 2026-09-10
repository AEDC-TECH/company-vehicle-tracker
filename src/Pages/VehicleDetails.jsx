import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaHistory,
  FaMapMarkerAlt,
  FaRoad,
  FaTimesCircle,
  FaUserTie,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/VehicleDetails.css";

function VehicleDetails() {
  const { vehicleId } = useParams();

  const [vehicle, setVehicle] = useState(null);
  const [trips, setTrips] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadVehicleDetails();
  }, [vehicleId]);

  async function loadVehicleDetails() {
    try {
      setLoading(true);
      setErrorMessage("");

      // ==========================================
      // LOAD VEHICLE
      // ==========================================

      const {
        data: vehicleData,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .single();

      if (vehicleError) {
        throw vehicleError;
      }

      setVehicle(vehicleData);

      // ==========================================
      // LOAD VEHICLE TRIPS
      // ==========================================

      const {
        data: tripData,
        error: tripError,
      } = await supabase
        .from("vehicle_trips")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", {
          ascending: false,
        });

      if (tripError) {
        throw tripError;
      }

      setTrips(tripData || []);

      // ==========================================
      // LOAD VEHICLE INCIDENTS
      // ==========================================

      const {
        data: incidentData,
        error: incidentError,
      } = await supabase
        .from("vehicle_incidents")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", {
          ascending: false,
        });

      if (incidentError) {
        throw incidentError;
      }

      setIncidents(incidentData || []);
    } catch (error) {
      console.error(
        "Vehicle details error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load vehicle details."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) {
      return "Not recorded";
    }

    return new Intl.DateTimeFormat(
      "en-ZA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(date));
  }

  function formatStatus(status) {
    if (!status) {
      return "UNKNOWN";
    }

    return status
      .replaceAll("-", " ")
      .toUpperCase();
  }

  function getStatusClass(status) {
    switch (status) {
      case "available":
        return "vehicle-detail-status-available";

      case "in-use":
        return "vehicle-detail-status-in-use";

      case "reserved":
        return "vehicle-detail-status-reserved";

      case "maintenance":
      case "unavailable":
        return "vehicle-detail-status-unavailable";

      default:
        return "";
    }
  }

  if (loading) {
    return (
      <main className="vehicle-details-loading">
        <FaCar />

        <p>Loading vehicle...</p>
      </main>
    );
  }

  if (errorMessage || !vehicle) {
    return (
      <main className="vehicle-details-error">
        <FaExclamationTriangle />

        <h2>Vehicle could not be loaded</h2>

        <p>
          {errorMessage ||
            "The requested vehicle does not exist."}
        </p>

        <Link to="/vehicles">
          <FaArrowLeft />
          Back to Vehicles
        </Link>
      </main>
    );
  }

  const activeTrip = trips.find(
    (trip) =>
      trip.status === "in-use" ||
      trip.status === "incident-open"
  );

  const completedTrips = trips.filter(
    (trip) => trip.status === "returned"
  );

  const openIncidents = incidents.filter(
    (incident) =>
      incident.resolved !== true
  );

  return (
    <main className="vehicle-details-page">
      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="vehicle-details-header">
        <div className="vehicle-details-header-inner">
          <div className="vehicle-details-brand">
            <Link
              to="/vehicles"
              className="vehicle-details-back"
              title="Back to Company Vehicles"
            >
              <FaArrowLeft />
            </Link>

            <AEDCLogo
              compact
              className="vehicle-details-logo"
            />

            <div className="vehicle-details-header-text">
              <span>
                AEDC VEHICLE MANAGEMENT
              </span>

              <h1>
                Vehicle Details
              </h1>
            </div>
          </div>

          <Link
            to="/vehicles"
            className="vehicle-details-manage-button"
          >
            <FaCar />
            Manage Vehicles
          </Link>
        </div>
      </header>

      {/* ==========================================
          HERO
      ========================================== */}

      <section className="vehicle-details-hero">
        <div className="vehicle-details-hero-inner">
          <div className="vehicle-details-hero-icon">
            <FaCar />
          </div>

          <div className="vehicle-details-hero-copy">
            <span>
              {vehicle.classification ||
                "AEDC COMPANY VEHICLE"}
            </span>

            <h2>
              {vehicle.make} {vehicle.model}
            </h2>

            <p>
              {vehicle.registration ||
                "Registration not recorded"}
            </p>
          </div>

          <div
            className={`vehicle-detail-status ${getStatusClass(
              vehicle.status
            )}`}
          >
            {formatStatus(vehicle.status)}
          </div>
        </div>
      </section>

      <div className="vehicle-details-content">
        {/* ==========================================
            SUMMARY
        ========================================== */}

        <section className="vehicle-details-summary">
          <article>
            <div className="vehicle-summary-icon">
              <FaRoad />
            </div>

            <div>
              <span>Current Odometer</span>

              <strong>
                {Number(
                  vehicle.current_odometer || 0
                ).toLocaleString("en-ZA")}{" "}
                km
              </strong>
            </div>
          </article>

          <article>
            <div className="vehicle-summary-icon">
              {vehicle.roadworthy ? (
                <FaCheckCircle />
              ) : (
                <FaTimesCircle />
              )}
            </div>

            <div>
              <span>Roadworthy</span>

              <strong>
                {vehicle.roadworthy
                  ? "Yes"
                  : "No"}
              </strong>
            </div>
          </article>

          <article>
            <div className="vehicle-summary-icon">
              <FaHistory />
            </div>

            <div>
              <span>Total Trips</span>

              <strong>
                {trips.length}
              </strong>
            </div>
          </article>

          <article>
            <div className="vehicle-summary-icon">
              <FaExclamationTriangle />
            </div>

            <div>
              <span>Open Incidents</span>

              <strong>
                {openIncidents.length}
              </strong>
            </div>
          </article>
        </section>

        {/* ==========================================
            VEHICLE INFORMATION
        ========================================== */}

        <section className="vehicle-details-section">
          <div className="vehicle-details-section-heading">
            <span>VEHICLE RECORD</span>

            <h2>
              Vehicle Information
            </h2>

            <p>
              Registered information and current
              operational status.
            </p>
          </div>

          <div className="vehicle-information-card">
            <VehicleInformation
              icon={<FaCar />}
              label="Make"
              value={vehicle.make}
            />

            <VehicleInformation
              icon={<FaCar />}
              label="Model"
              value={vehicle.model}
            />

            <VehicleInformation
              icon={<FaClipboardList />}
              label="Registration"
              value={
                vehicle.registration ||
                "Not recorded"
              }
            />

            <VehicleInformation
              icon={<FaCar />}
              label="Classification"
              value={
                vehicle.classification ||
                "Not recorded"
              }
            />

            <VehicleInformation
              icon={<FaMapMarkerAlt />}
              label="Default Parking"
              value={
                vehicle.default_parking ||
                "Not recorded"
              }
            />

            <VehicleInformation
              icon={<FaUserTie />}
              label="Custodian"
              value={
                vehicle.custodian ||
                "Facilities Manager"
              }
            />

            <VehicleInformation
              icon={<FaUserTie />}
              label="Registered Keeper"
              value={
                vehicle.registered_keeper ||
                "Not recorded"
              }
            />

            <VehicleInformation
              icon={<FaCheckCircle />}
              label="Fleet Record"
              value={
                vehicle.active === false
                  ? "Inactive"
                  : "Active"
              }
            />
          </div>

          {vehicle.notes && (
            <div className="vehicle-details-notes">
              <span>VEHICLE NOTES</span>

              <p>{vehicle.notes}</p>
            </div>
          )}
        </section>

        {/* ==========================================
            CURRENT TRIP
        ========================================== */}

        <section className="vehicle-details-section">
          <div className="vehicle-details-section-heading">
            <span>CURRENT ACTIVITY</span>

            <h2>
              Current Trip
            </h2>
          </div>

          {!activeTrip ? (
            <div className="vehicle-details-empty">
              <FaCheckCircle />

              <div>
                <strong>
                  No active trip
                </strong>

                <p>
                  This vehicle is not currently
                  checked out.
                </p>
              </div>
            </div>
          ) : (
            <article className="vehicle-active-trip">
              <div className="vehicle-active-trip-header">
                <div>
                  <span>
                    {activeTrip.booking_reference ||
                      "ACTIVE TRIP"}
                  </span>

                  <h3>
                    {activeTrip.destination ||
                      "Destination not recorded"}
                  </h3>
                </div>

                <span
                  className={`vehicle-trip-status ${
                    activeTrip.status ===
                    "incident-open"
                      ? "vehicle-trip-incident"
                      : "vehicle-trip-in-use"
                  }`}
                >
                  {formatStatus(
                    activeTrip.status
                  )}
                </span>
              </div>

              <div className="vehicle-active-trip-grid">
                <TripDetail
                  label="Driver"
                  value={
                    activeTrip.driver_name ||
                    "Not recorded"
                  }
                />

                <TripDetail
                  label="Purpose"
                  value={
                    activeTrip.purpose ||
                    "Not recorded"
                  }
                />

                <TripDetail
                  label="Departure"
                  value={formatDate(
                    activeTrip.departure_at ||
                      activeTrip.created_at
                  )}
                />

                <TripDetail
                  label="Starting Odometer"
                  value={
                    activeTrip.start_odometer != null
                      ? `${Number(
                          activeTrip.start_odometer
                        ).toLocaleString(
                          "en-ZA"
                        )} km`
                      : "Not recorded"
                  }
                />
              </div>

              <div className="vehicle-active-trip-actions">
                {activeTrip.status ===
                  "in-use" && (
                  <Link
                    to={`/vehicles/return/${activeTrip.id}`}
                    className="vehicle-return-button"
                  >
                    Complete Vehicle Return
                  </Link>
                )}

                {activeTrip.status ===
                  "incident-open" && (
                  <Link
                    to={`/incidents/report/${activeTrip.id}`}
                    className="vehicle-incident-button"
                  >
                    <FaExclamationTriangle />
                    Incident Report
                  </Link>
                )}
              </div>
            </article>
          )}
        </section>

        {/* ==========================================
            TRIP HISTORY
        ========================================== */}

        <section className="vehicle-details-section">
          <div className="vehicle-details-section-heading vehicle-heading-row">
            <div>
              <span>LOGBOOK HISTORY</span>

              <h2>
                Recent Trips
              </h2>

              <p>
                Previous journeys recorded against
                this vehicle.
              </p>
            </div>

            <Link
              to="/history"
              className="vehicle-history-link"
            >
              <FaHistory />
              Full History
            </Link>
          </div>

          {completedTrips.length === 0 ? (
            <div className="vehicle-details-empty">
              <FaHistory />

              <div>
                <strong>
                  No completed trips
                </strong>

                <p>
                  Completed trips will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="vehicle-trip-history">
              {completedTrips
                .slice(0, 5)
                .map((trip) => (
                  <article
                    key={trip.id}
                    className="vehicle-history-row"
                  >
                    <div className="vehicle-history-main">
                      <span>
                        {trip.booking_reference ||
                          "TRIP"}
                      </span>

                      <strong>
                        {trip.destination ||
                          "Destination not recorded"}
                      </strong>

                      <p>
                        {trip.driver_name ||
                          "Driver not recorded"}
                      </p>
                    </div>

                    <div className="vehicle-history-item">
                      <span>Departure</span>

                      <strong>
                        {formatDate(
                          trip.departure_at ||
                            trip.created_at
                        )}
                      </strong>
                    </div>

                    <div className="vehicle-history-item">
                      <span>Distance</span>

                      <strong>
                        {trip.distance_travelled !=
                        null
                          ? `${Number(
                              trip.distance_travelled
                            ).toLocaleString(
                              "en-ZA"
                            )} km`
                          : "Not recorded"}
                      </strong>
                    </div>

                    <div className="vehicle-history-complete">
                      <FaCheckCircle />

                      Returned
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>

        {/* ==========================================
            INCIDENTS
        ========================================== */}

        <section className="vehicle-details-section">
          <div className="vehicle-details-section-heading">
            <span>SAFETY RECORD</span>

            <h2>
              Vehicle Incidents
            </h2>

            <p>
              Accident, damage, mechanical and
              other incident records associated
              with this vehicle.
            </p>
          </div>

          {incidents.length === 0 ? (
            <div className="vehicle-details-empty">
              <FaCheckCircle />

              <div>
                <strong>
                  No incidents recorded
                </strong>

                <p>
                  There are currently no incident
                  reports for this vehicle.
                </p>
              </div>
            </div>
          ) : (
            <div className="vehicle-incident-list">
              {incidents.map((incident) => (
                <article
                  key={incident.id}
                  className="vehicle-incident-record"
                >
                  <div className="vehicle-incident-icon">
                    <FaExclamationTriangle />
                  </div>

                  <div className="vehicle-incident-content">
                    <div className="vehicle-incident-heading">
                      <div>
                        <span>
                          INCIDENT
                        </span>

                        <h3>
                          {incident.type
                            ? formatStatus(
                                incident.type
                              )
                            : "VEHICLE INCIDENT"}
                        </h3>
                      </div>

                      <span
                        className={
                          incident.resolved
                            ? "incident-resolved"
                            : "incident-open"
                        }
                      >
                        {incident.resolved
                          ? "RESOLVED"
                          : "OPEN"}
                      </span>
                    </div>

                    <p>
                      {incident.description ||
                        "No description recorded."}
                    </p>

                    <div className="vehicle-incident-meta">
                      <span>
                        <FaCalendarAlt />

                        {formatDate(
                          incident.incident_at ||
                            incident.created_at
                        )}
                      </span>

                      {incident.location && (
                        <span>
                          <FaMapMarkerAlt />

                          {incident.location}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ==========================================
            ADMIN ACTION
        ========================================== */}

        <section className="vehicle-details-admin">
          <div>
            <span>FLEET ADMINISTRATION</span>

            <h2>
              Need to change this vehicle?
            </h2>

            <p>
              Vehicle details, fleet status and
              deactivation are managed from the
              Company Vehicles page.
            </p>
          </div>

          <Link
            to="/vehicles"
            className="vehicle-admin-button"
          >
            Manage Vehicle
          </Link>
        </section>
      </div>
    </main>
  );
}

function VehicleInformation({
  icon,
  label,
  value,
}) {
  return (
    <div className="vehicle-information-item">
      <div className="vehicle-information-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>

        <strong>
          {value || "Not recorded"}
        </strong>
      </div>
    </div>
  );
}

function TripDetail({
  label,
  value,
}) {
  return (
    <div className="vehicle-trip-detail">
      <span>{label}</span>

      <strong>
        {value || "Not recorded"}
      </strong>
    </div>
  );
}

export default VehicleDetails;