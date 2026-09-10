import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  FaArrowLeft,
  FaCar,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaEye,
  FaPlay,
  FaSearch,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/VehicleRequests.css";

function VehicleRequests() {
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from("vehicle_requests")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (requestError) {
        throw requestError;
      }

      const {
        data: vehicleData,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select(
          "id, make, model, registration, status, active"
        );

      if (vehicleError) {
        throw vehicleError;
      }

      setRequests(requestData || []);
      setVehicles(vehicleData || []);
    } catch (error) {
      console.error(
        "Vehicle requests loading error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load vehicle requests."
      );
    } finally {
      setLoading(false);
    }
  }

  function getVehicle(vehicleId) {
    return vehicles.find(
      (vehicle) => vehicle.id === vehicleId
    );
  }

  function formatDate(value) {
    if (!value) {
      return "Not recorded";
    }

    return new Intl.DateTimeFormat("en-ZA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
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
      case "pending":
        return "vehicle-request-status-pending";

      case "approved":
        return "vehicle-request-status-approved";

      case "declined":
        return "vehicle-request-status-declined";

      case "cancelled":
        return "vehicle-request-status-cancelled";

      case "completed":
        return "vehicle-request-status-completed";

      default:
        return "";
    }
  }

  const filteredRequests = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      if (
        statusFilter !== "all" &&
        request.status !== statusFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const vehicle = getVehicle(
        request.vehicle_id
      );

      const searchableText = [
        request.booking_reference,
        request.requested_driver_name,
        request.employee_number,
        request.department,
        request.destination,
        request.purpose,
        vehicle?.make,
        vehicle?.model,
        vehicle?.registration,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        normalizedSearch
      );
    });
  }, [
    requests,
    vehicles,
    searchTerm,
    statusFilter,
  ]);

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "approved"
  ).length;

  const completedCount = requests.filter(
    (request) => request.status === "completed"
  ).length;

  return (
    <main className="vehicle-requests-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="vehicle-requests-header">
        <div className="vehicle-requests-header-inner">
          <div className="vehicle-requests-header-left">
            <Link
              to="/"
              className="vehicle-requests-back-button"
              aria-label="Back to dashboard"
            >
              <FaArrowLeft />
            </Link>

            <AEDCLogo
              compact
              className="vehicle-requests-logo"
            />

            <div className="vehicle-requests-heading">
              <span>
                AEDC VEHICLE MANAGEMENT
              </span>

              <h1>
                Vehicle Requests
              </h1>

              <p>
                Review, approve and process company
                vehicle bookings.
              </p>
            </div>
          </div>

          <Link
            to="/request-vehicle"
            className="vehicle-requests-new-button"
          >
            <FaCar />
            New Request
          </Link>
        </div>
      </header>

      <section className="vehicle-requests-content">
        {/* =====================================================
            ERROR
        ===================================================== */}

        {errorMessage && (
          <div className="vehicle-requests-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <section className="vehicle-requests-summary">
          <article>
            <FaClipboardList />

            <div>
              <span>
                Total Requests
              </span>

              <strong>
                {requests.length}
              </strong>
            </div>
          </article>

          <article>
            <FaClock />

            <div>
              <span>
                Pending
              </span>

              <strong>
                {pendingCount}
              </strong>
            </div>
          </article>

          <article>
            <FaCheckCircle />

            <div>
              <span>
                Approved
              </span>

              <strong>
                {approvedCount}
              </strong>
            </div>
          </article>

          <article>
            <FaCar />

            <div>
              <span>
                Completed
              </span>

              <strong>
                {completedCount}
              </strong>
            </div>
          </article>
        </section>

        {/* =====================================================
            FILTERS
        ===================================================== */}

        <section className="vehicle-requests-toolbar">
          <div className="vehicle-requests-search">
            <FaSearch />

            <input
              type="text"
              placeholder="Search booking, driver, destination, vehicle..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
            />
          </div>

          <select
            className="vehicle-requests-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Statuses
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="declined">
              Declined
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </section>

        {/* =====================================================
            REQUESTS
        ===================================================== */}

        <section className="vehicle-requests-section">
          <div className="vehicle-requests-section-heading">
            <span>
              REQUEST REGISTER
            </span>

            <h2>
              Company Vehicle Bookings
            </h2>

            <p>
              {filteredRequests.length} request
              {filteredRequests.length === 1
                ? ""
                : "s"}{" "}
              displayed.
            </p>
          </div>

          {loading ? (
            <div className="vehicle-requests-empty">
              <FaCar />

              <h3>
                Loading requests...
              </h3>

              <p>
                Retrieving vehicle bookings.
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="vehicle-requests-empty">
              <FaClipboardList />

              <h3>
                No vehicle requests found
              </h3>

              <p>
                There are currently no requests
                matching your filters.
              </p>
            </div>
          ) : (
            <div className="vehicle-requests-list">
              {filteredRequests.map(
                (request) => {
                  const vehicle =
                    getVehicle(
                      request.vehicle_id
                    );

                  return (
                    <article
                      key={request.id}
                      className="vehicle-request-card"
                    >
                      {/* =====================================
                          TOP
                      ===================================== */}

                      <div className="vehicle-request-card-top">
                        <div>
                          <span className="vehicle-request-reference">
                            {request.booking_reference ||
                              "BOOKING REFERENCE"}
                          </span>

                          <h3>
                            {request.requested_driver_name ||
                              "Driver not recorded"}
                          </h3>

                          <p>
                            {request.department ||
                              "Department not recorded"}
                          </p>
                        </div>

                        <span
                          className={`vehicle-request-status ${getStatusClass(
                            request.status
                          )}`}
                        >
                          {formatStatus(
                            request.status
                          )}
                        </span>
                      </div>

                      {/* =====================================
                          DETAILS
                      ===================================== */}

                      <div className="vehicle-request-details-grid">
                        <div>
                          <span>
                            Vehicle
                          </span>

                          <strong>
                            {vehicle
                              ? `${vehicle.make} ${vehicle.model}`
                              : "Vehicle not assigned"}
                          </strong>

                          <small>
                            {vehicle?.registration ||
                              "Registration not recorded"}
                          </small>
                        </div>

                        <div>
                          <span>
                            Destination
                          </span>

                          <strong>
                            {request.destination ||
                              "Not recorded"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Departure
                          </span>

                          <strong>
                            {formatDate(
                              request.requested_departure_at
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Return
                          </span>

                          <strong>
                            {formatDate(
                              request.requested_return_at
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* =====================================
                          PURPOSE
                      ===================================== */}

                      <div className="vehicle-request-purpose">
                        <span>
                          BUSINESS PURPOSE
                        </span>

                        <p>
                          {request.purpose ||
                            "No purpose recorded."}
                        </p>
                      </div>

                      {request.out_of_province && (
                        <div className="vehicle-request-warning">
                          <FaExclamationTriangle />

                          <span>
                            Out-of-province travel
                            requires prior approval
                            and itinerary compliance.
                          </span>
                        </div>
                      )}

                      {/* =====================================
                          BUTTONS
                      ===================================== */}

                      <div className="vehicle-request-card-actions">
                        <Link
                          to={`/requests/${request.id}`}
                          className="vehicle-request-view-button"
                        >
                          <FaEye />

                          {request.status ===
                          "pending"
                            ? "Review Request"
                            : "View Request"}
                        </Link>

                        {request.status ===
                          "approved" && (
                          <Link
                            to={`/checkout/${request.id}`}
                            className="vehicle-request-preuse-button"
                          >
                            <FaPlay />
                            Pre-Use Logbook
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default VehicleRequests;