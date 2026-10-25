import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  FaArrowLeft,
  FaCar,
  FaCheckCircle,
  FaClipboardCheck,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaHistory,
  FaMapMarkerAlt,
  FaSearch,
  FaTimesCircle,
} from "react-icons/fa";

import { listVehicleRequestsForEmployee } from "../lib/vehicleRequestLookup";
import { listVehicleTripsForEmployee } from "../lib/vehicleTripLookup";
import { listVehiclesForEmployee } from "../lib/vehicleLookup";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/EmployeeMyRequests.css";

function EmployeeMyRequests() {
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedEmployeeNumber =
      localStorage.getItem("aedc_employee_number") || "";

    const savedEmployeeName =
      localStorage.getItem("aedc_employee_name") || "";

    if (!savedEmployeeNumber) {
      navigate("/employee", {
        replace: true,
      });

      return;
    }

    setEmployeeNumber(savedEmployeeNumber);
    setEmployeeName(savedEmployeeName);

    loadData(savedEmployeeNumber);
  }, [navigate]);

  async function loadData(number) {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        requestData,
        vehicleData,
        tripResult,
      ] = await Promise.all([
        listVehicleRequestsForEmployee(
          number
        ),

        listVehiclesForEmployee(
          number
        ),

        listVehicleTripsForEmployee(
          number
        ),
      ]);

      setRequests(requestData || []);
      setVehicles(vehicleData || []);
      setTrips(tripResult || []);

      const detectedName =
        requestData?.[0]?.requested_driver_name ||
        tripResult?.[0]?.driver_name ||
        savedNameFallback();

      if (detectedName) {
        setEmployeeName(detectedName);

        localStorage.setItem(
          "aedc_employee_name",
          detectedName
        );
      }
    } catch (error) {
      console.error(
        "Employee My Requests error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load your vehicle requests."
      );
    } finally {
      setLoading(false);
    }
  }

  function savedNameFallback() {
    return (
      localStorage.getItem("aedc_employee_name") ||
      ""
    );
  }

  function getVehicle(vehicleId) {
    return vehicles.find(
      (vehicle) =>
        vehicle.id === vehicleId
    );
  }

  function getTripForRequest(requestId) {
    return trips.find(
      (trip) =>
        trip.request_id === requestId
    );
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
        return "employee-myrequest-status-pending";

      case "approved":
        return "employee-myrequest-status-approved";

      case "declined":
        return "employee-myrequest-status-declined";

      case "completed":
        return "employee-myrequest-status-completed";

      case "cancelled":
        return "employee-myrequest-status-cancelled";

      default:
        return "";
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case "pending":
        return <FaClock />;

      case "approved":
        return <FaCheckCircle />;

      case "declined":
        return <FaTimesCircle />;

      case "completed":
        return <FaCheckCircle />;

      default:
        return <FaClipboardList />;
    }
  }

  const filteredRequests = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const vehicle =
        getVehicle(request.vehicle_id);

      const searchText = [
        request.booking_reference,
        request.destination,
        request.purpose,
        request.status,
        vehicle?.make,
        vehicle?.model,
        vehicle?.registration,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchText.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    requests,
    vehicles,
    searchTerm,
    statusFilter,
  ]);

  const pendingCount =
    requests.filter(
      (request) =>
        request.status === "pending"
    ).length;

  const approvedCount =
    requests.filter(
      (request) =>
        request.status === "approved"
    ).length;

  const completedCount =
    requests.filter(
      (request) =>
        request.status === "completed"
    ).length;

  return (
    <main className="employee-myrequests-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="employee-myrequests-header">
        <div className="employee-myrequests-header-inner">
          <div className="employee-myrequests-header-left">
            <Link
              to="/employee"
              className="employee-myrequests-back"
              aria-label="Back to employee portal"
            >
              <FaArrowLeft />
            </Link>

            <AEDCLogo
              compact
              className="employee-myrequests-logo"
            />

            <div>
              <span>
                AEDC VEHICLE MANAGEMENT
              </span>

              <h1>
                My Vehicle Requests
              </h1>

              <p>
                Employee Vehicle Portal
              </p>
            </div>
          </div>

          <Link
            to="/employee/request-vehicle"
            className="employee-myrequests-new"
          >
            <FaCar />
            Request Vehicle
          </Link>
        </div>
      </header>

      <section className="employee-myrequests-content">
        {/* =================================================
            INTRO
        ================================================= */}

        <section className="employee-myrequests-intro">
          <div>
            <span>
              MY BOOKINGS
            </span>

            <h2>
              Vehicle Request History
            </h2>

            <p>
              {employeeName
                ? `${employeeName} · ${employeeNumber}`
                : `Employee ${employeeNumber}`}
            </p>
          </div>
        </section>

        {errorMessage && (
          <div className="employee-myrequests-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="employee-myrequests-summary">
          <article>
            <div className="employee-myrequests-summary-icon">
              <FaClipboardList />
            </div>

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
            <div className="employee-myrequests-summary-icon">
              <FaClock />
            </div>

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
            <div className="employee-myrequests-summary-icon">
              <FaCheckCircle />
            </div>

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
            <div className="employee-myrequests-summary-icon">
              <FaHistory />
            </div>

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

        {/* =================================================
            FILTER BAR
        ================================================= */}

        <section className="employee-myrequests-tools">
          <div className="employee-myrequests-search">
            <FaSearch />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search booking, vehicle, destination..."
            />
          </div>

          <select
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

        {/* =================================================
            REQUESTS
        ================================================= */}

        <section className="employee-myrequests-section">
          <div className="employee-myrequests-section-heading">
            <span>
              REQUESTS
            </span>

            <h2>
              Your Vehicle Requests
            </h2>

            <p>
              Approved requests require
              a pre-use inspection before
              the vehicle can be taken.
            </p>
          </div>

          {loading ? (
            <div className="employee-myrequests-empty">
              <FaCar />

              <h3>
                Loading requests...
              </h3>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="employee-myrequests-empty">
              <FaClipboardList />

              <h3>
                No requests found
              </h3>

              <p>
                You don't currently have
                any vehicle requests matching
                this filter.
              </p>

              <Link
                to="/employee/request-vehicle"
              >
                Request a Vehicle
              </Link>
            </div>
          ) : (
            <div className="employee-myrequests-list">
              {filteredRequests.map(
                (request) => {
                  const vehicle =
                    getVehicle(
                      request.vehicle_id
                    );

                  const trip =
                    getTripForRequest(
                      request.id
                    );

                  const hasTrip =
                    Boolean(trip);

                  const canInspect =
                    request.status ===
                      "approved" &&
                    !hasTrip;

                  const isInUse =
                    trip?.status ===
                      "in-use" ||
                    trip?.status ===
                      "incident-open";

                  const isReturned =
                    trip?.status ===
                    "returned";

                  return (
                    <article
                      key={request.id}
                      className="employee-myrequest-card"
                    >
                      {/* ===================================
                          TOP
                      =================================== */}

                      <div className="employee-myrequest-top">
                        <div className="employee-myrequest-vehicle">
                          <div className="employee-myrequest-car-icon">
                            <FaCar />
                          </div>

                          <div>
                            <span>
                              {request.booking_reference ||
                                "BOOKING"}
                            </span>

                            <h3>
                              {vehicle
                                ? `${vehicle.make} ${vehicle.model}`
                                : "Company Vehicle"}
                            </h3>

                            <p>
                              {vehicle?.registration ||
                                "Registration not recorded"}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`employee-myrequest-status ${getStatusClass(
                            request.status
                          )}`}
                        >
                          {getStatusIcon(
                            request.status
                          )}

                          {formatStatus(
                            request.status
                          )}
                        </div>
                      </div>

                      {/* ===================================
                          JOURNEY
                      =================================== */}

                      <div className="employee-myrequest-details">
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
                            Requested Departure
                          </span>

                          <strong>
                            {formatDate(
                              request.requested_departure_at
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Expected Return
                          </span>

                          <strong>
                            {formatDate(
                              request.requested_return_at
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Request Source
                          </span>

                          <strong>
                            {request.request_source ===
                            "employee"
                              ? "Employee Portal"
                              : "Facilities Manager"}
                          </strong>
                        </div>
                      </div>

                      {/* ===================================
                          PURPOSE
                      =================================== */}

                      <div className="employee-myrequest-purpose">
                        <div>
                          <FaMapMarkerAlt />

                          <span>
                            Business Purpose
                          </span>
                        </div>

                        <p>
                          {request.purpose ||
                            "No purpose recorded."}
                        </p>
                      </div>

                      {/* ===================================
                          DECLINE
                      =================================== */}

                      {request.status ===
                        "declined" && (
                        <div className="employee-myrequest-decline">
                          <FaTimesCircle />

                          <div>
                            <strong>
                              Request Declined
                            </strong>

                            <p>
                              {request.decline_reason ||
                                request.declined_reason ||
                                "No decline reason was recorded."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ===================================
                          APPROVED
                      =================================== */}

                      {canInspect && (
                        <div className="employee-myrequest-inspection-warning">
                          <FaClipboardCheck />

                          <div>
                            <strong>
                              Pre-Use Inspection Required
                            </strong>

                            <p>
                              Your booking has
                              been approved. You
                              must inspect the
                              vehicle and complete
                              the digital pre-use
                              logbook before taking
                              the vehicle.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ===================================
                          ACTIVE TRIP
                      =================================== */}

                      {isInUse && (
                        <div className="employee-myrequest-trip-status">
                          <FaCar />

                          <div>
                            <strong>
                              Vehicle Currently In Use
                            </strong>

                            <p>
                              The pre-use inspection
                              has been completed and
                              this vehicle is currently
                              checked out under your
                              employee number.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ===================================
                          RETURNED
                      =================================== */}

                      {isReturned && (
                        <div className="employee-myrequest-completed">
                          <FaCheckCircle />

                          <div>
                            <strong>
                              Trip Completed
                            </strong>

                            <p>
                              The vehicle has been
                              returned and the
                              post-use inspection
                              has been completed.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ===================================
                          EXTRA TRAVEL DETAILS
                      =================================== */}

                      {(request.out_of_province ||
                        request.itinerary ||
                        request.overnight_location) && (
                        <div className="employee-myrequest-travel">
                          <h4>
                            Additional Travel Details
                          </h4>

                          <div className="employee-myrequest-travel-grid">
                            <div>
                              <span>
                                Out of Province
                              </span>

                              <strong>
                                {request.out_of_province
                                  ? "Yes"
                                  : "No"}
                              </strong>
                            </div>

                            {request.itinerary && (
                              <div>
                                <span>
                                  Itinerary
                                </span>

                                <strong>
                                  {request.itinerary}
                                </strong>
                              </div>
                            )}

                            {request.overnight_location && (
                              <div>
                                <span>
                                  Overnight Parking
                                </span>

                                <strong>
                                  {
                                    request.overnight_location
                                  }
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ===================================
                          APPROVAL DETAILS
                      =================================== */}

                      {request.status ===
                        "approved" && (
                        <div className="employee-myrequest-approval-details">
                          <div>
                            <span>
                              Approved By
                            </span>

                            <strong>
                              {request.approved_by ||
                                request.approved_by_name ||
                                "Facilities Manager"}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Approved On
                            </span>

                            <strong>
                              {formatDate(
                                request.approved_at
                              )}
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* ===================================
                          ACTIONS
                      =================================== */}

                      <div className="employee-myrequest-actions">
                        {request.status ===
                          "pending" && (
                          <div className="employee-myrequest-waiting">
                            <FaClock />
                            Waiting for Facilities
                            Manager approval
                          </div>
                        )}

                        {canInspect && (
                          <Link
                            to={`/employee/pre-inspection/${request.id}`}
                            className="employee-myrequest-primary-action"
                          >
                            <FaClipboardCheck />
                            Start Pre-Use Inspection
                          </Link>
                        )}

                        {isInUse && (
                          <>
                            <Link
                              to={`/employee/return/${trip.id}`}
                              className="employee-myrequest-primary-action"
                            >
                              <FaCar />
                              Return Vehicle
                            </Link>

                            <Link
                              to={`/incidents/report/${trip.id}`}
                              className="employee-myrequest-incident-action"
                            >
                              <FaExclamationTriangle />
                              Report Incident
                            </Link>
                          </>
                        )}

                        {isReturned && (
                          <Link
                            to="/employee/my-history"
                            className="employee-myrequest-secondary-action"
                          >
                            <FaHistory />
                            View Trip History
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

        {/* =================================================
            STATUS GUIDE
        ================================================= */}

        <section className="employee-myrequests-guide">
          <h3>
            What do the statuses mean?
          </h3>

          <div className="employee-myrequests-guide-grid">
            <div>
              <FaClock />

              <div>
                <strong>
                  Pending
                </strong>

                <span>
                  Waiting for Facilities
                  Manager review.
                </span>
              </div>
            </div>

            <div>
              <FaCheckCircle />

              <div>
                <strong>
                  Approved
                </strong>

                <span>
                  Complete the pre-use
                  inspection before taking
                  the vehicle.
                </span>
              </div>
            </div>

            <div>
              <FaTimesCircle />

              <div>
                <strong>
                  Declined
                </strong>

                <span>
                  The request was not
                  authorized.
                </span>
              </div>
            </div>

            <div>
              <FaHistory />

              <div>
                <strong>
                  Completed
                </strong>

                <span>
                  Vehicle was used and
                  successfully returned.
                </span>
              </div>
            </div>
          </div>
        </section>
      </section>

      <footer className="employee-myrequests-footer">
        AEDC Company Vehicle Management System
      </footer>
    </main>
  );
}

export default EmployeeMyRequests;