import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  FaCar,
  FaClipboardCheck,
  FaClipboardList,
  FaExclamationTriangle,
  FaHistory,
  FaPlus,
  FaRoad,
  FaTruck,
  FaBox,
  FaBuilding,
  FaGasPump,
  FaTools,
  FaUsers,
  FaWrench,
  FaClock,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/VehicleDashboard.css";

function VehicleDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);


  async function loadDashboard() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =====================================================
      // LOAD ALL ACTIVE VEHICLES
      // =====================================================

      const {
        data: vehicleData,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq("active", true)
        .order("created_at", {
          ascending: true,
        });

      if (vehicleError) {
        throw vehicleError;
      }

      setVehicles(vehicleData || []);

      // =====================================================
      // PENDING REQUESTS
      // =====================================================

      const {
        data: pendingData,
        error: pendingError,
      } = await supabase
        .from("vehicle_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        });

      if (pendingError) {
        throw pendingError;
      }

      setPendingRequests(pendingData || []);

      // =====================================================
      // APPROVED REQUESTS
      // =====================================================

      const {
        data: approvedData,
        error: approvedError,
      } = await supabase
        .from("vehicle_requests")
        .select("*")
        .eq("status", "approved")
        .order("requested_departure_at", {
          ascending: true,
        });

      if (approvedError) {
        throw approvedError;
      }

      setApprovedRequests(approvedData || []);

      // =====================================================
      // ACTIVE / INCIDENT TRIPS
      // =====================================================

      const {
        data: activeTripData,
        error: activeTripError,
      } = await supabase
        .from("vehicle_trips")
        .select("*")
        .in("status", [
          "in-use",
          "incident-open",
        ])
        .order("created_at", {
          ascending: false,
        });

      if (activeTripError) {
        throw activeTripError;
      }

      setActiveTrips(activeTripData || []);
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load vehicle dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  function getVehicleActiveTrip(vehicleId) {
    return activeTrips.find(
      (trip) =>
        trip.vehicle_id === vehicleId
    );
  }

  function getVehicleApprovedRequests(vehicleId) {
    return approvedRequests.filter(
      (request) =>
        request.vehicle_id === vehicleId
    );
  }

  function getVehiclePendingRequests(vehicleId) {
    return pendingRequests.filter(
      (request) =>
        request.vehicle_id === vehicleId
    );
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
        return "vehicle-status-available";

      case "in-use":
        return "vehicle-status-in-use";

      case "reserved":
        return "vehicle-status-reserved";

      case "maintenance":
      case "unavailable":
        return "vehicle-status-unavailable";

      default:
        return "";
    }
  }

  function getVehicleReservation(
    vehicleId
  ) {
    return approvedRequests.find(
      (request) =>
        request.vehicle_id ===
          vehicleId &&
        request.preinspection_expired_at ==
          null &&
        request.preinspection_expires_at &&
        new Date(
          request.preinspection_expires_at
        ).getTime() >
          Date.now()
    );
  }


  function getReservationTimeRemaining(
    request
  ) {
    if (
      !request?.preinspection_expires_at
    ) {
      return "";
    }


    const remainingMs =
      new Date(
        request.preinspection_expires_at
      ).getTime() -
      Date.now();


    if (remainingMs <= 0) {
      return "Expired";
    }


    const totalMinutes =
      Math.ceil(
        remainingMs /
          60000
      );


    const hours =
      Math.floor(
        totalMinutes /
          60
      );


    const minutes =
      totalMinutes %
      60;


    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }


    return `${minutes} min remaining`;
  }


  function formatDate(value) {
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

  const availableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "available"
  );

  const reservedVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "reserved"
  );


  const inUseVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "in-use"
  );

  const unavailableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "unavailable" ||
      vehicle.status === "maintenance"
  );

 if (loading) {
  return (
    <main className="dashboard-loading">

      <div className="dashboard-loading-background">

        <span className="dashboard-loading-orb dashboard-loading-orb-one" />

        <span className="dashboard-loading-orb dashboard-loading-orb-two" />

        <span className="dashboard-loading-orb dashboard-loading-orb-three" />

      </div>


      <div className="dashboard-loading-card">

        <div className="dashboard-loading-brand">

          <AEDCLogo
            compact
            className="dashboard-loading-logo"
          />

          <div>

            <span>
              AEDC
            </span>

            <strong>
              Vehicle Management
            </strong>

          </div>

        </div>


        <div className="dashboard-loading-animation">

          <div className="dashboard-loading-ring dashboard-loading-ring-one" />

          <div className="dashboard-loading-ring dashboard-loading-ring-two" />


          <div className="dashboard-loading-car">

            <FaCar />

          </div>

        </div>


        <div className="dashboard-loading-road">

          <div className="dashboard-loading-road-lines">

            <span />
            <span />
            <span />
            <span />
            <span />
            <span />

          </div>

        </div>


        <div className="dashboard-loading-copy">

          <span className="dashboard-loading-label">
            AEDC VEHICLE SYSTEM
          </span>

          <h2>
            Loading Vehicle Dashboard
          </h2>

          <p>
            Retrieving fleet information,
            active trips and vehicle requests
          </p>

        </div>


        <div className="dashboard-loading-progress">

          <div className="dashboard-loading-progress-bar" />

        </div>


        <div className="dashboard-loading-dots">

          <span />
          <span />
          <span />

        </div>

      </div>

    </main>
  );
}

  return (
    <main className="dashboard-page">
      {/* ===================================================
          SHARED ADMIN NAVBAR
      =================================================== */}
      {/* ===================================================
          HERO
      =================================================== */}

      <section className="dashboard-hero">
        <div className="dashboard-hero-inner">
          <div className="dashboard-hero-copy">
            <span>
              AEDC VEHICLE MANAGEMENT
            </span>

            <h2>
              Company Vehicle Operations
            </h2>

            <p>
              Monitor vehicle availability,
              requests, current trips and fleet
              activity.
            </p>
          </div>

          <div className="dashboard-vehicle-status">
            <strong>
              {vehicles.length}
            </strong>

            <span>
              Active Fleet Vehicle
              {vehicles.length === 1
                ? ""
                : "s"}
            </span>
          </div>
        </div>
      </section>

      <div className="dashboard-content">
        {/* ===================================================
            ERROR
        =================================================== */}

        {errorMessage && (
          <div className="dashboard-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {/* ===================================================
            SUMMARY
        =================================================== */}

        <section className="dashboard-summary-grid">
          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <FaCar />
            </div>

            <div>
              <span>
                Fleet Vehicles
              </span>

              <strong>
                {vehicles.length}
              </strong>
            </div>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <FaRoad />
            </div>

            <div>
              <span>
                Available
              </span>

              <strong>
                {availableVehicles.length}
              </strong>
            </div>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon dashboard-summary-reserved-icon">
              <FaClock />
            </div>

            <div>
              <span>
                Reserved
              </span>

              <strong>
                {reservedVehicles.length}
              </strong>
            </div>
          </article>


          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <FaClipboardList />
            </div>

            <div>
              <span>
                Pending Requests
              </span>

              <strong>
                {pendingRequests.length}
              </strong>
            </div>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <FaClipboardCheck />
            </div>

            <div>
              <span>
                Active Trips
              </span>

              <strong>
                {activeTrips.length}
              </strong>
            </div>
          </article>
        </section>

        {/* ===================================================
            QUICK ACCESS
        =================================================== */}

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <span>
              QUICK ACCESS
            </span>

            <h2>
              Vehicle Operations
            </h2>
          </div>

          <div className="dashboard-actions-grid">
            <Link
              to="/request-vehicle"
              className="dashboard-action-card"
            >
              <FaPlus />

              <div>
                <strong>
                  Request Vehicle
                </strong>

                <span>
                  Submit a company vehicle request.
                </span>
              </div>
            </Link>

            <Link
              to="/requests"
              className="dashboard-action-card"
            >
              <FaClipboardList />

              <div>
                <strong>
                  Vehicle Requests
                </strong>

                <span>
                  Review pending and approved
                  requests.
                </span>
              </div>
            </Link>

            <Link
              to="/history"
              className="dashboard-action-card"
            >
              <FaHistory />

              <div>
                <strong>
                  Trip History
                </strong>

                <span>
                  View digital logbook records.
                </span>
              </div>
            </Link>

            <Link
              to="/vehicles"
              className="dashboard-action-card"
            >
              <FaCar />

              <div>
                <strong>
                  Company Vehicles
                </strong>

                <span>
                  Add, edit or manage fleet
                  vehicles.
                </span>
              </div>
            </Link>

            {/* =================================================
                NEW ADMIN EMPLOYEE MANAGEMENT
            ================================================= */}

            <Link
              to="/employees"
              className="dashboard-action-card"
            >
              <FaUsers />

              <div>
                <strong>
                  Employees
                </strong>

                <span>
                  Add employees and manage
                  company work numbers.
                </span>
              </div>
            </Link>


            <Link
              to="/drivers"
              className="dashboard-action-card"
            >
              <FaTruck />

              <div>
                <strong>
                  Driver Management
                </strong>

                <span>
                  Manage driver eligibility,
                  licences and PrDP compliance.
                </span>
              </div>
            </Link>


            <Link
              to="/defects"
              className="dashboard-action-card"
            >
              <FaWrench />

              <div>
                <strong>
                  Defect Management
                </strong>

                <span>
                  Review faults, repairs and
                  grounded vehicles.
                </span>
              </div>
            </Link>


            <Link
              to="/maintenance"
              className="dashboard-action-card"
            >
              <FaTools />

              <div>
                <strong>
                  Maintenance
                </strong>

                <span>
                  Schedule services, repairs,
                  costs and return to service.
                </span>
              </div>
            </Link>


            <Link
              to="/fuel"
              className="dashboard-action-card"
            >
              <FaGasPump />

              <div>
                <strong>
                  Fuel Management
                </strong>

                <span>
                  Track fuel purchases, litres,
                  receipts and fleet fuel spend.
                </span>
              </div>
            </Link>


            <Link
              to="/customers"
              className="dashboard-action-card"
            >
              <FaBuilding />

              <div>
                <strong>
                  Customers
                </strong>

                <span>
                  Manage transport clients,
                  contacts and billing details.
                </span>
              </div>
            </Link>


            <Link
              to="/jobs"
              className="dashboard-action-card"
            >
              <FaBox />

              <div>
                <strong>
                  Jobs & Deliveries
                </strong>

                <span>
                  Plan customer jobs, cargo,
                  collections and assignments.
                </span>
              </div>
            </Link>


            <Link
              to="/dispatch"
              className="dashboard-action-card"
            >
              <FaClipboardCheck />

              <div>
                <strong>
                  Dispatch Board
                </strong>

                <span>
                  Dispatch assigned jobs into
                  pre-trip inspection and trips.
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* ===================================================
            VEHICLES
        =================================================== */}

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <span>
              AEDC FLEET
            </span>

            <h2>
              Company Vehicles
            </h2>

            <p>
              Current status of all active AEDC
              vehicles.
            </p>
          </div>

          {vehicles.length === 0 ? (
            <div className="dashboard-empty-card">
              <FaCar />

              <h3>
                No active vehicles
              </h3>

              <p>
                Add a vehicle from the Company
                Vehicles page.
              </p>

              <Link
                to="/vehicles"
                className="dashboard-primary-button"
              >
                Manage Vehicles
              </Link>
            </div>
          ) : (
            <div className="dashboard-fleet-grid">
              {vehicles.map((vehicle) => {
                const reservation =
                  getVehicleReservation(
                    vehicle.id
                  );

                const activeTrip =
                  getVehicleActiveTrip(
                    vehicle.id
                  );

                const vehiclePending =
                  getVehiclePendingRequests(
                    vehicle.id
                  );

                const vehicleApproved =
                  getVehicleApprovedRequests(
                    vehicle.id
                  );

                return (
                  <article
                    className="dashboard-fleet-card"
                    key={vehicle.id}
                  >
                    <div className="dashboard-fleet-card-top">
                      <div className="dashboard-fleet-icon">
                        <FaCar />
                      </div>

                      <span
                        className={`dashboard-inline-status ${getStatusClass(
                          vehicle.status
                        )}`}
                      >
                        {formatStatus(
                          vehicle.status
                        )}
                      </span>
                    </div>

                    <div className="dashboard-fleet-title">
                      <span>
                        {vehicle.make}
                      </span>

                      <h3>
                        {vehicle.model}
                      </h3>

                      <p>
                        {vehicle.registration ||
                          "Registration not recorded"}
                      </p>
                    </div>

                    <div className="dashboard-fleet-info-grid">
                      <div>
                        <span>
                          Odometer
                        </span>

                        <strong>
                          {Number(
                            vehicle.current_odometer ||
                              0
                          ).toLocaleString(
                            "en-ZA"
                          )}{" "}
                          km
                        </strong>
                      </div>

                      <div>
                        <span>
                          Roadworthy
                        </span>

                        <strong>
                          {vehicle.roadworthy
                            ? "Yes"
                            : "No"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Pending
                        </span>

                        <strong>
                          {
                            vehiclePending.length
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Approved
                        </span>

                        <strong>
                          {
                            vehicleApproved.length
                          }
                        </strong>
                      </div>
                    </div>

                    {/* =====================================
                        ACTIVE TRIP
                    ===================================== */}

                    {activeTrip && (
                      <div
                        className={`dashboard-fleet-trip ${
                          activeTrip.status ===
                          "incident-open"
                            ? "dashboard-fleet-trip-incident"
                            : ""
                        }`}
                      >
                        <div className="dashboard-fleet-trip-heading">
                          <span>
                            {activeTrip.status ===
                            "incident-open"
                              ? "INCIDENT OPEN"
                              : "CURRENT TRIP"}
                          </span>

                          <strong>
                            {activeTrip.driver_name ||
                              "Driver not recorded"}
                          </strong>
                        </div>

                        <p>
                          <strong>
                            Destination:
                          </strong>{" "}
                          {activeTrip.destination ||
                            "Not recorded"}
                        </p>

                        <p>
                          <strong>
                            Purpose:
                          </strong>{" "}
                          {activeTrip.purpose ||
                            "Not recorded"}
                        </p>

                        <p>
                          <strong>
                            Started:
                          </strong>{" "}
                          {formatDate(
                            activeTrip.departure_at ||
                              activeTrip.created_at
                          )}
                        </p>

                        {activeTrip.status ===
                          "in-use" && (
                          <Link
                            to={`/vehicles/return/${activeTrip.id}`}
                            className="dashboard-fleet-return"
                          >
                            Return Vehicle
                          </Link>
                        )}

                        {activeTrip.status ===
                          "incident-open" && (
                          <Link
                            to={`/incidents/report/${activeTrip.id}?from=admin`}
                            className="dashboard-fleet-incident-button"
                          >
                            Incident Report
                          </Link>
                        )}
                      </div>
                    )}

                    {!activeTrip &&
                      vehicle.status ===
                        "available" && (
                        <div className="dashboard-fleet-ready">
                          <FaClipboardCheck />

                          <span>
                            Vehicle available for
                            approved business use.
                          </span>
                        </div>
                      )}

                    {!activeTrip &&
                      vehicle.status ===
                        "reserved" && (
                        <div className="dashboard-fleet-reserved">
                          <FaClock />

                          <div>
                            <strong>
                              Reserved for Pre-Inspection
                            </strong>

                            <span>
                              {reservation
                                ? getReservationTimeRemaining(
                                    reservation
                                  )
                                : "Awaiting pre-use inspection"}
                            </span>
                          </div>
                        </div>
                      )}


                    {!activeTrip &&
                      (vehicle.status ===
                        "unavailable" ||
                        vehicle.status ===
                          "maintenance") && (
                        <div className="dashboard-fleet-warning">
                          <FaExclamationTriangle />

                          <span>
                            Vehicle is currently
                            unavailable for use.
                          </span>
                        </div>
                      )}

                    <div className="dashboard-fleet-actions">
                      <Link
                        to={`/vehicles/${vehicle.id}`}
                        className="dashboard-fleet-view"
                      >
                        View Vehicle
                      </Link>

                      {vehicle.status ===
                        "available" && (
                        <Link
                          to="/request-vehicle"
                          className="dashboard-fleet-request"
                        >
                          Request Vehicle
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================
            APPROVED BOOKINGS
        =================================================== */}

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <span>
              APPROVED BOOKINGS
            </span>

            <h2>
              Upcoming Vehicle Use
            </h2>
          </div>

          {approvedRequests.length === 0 ? (
            <div className="dashboard-empty-card">
              <FaClipboardCheck />

              <h3>
                No approved bookings
              </h3>

              <p>
                Approved vehicle requests will
                appear here.
              </p>
            </div>
          ) : (
            <div className="dashboard-booking-list">
              {approvedRequests
                .slice(0, 5)
                .map((request) => {
                  const requestVehicle =
                    vehicles.find(
                      (vehicle) =>
                        vehicle.id ===
                        request.vehicle_id
                    );

                  return (
                    <article
                      key={request.id}
                      className="dashboard-booking-card"
                    >
                      <div className="dashboard-booking-main">
                        <span className="dashboard-booking-reference">
                          {request.booking_reference ||
                            "BOOKING"}
                        </span>

                        <strong>
                          {request.requested_driver_name ||
                            "Driver not recorded"}
                        </strong>

                        <p>
                          {request.destination ||
                            "Destination not recorded"}
                        </p>
                      </div>

                      <div className="dashboard-booking-detail">
                        <span>
                          Vehicle
                        </span>

                        <strong>
                          {requestVehicle
                            ? `${requestVehicle.make} ${requestVehicle.model}`
                            : "Vehicle"}
                        </strong>
                      </div>

                      <div className="dashboard-booking-detail">
                        <span>
                          Departure
                        </span>

                        <strong>
                          {formatDate(
                            request.requested_departure_at
                          )}
                        </strong>
                      </div>

                      <Link
                        to={`/requests/${request.id}`}
                        className="dashboard-booking-action"
                      >
                        View
                      </Link>
                    </article>
                  );
                })}
            </div>
          )}
        </section>

        {/* ===================================================
            PENDING REQUESTS
        =================================================== */}

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <span>
              PENDING APPROVAL
            </span>

            <h2>
              Vehicle Requests
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="dashboard-empty-card">
              <FaClipboardList />

              <h3>
                No pending requests
              </h3>

              <p>
                New employee vehicle requests will
                appear here.
              </p>
            </div>
          ) : (
            <div className="dashboard-booking-list">
              {pendingRequests
                .slice(0, 5)
                .map((request) => {
                  const requestVehicle =
                    vehicles.find(
                      (vehicle) =>
                        vehicle.id ===
                        request.vehicle_id
                    );

                  return (
                    <article
                      key={request.id}
                      className="dashboard-booking-card"
                    >
                      <div className="dashboard-booking-main">
                        <span className="dashboard-booking-reference">
                          {request.booking_reference ||
                            "REQUEST"}
                        </span>

                        <strong>
                          {request.requested_driver_name ||
                            "Driver not recorded"}
                        </strong>

                        <p>
                          {request.destination ||
                            "Destination not recorded"}
                        </p>
                      </div>

                      <div className="dashboard-booking-detail">
                        <span>
                          Vehicle
                        </span>

                        <strong>
                          {requestVehicle
                            ? `${requestVehicle.make} ${requestVehicle.model}`
                            : "Not assigned"}
                        </strong>
                      </div>

                      <div className="dashboard-booking-detail">
                        <span>
                          Departure
                        </span>

                        <strong>
                          {formatDate(
                            request.requested_departure_at
                          )}
                        </strong>
                      </div>

                      <Link
                        to={`/requests/${request.id}`}
                        className="dashboard-booking-action"
                      >
                        Review
                      </Link>
                    </article>
                  );
                })}
            </div>
          )}
        </section>

        {/* ===================================================
            FLEET ISSUES
        =================================================== */}

        {unavailableVehicles.length >
          0 && (
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <span>
                ATTENTION REQUIRED
              </span>

              <h2>
                Fleet Issues
              </h2>
            </div>

            <div className="dashboard-booking-list">
              {unavailableVehicles.map(
                (vehicle) => (
                  <article
                    key={vehicle.id}
                    className="dashboard-booking-card"
                  >
                    <div className="dashboard-booking-main">
                      <span className="dashboard-booking-reference">
                        VEHICLE
                      </span>

                      <strong>
                        {vehicle.make}{" "}
                        {vehicle.model}
                      </strong>

                      <p>
                        {vehicle.registration ||
                          "Registration not recorded"}
                      </p>
                    </div>

                    <div className="dashboard-booking-detail">
                      <span>
                        Status
                      </span>

                      <strong>
                        {formatStatus(
                          vehicle.status
                        )}
                      </strong>
                    </div>

                    <Link
                      to={`/vehicles/${vehicle.id}`}
                      className="dashboard-booking-action"
                    >
                      View
                    </Link>
                  </article>
                )
              )}
            </div>
          </section>
        )}
      </div>

      <footer className="dashboard-footer">
        <AEDCLogo compact />

        <p>
          African Entrepreneurship Development
          Corporation — Company Vehicle Management
        </p>
      </footer>
    </main>
  );
}

export default VehicleDashboard;