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
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGasPump,
  FaHistory,
  FaMapMarkerAlt,
  FaRoad,
  FaSearch,
  FaTachometerAlt,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import { lookupVehicleEmployee } from "../lib/employeeLookup";

import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/EmployeeMyHistory.css";


function EmployeeMyHistory() {
  const [
    employee,
    setEmployee,
  ] = useState(null);

  const [
    trips,
    setTrips,
  ] = useState([]);

  const [
    vehicles,
    setVehicles,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");


  useEffect(() => {
    loadHistory();
  }, []);


  function normalizeEmployeeNumber(
    value
  ) {
    return String(value || "")
      .trim()
      .toUpperCase();
  }


  async function loadHistory() {
    try {
      setLoading(true);

      setErrorMessage("");


      /*
       * ============================================
       * EMPLOYEE SESSION
       * ============================================
       */

      const storedEmployeeNumber =
        normalizeEmployeeNumber(
          localStorage.getItem(
            "aedc_employee_number"
          )
        );


      if (!storedEmployeeNumber) {
        throw new Error(
          "Your employee session could not be found. Please return to the Employee Portal and enter your company number again."
        );
      }


      /*
       * ============================================
       * VERIFY EMPLOYEE
       * ============================================
       */

      const employeeData =
        await lookupVehicleEmployee(
          storedEmployeeNumber
        );


      if (!employeeData) {
        throw new Error(
          "Your employee record could not be found. Please contact Admin."
        );
      }


      if (
        employeeData.active === false
      ) {
        throw new Error(
          "Your access to the AEDC Vehicle System is inactive. Please contact Admin."
        );
      }


      setEmployee(
        employeeData
      );


      /*
       * ============================================
       * LOAD EMPLOYEE TRIPS
       * ============================================
       */

      const {
        data: tripData,
        error: tripError,
      } = await supabase.rpc(
        "list_employee_trip_history",
        {
          p_employee_number:
            storedEmployeeNumber,
        }
      );


      if (tripError) {
        throw tripError;
      }


      const loadedTrips =
        tripData || [];


      setTrips(
        loadedTrips
      );


      /*
       * ============================================
       * LOAD VEHICLES USED BY EMPLOYEE
       * ============================================
       */

      const vehicleIds = [
        ...new Set(
          loadedTrips
            .map(
              (trip) =>
                trip.vehicle_id
            )
            .filter(Boolean)
        ),
      ];


      if (
        vehicleIds.length === 0
      ) {
        setVehicles([]);

        return;
      }


      const {
        data: vehicleData,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .in(
          "id",
          vehicleIds
        );


      if (vehicleError) {
        throw vehicleError;
      }


      setVehicles(
        vehicleData || []
      );

    } catch (error) {

      console.error(
        "Employee history load error:",
        error
      );


      setErrorMessage(
        error.message ||
          "Unable to load your trip history."
      );

    } finally {

      setLoading(false);

    }
  }


  function getVehicle(
    vehicleId
  ) {
    return vehicles.find(
      (vehicle) =>
        vehicle.id ===
        vehicleId
    );
  }


  function formatDate(
    value
  ) {
    if (!value) {
      return "Not recorded";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Not recorded";
    }


    return new Intl.DateTimeFormat(
      "en-ZA",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  }


  function formatStatus(
    value
  ) {
    if (!value) {
      return "Unknown";
    }


    return String(value)
      .replaceAll("-", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }


  function formatFuel(
    value
  ) {
    if (!value) {
      return "Not recorded";
    }


    return String(value)
      .replaceAll("-", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }


  function formatMoney(
    value
  ) {
    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {
      return "R0.00";
    }


    return new Intl.NumberFormat(
      "en-ZA",
      {
        style: "currency",
        currency: "ZAR",
      }
    ).format(number);
  }


  function hasIssue(
    trip
  ) {
    return (
      trip.new_damage === true ||
      trip.warning_light_reported === true ||
      trip.mechanical_issue_reported === true ||
      trip.status === "incident-open"
    );
  }


  const filteredTrips =
    useMemo(
      () => {
        const normalizedSearch =
          searchTerm
            .trim()
            .toLowerCase();


        return trips.filter(
          (trip) => {
            if (
              statusFilter !==
                "all" &&
              trip.status !==
                statusFilter
            ) {
              return false;
            }


            if (
              !normalizedSearch
            ) {
              return true;
            }


            const vehicle =
              getVehicle(
                trip.vehicle_id
              );


            const searchableText = [
              trip.booking_reference,
              trip.destination,
              trip.purpose,
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
          }
        );
      },
      [
        trips,
        vehicles,
        searchTerm,
        statusFilter,
      ]
    );


  const completedTrips =
    trips.filter(
      (trip) =>
        trip.status ===
        "returned"
    );


  const incidentTrips =
    trips.filter(
      (trip) =>
        trip.status ===
        "incident-open"
    );


  const totalDistance =
    trips.reduce(
      (
        total,
        trip
      ) => {
        const recordedDistance =
          Number(
            trip.distance_travelled
          );


        if (
          Number.isFinite(
            recordedDistance
          )
        ) {
          return (
            total +
            recordedDistance
          );
        }


        const start =
          Number(
            trip.start_odometer
          );


        const end =
          Number(
            trip.end_odometer
          );


        if (
          Number.isFinite(start) &&
          Number.isFinite(end) &&
          end >= start
        ) {
          return (
            total +
            (end - start)
          );
        }


        return total;
      },
      0
    );


  /*
   * ============================================
   * LOADING
   * ============================================
   */

  if (loading) {
    return (
      <main className="employee-history-page">

        <div className="employee-history-loading">

          <FaHistory />

          <h2>
            Loading Trip History
          </h2>

          <p>
            Retrieving your AEDC
            vehicle records...
          </p>

        </div>

      </main>
    );
  }


  /*
   * ============================================
   * ERROR
   * ============================================
   */

  if (
    errorMessage ||
    !employee
  ) {
    return (
      <main className="employee-history-page">

        <div className="employee-history-error-page">

          <FaExclamationTriangle />

          <h2>
            Trip History Unavailable
          </h2>

          <p>
            {errorMessage ||
              "Your employee details could not be loaded."}
          </p>

          <Link
            to="/employee"
            className="employee-history-primary-button"
          >
            Employee Dashboard
          </Link>

        </div>

      </main>
    );
  }


  return (
    <main className="employee-history-page">


      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="employee-history-header">

        <div className="employee-history-header-inner">

          <div className="employee-history-header-left">

            <Link
              to="/employee"
              className="employee-history-back"
            >
              <FaArrowLeft />
            </Link>


            <AEDCLogo
              compact
            />


            <div className="employee-history-brand">

              <span>
                AEDC VEHICLE SYSTEM
              </span>

              <strong>
                Employee Portal
              </strong>

            </div>

          </div>


          <div className="employee-history-user">

            <FaUser />

            <div>

              <span>
                Employee
              </span>

              <strong>
                {employee.full_name}
              </strong>

            </div>

          </div>

        </div>

      </header>


      {/* ==========================================
          HERO
      ========================================== */}

      <section className="employee-history-hero">

        <div className="employee-history-hero-inner">

          <span>
            DIGITAL LOGBOOK
          </span>

          <h1>
            My Trip History
          </h1>

          <p>
            View your completed AEDC
            company vehicle trips and
            post-use records.
          </p>

        </div>

      </section>


      {/* ==========================================
          CONTENT
      ========================================== */}

      <div className="employee-history-content">


        {/* EMPLOYEE INFORMATION */}

        <section className="employee-history-employee-card">

          <div className="employee-history-employee-icon">

            <FaUser />

          </div>


          <div>

            <span>
              EMPLOYEE
            </span>

            <h2>
              {employee.full_name}
            </h2>

            <p>
              {employee.employee_number}
              {" • "}
              {employee.department ||
                "Department not recorded"}
            </p>

          </div>

        </section>


        {/* ========================================
            SUMMARY
        ======================================== */}

        <section className="employee-history-summary">


          <article>

            <div className="employee-history-summary-icon">

              <FaHistory />

            </div>

            <div>

              <span>
                Total Trips
              </span>

              <strong>
                {trips.length}
              </strong>

            </div>

          </article>


          <article>

            <div className="employee-history-summary-icon">

              <FaCheckCircle />

            </div>

            <div>

              <span>
                Completed
              </span>

              <strong>
                {
                  completedTrips.length
                }
              </strong>

            </div>

          </article>


          <article>

            <div className="employee-history-summary-icon">

              <FaExclamationTriangle />

            </div>

            <div>

              <span>
                Issue Reported
              </span>

              <strong>
                {
                  incidentTrips.length
                }
              </strong>

            </div>

          </article>


          <article>

            <div className="employee-history-summary-icon">

              <FaRoad />

            </div>

            <div>

              <span>
                Distance
              </span>

              <strong>
                {totalDistance.toLocaleString(
                  "en-ZA"
                )}{" "}
                km
              </strong>

            </div>

          </article>


        </section>


        {/* ========================================
            SEARCH
        ======================================== */}

        <section className="employee-history-toolbar">

          <div className="employee-history-search">

            <FaSearch />

            <input
              type="text"
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target
                    .value
                )
              }
              placeholder="Search booking, vehicle, destination..."
            />

          </div>


          <select
            value={
              statusFilter
            }
            onChange={(
              event
            ) =>
              setStatusFilter(
                event.target
                  .value
              )
            }
          >

            <option value="all">
              All Trips
            </option>

            <option value="returned">
              Completed
            </option>

            <option value="incident-open">
              Issue Reported
            </option>

          </select>

        </section>


        {/* ========================================
            HISTORY
        ======================================== */}

        <section className="employee-history-section">

          <div className="employee-history-section-heading">

            <div>

              <span>
                TRIP RECORDS
              </span>

              <h2>
                Vehicle Usage History
              </h2>

            </div>


            <strong>
              {
                filteredTrips.length
              }{" "}
              record
              {filteredTrips.length ===
              1
                ? ""
                : "s"}
            </strong>

          </div>


          {filteredTrips.length ===
          0 ? (

            <div className="employee-history-empty">

              <FaCar />

              <h3>
                No trips found
              </h3>

              <p>

                {trips.length === 0
                  ? "You do not have any completed AEDC vehicle trips yet."
                  : "No trips match your current search or filter."}

              </p>

              {trips.length ===
                0 && (

                <Link
                  to="/employee/request-vehicle"
                  className="employee-history-primary-button"
                >
                  Request Vehicle
                </Link>

              )}

            </div>

          ) : (

            <div className="employee-history-list">

              {filteredTrips.map(
                (trip) => {

                  const vehicle =
                    getVehicle(
                      trip.vehicle_id
                    );


                  const tripHasIssue =
                    hasIssue(
                      trip
                    );


                  const calculatedDistance =
                    Number(
                      trip.distance_travelled
                    ) ||
                    Math.max(
                      0,

                      Number(
                        trip.end_odometer ||
                          0
                      ) -
                        Number(
                          trip.start_odometer ||
                            0
                        )
                    );


                  return (
                    <article
                      key={
                        trip.id
                      }
                      className={`employee-history-trip-card ${
                        tripHasIssue
                          ? "employee-history-trip-issue"
                          : ""
                      }`}
                    >


                      {/* TOP */}

                      <div className="employee-history-trip-top">

                        <div>

                          <span className="employee-history-reference">

                            {trip.booking_reference ||
                              "AEDC TRIP"}

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


                        <span
                          className={`employee-history-status ${
                            trip.status ===
                            "incident-open"
                              ? "employee-history-status-incident"
                              : "employee-history-status-returned"
                          }`}
                        >

                          {trip.status ===
                          "incident-open"
                            ? "Issue Reported"
                            : "Completed"}

                        </span>

                      </div>


                      {/* PURPOSE */}

                      <div className="employee-history-purpose">

                        <FaMapMarkerAlt />

                        <div>

                          <span>
                            Destination
                          </span>

                          <strong>
                            {trip.destination ||
                              "Not recorded"}
                          </strong>

                          <p>
                            {trip.purpose ||
                              "Purpose not recorded"}
                          </p>

                        </div>

                      </div>


                      {/* DETAILS */}

                      <div className="employee-history-details">


                        <div>

                          <FaCalendarAlt />

                          <span>
                            Departure
                          </span>

                          <strong>

                            {formatDate(
                              trip.departure_at ||
                                trip.created_at
                            )}

                          </strong>

                        </div>


                        <div>

                          <FaCalendarAlt />

                          <span>
                            Returned
                          </span>

                          <strong>

                            {formatDate(
                              trip.returned_at
                            )}

                          </strong>

                        </div>


                        <div>

                          <FaTachometerAlt />

                          <span>
                            Start Odometer
                          </span>

                          <strong>

                            {Number(
                              trip.start_odometer ||
                                0
                            ).toLocaleString(
                              "en-ZA"
                            )}{" "}
                            km

                          </strong>

                        </div>


                        <div>

                          <FaTachometerAlt />

                          <span>
                            End Odometer
                          </span>

                          <strong>

                            {trip.end_odometer !==
                            null &&
                            trip.end_odometer !==
                            undefined
                              ? `${Number(
                                  trip.end_odometer
                                ).toLocaleString(
                                  "en-ZA"
                                )} km`
                              : "Not recorded"}

                          </strong>

                        </div>


                        <div>

                          <FaRoad />

                          <span>
                            Distance
                          </span>

                          <strong>

                            {calculatedDistance.toLocaleString(
                              "en-ZA"
                            )}{" "}
                            km

                          </strong>

                        </div>


                        <div>

                          <FaGasPump />

                          <span>
                            Fuel Returned
                          </span>

                          <strong>

                            {formatFuel(
                              trip.fuel_after
                            )}

                          </strong>

                        </div>


                      </div>


                      {/* FUEL PURCHASE */}

                      {trip.fuel_purchased && (

                        <div className="employee-history-fuel-box">

                          <FaGasPump />

                          <div>

                            <span>
                              Fuel Purchased
                            </span>

                            <strong>

                              {formatMoney(
                                trip.fuel_amount
                              )}

                            </strong>

                            <p>

                              Receipt:{" "}
                              {trip.fuel_receipt_submitted
                                ? trip.fuel_receipt_reference ||
                                  "Submitted"
                                : "Not submitted"}

                            </p>

                          </div>

                        </div>

                      )}


                      {/* ISSUE */}

                      {tripHasIssue && (

                        <div className="employee-history-issue-box">

                          <FaExclamationTriangle />

                          <div>

                            <strong>
                              Vehicle issue recorded
                            </strong>


                            {trip.new_damage && (

                              <p>
                                <b>
                                  Damage:
                                </b>{" "}
                                {trip.new_damage_description ||
                                  "Damage reported."}
                              </p>

                            )}


                            {trip.warning_light_reported && (

                              <p>
                                <b>
                                  Warning Light:
                                </b>{" "}
                                {trip.warning_light_description ||
                                  "Warning light reported."}
                              </p>

                            )}


                            {trip.mechanical_issue_reported && (

                              <p>
                                <b>
                                  Mechanical:
                                </b>{" "}
                                {trip.mechanical_issue_description ||
                                  "Mechanical issue reported."}
                              </p>

                            )}

                          </div>

                        </div>

                      )}


                      {/* RETURN INFORMATION */}

                      <div className="employee-history-return-info">

                        <div>

                          <span>
                            Return Parking
                          </span>

                          <strong>
                            {trip.return_parking_location ||
                              "Not recorded"}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Keys Returned
                          </span>

                          <strong>

                            {trip.keys_returned
                              ? trip.keys_returned_to
                                ? `Yes — ${trip.keys_returned_to}`
                                : "Yes"
                              : "Not confirmed"}

                          </strong>

                        </div>


                        <div>

                          <span>
                            Post-Inspection
                          </span>

                          <strong>

                            {trip.post_inspection_completed_by ||
                              trip.driver_name ||
                              "Not recorded"}

                          </strong>

                        </div>


                        <div>

                          <span>
                            Record Status
                          </span>

                          <strong>
                            {formatStatus(
                              trip.status
                            )}
                          </strong>

                        </div>

                      </div>


                      {trip.post_use_notes && (

                        <div className="employee-history-notes">

                          <span>
                            Post-Use Notes
                          </span>

                          <p>
                            {
                              trip.post_use_notes
                            }
                          </p>

                        </div>

                      )}


                    </article>
                  );
                }
              )}

            </div>

          )}

        </section>


        {/* ========================================
            BACK
        ======================================== */}

        <div className="employee-history-bottom-actions">

          <Link
            to="/employee"
            className="employee-history-back-dashboard"
          >
            <FaArrowLeft />

            Back to Employee Dashboard
          </Link>

        </div>


      </div>

    </main>
  );
}


export default EmployeeMyHistory;