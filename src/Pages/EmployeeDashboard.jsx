import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FaArrowRight,
  FaCar,
  FaCheckCircle,
  FaClipboardCheck,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaHistory,
  FaIdBadge,
  FaPlus,
  FaRoad,
  FaShieldAlt,
  FaSignOutAlt,
  FaWifi,
  FaUndoAlt,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import { lookupVehicleEmployee } from "../lib/employeeLookup";

import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/EmployeeDashboard.css";



function EmployeeDashboard() {
  const [
    employeeNumber,
    setEmployeeNumber,
  ] = useState("");

  const [
    employee,
    setEmployee,
  ] = useState(null);

  const [
    requests,
    setRequests,
  ] = useState([]);

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
  ] = useState(false);

  const [
    loaded,
    setLoaded,
  ] = useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    showPageLoader,
    setShowPageLoader,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    currentTime,
    setCurrentTime,
  ] = useState(new Date());


  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);


  useEffect(() => {
    let isMounted = true;

    async function restoreEmployeeSession() {
      const minimumLoadingTime = 1200;
      const loadingStartedAt = Date.now();

      setShowPageLoader(true);

      const savedEmployeeNumber =
        localStorage.getItem(
          "aedc_employee_number"
        );

      if (savedEmployeeNumber) {
        await authenticateEmployee(
          savedEmployeeNumber,
          true
        );
      }

      const elapsedTime =
        Date.now() - loadingStartedAt;

      const remainingTime =
        Math.max(
          minimumLoadingTime - elapsedTime,
          0
        );

      if (remainingTime > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, remainingTime)
        );
      }

      if (isMounted) {
        setCheckingSession(false);
        setShowPageLoader(false);
      }
    }

    function handlePageShow(event) {
      if (event.persisted && isMounted) {
        setShowPageLoader(true);

        window.setTimeout(() => {
          if (isMounted) {
            setShowPageLoader(false);
          }
        }, 900);
      }
    }

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    restoreEmployeeSession();

    return () => {
      isMounted = false;

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );
    };
  }, []);


  async function authenticateEmployee(
    number,
    silent = false
  ) {
    const normalizedNumber =
      String(
        number || ""
      )
        .trim()
        .toUpperCase();

    if (!normalizedNumber) {
      setErrorMessage(
        "Please enter your company employee number."
      );

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");


      /*
       * ==============================================
       * CHECK COMPANY EMPLOYEE REGISTER
       * ==============================================
       */

      const employeeData =
        await lookupVehicleEmployee(
          normalizedNumber
        );


      /*
       * NOT REGISTERED
       */

      if (!employeeData) {
        clearEmployeeSession();

        setErrorMessage(
          "Employee number not recognised. Please contact Admin to add you to the AEDC Vehicle System."
        );

        return;
      }


      /*
       * INACTIVE
       */

      if (
        employeeData.active ===
        false
      ) {
        clearEmployeeSession();

        setErrorMessage(
          "Your access to the AEDC Vehicle System is inactive. Please contact Admin."
        );

        return;
      }


      /*
       * LOGIN SUCCESS
       */

      setEmployee(
        employeeData
      );

      setEmployeeNumber(
        normalizedNumber
      );

      localStorage.setItem(
        "aedc_employee_number",
        normalizedNumber
      );

      localStorage.setItem(
        "aedc_employee_name",
        employeeData.full_name ||
          ""
      );

      localStorage.setItem(
        "aedc_employee_department",
        employeeData.department ||
          ""
      );

      await loadEmployeeData(
        normalizedNumber
      );

      setLoaded(true);
    } catch (error) {
      console.error(
        "Employee portal access error:",
        error
      );

      if (!silent) {
        setErrorMessage(
          error.message ||
            "Unable to verify your employee number."
        );
      }
    } finally {
      setLoading(false);
    }
  }


  function clearEmployeeSession() {
    localStorage.removeItem(
      "aedc_employee_number"
    );

    localStorage.removeItem(
      "aedc_employee_name"
    );

    localStorage.removeItem(
      "aedc_employee_department"
    );

    setEmployee(null);
    setLoaded(false);

    setRequests([]);
    setTrips([]);
    setVehicles([]);
  }


  async function loadEmployeeData(
    number
  ) {
    const [
      requestResult,
      tripResult,
      vehicleResult,
    ] = await Promise.all([
      supabase
        .from("vehicle_requests")
        .select("*")
        .eq(
          "employee_number",
          number
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from("vehicle_trips")
        .select("*")
        .eq(
          "employee_number",
          number
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from("vehicles")
        .select("*"),
    ]);

    if (requestResult.error) {
      throw requestResult.error;
    }

    if (tripResult.error) {
      throw tripResult.error;
    }

    if (vehicleResult.error) {
      throw vehicleResult.error;
    }

    setRequests(
      requestResult.data || []
    );

    setTrips(
      tripResult.data || []
    );

    setVehicles(
      vehicleResult.data || []
    );
  }


  async function handleLogin(
    event
  ) {
    event.preventDefault();

    const minimumLoadingTime = 1200;
    const loadingStartedAt = Date.now();

    setShowPageLoader(true);

    await authenticateEmployee(
      employeeNumber
    );

    const elapsedTime =
      Date.now() - loadingStartedAt;

    const remainingTime =
      Math.max(
        minimumLoadingTime - elapsedTime,
        0
      );

    if (remainingTime > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, remainingTime)
      );
    }

    setShowPageLoader(false);
  }


  function handleSignOut() {
    clearEmployeeSession();

    setEmployeeNumber("");
    setErrorMessage("");
  }


  function getVehicle(
    vehicleId
  ) {
    return vehicles.find(
      (vehicle) =>
        vehicle.id === vehicleId
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
    ).format(
      new Date(value)
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


  const pendingRequests =
    requests.filter(
      (request) =>
        request.status ===
        "pending"
    );


  const approvedRequests =
    requests.filter(
      (request) =>
        request.status ===
        "approved"
    );


  const activeTrips =
    trips.filter(
      (trip) =>
        trip.status ===
          "in-use" ||
        trip.status ===
          "incident-open"
    );


  const completedTrips =
    trips.filter(
      (trip) =>
        trip.status ===
        "returned"
    );


  const timeText =
    new Intl.DateTimeFormat(
      "en-ZA",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).format(currentTime);


  /*
   * =====================================================
   * INITIAL SESSION CHECK
   * =====================================================
   */

  if (checkingSession || showPageLoader) {
    return (
      <main className="employee-dashboard-loading">
        <div className="employee-dashboard-loading-background">
          <span className="employee-dashboard-loading-orb employee-dashboard-loading-orb-one" />
          <span className="employee-dashboard-loading-orb employee-dashboard-loading-orb-two" />
          <span className="employee-dashboard-loading-orb employee-dashboard-loading-orb-three" />
        </div>

        <section className="employee-dashboard-loading-card">
          <div className="employee-dashboard-loading-brand">
            <AEDCLogo
              className="employee-dashboard-loading-logo"
              size={42}
            />

            <div>
              <span>AEDC</span>
              <strong>Employee Vehicle Portal</strong>
            </div>
          </div>

          <div className="employee-dashboard-loading-animation">
            <span className="employee-dashboard-loading-ring employee-dashboard-loading-ring-one" />
            <span className="employee-dashboard-loading-ring employee-dashboard-loading-ring-two" />

            <div className="employee-dashboard-loading-car">
              <FaCar />
            </div>
          </div>

          <div className="employee-dashboard-loading-road">
            <div className="employee-dashboard-loading-road-lines">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="employee-dashboard-loading-copy">
            <span className="employee-dashboard-loading-label">
              EMPLOYEE PORTAL
            </span>

            <h2>Loading your dashboard</h2>

            <p>
              Verifying your employee access and preparing
              your vehicle information.
            </p>
          </div>

          <div className="employee-dashboard-loading-progress">
            <span className="employee-dashboard-loading-progress-bar" />
          </div>

          <div className="employee-dashboard-loading-dots">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }


  /*
   * =====================================================
   * COMPANY NUMBER LOGIN
   * PREMIUM EMPLOYEE FLEET COMMAND GATEWAY
   * =====================================================
   */

  if (!loaded) {
    return (
      <main className="employee-login-command">
        <div className="employee-login-command-bg">
          <div className="employee-login-command-grid" />
          <div className="employee-login-command-scan" />
          <div className="employee-login-command-glow employee-login-command-glow-one" />
          <div className="employee-login-command-glow employee-login-command-glow-two" />
          <div className="employee-login-command-route employee-login-command-route-one" />
          <div className="employee-login-command-route employee-login-command-route-two" />
        </div>


        <header className="employee-login-command-topbar">
          <div className="employee-login-command-brand">
            <AEDCLogo
              compact
              className="employee-login-command-logo"
            />

            <div>
              <span>
                AEDC VEHICLE MANAGEMENT
              </span>

              <strong>
                EMPLOYEE FLEET ACCESS
              </strong>
            </div>
          </div>


          <div className="employee-login-command-status">
            <span className="employee-login-command-live-dot" />

            <div>
              <small>
                PORTAL STATUS
              </small>

              <strong>
                ONLINE
              </strong>
            </div>

            <div className="employee-login-command-clock">
              <small>
                LOCAL TIME
              </small>

              <strong>
                {timeText}
              </strong>
            </div>
          </div>
        </header>


        <section className="employee-login-command-stage">
          <div className="employee-login-command-intro">
            <div className="employee-login-command-kicker">
              <span />

              AEDC EMPLOYEE VEHICLE OPERATIONS
            </div>

            <h1>
              Your journey.
              <br />

              <span>
                Ready when you are.
              </span>
            </h1>

            <p>
              One secure gateway for AEDC employees to
              request vehicles, complete inspections,
              manage active trips and review vehicle-use
              history.
            </p>


            <div className="employee-login-command-radar">
              <span className="employee-login-command-ring employee-login-command-ring-one" />
              <span className="employee-login-command-ring employee-login-command-ring-two" />
              <span className="employee-login-command-ring employee-login-command-ring-three" />

              <div className="employee-login-command-car">
                <FaCar />
              </div>

              <div className="employee-login-command-radar-sweep" />
            </div>


            <div className="employee-login-command-systems">
              <article>
                <div className="employee-login-command-system-icon">
                  <FaRoad />
                </div>

                <div>
                  <span>
                    FLEET NETWORK
                  </span>

                  <strong>
                    Operational
                  </strong>
                </div>

                <FaCheckCircle className="employee-login-command-ok" />
              </article>

              <article>
                <div className="employee-login-command-system-icon">
                  <FaWifi />
                </div>

                <div>
                  <span>
                    AEDC SYSTEM
                  </span>

                  <strong>
                    Connected
                  </strong>
                </div>

                <FaCheckCircle className="employee-login-command-ok" />
              </article>
            </div>
          </div>


          <div className="employee-login-command-terminal-wrap">
            <span className="employee-login-command-orbit employee-login-command-orbit-one" />
            <span className="employee-login-command-orbit employee-login-command-orbit-two" />

            <section className="employee-login-command-terminal">
              <div className="employee-login-command-terminal-scan" />

              <div className="employee-login-command-terminal-head">
                <div className="employee-login-command-id-icon">
                  <FaIdBadge />
                </div>

                <div>
                  <span>
                    EMPLOYEE IDENTITY GATEWAY
                  </span>

                  <h2>
                    Vehicle Portal Access
                  </h2>
                </div>

                <strong className="employee-login-command-terminal-number">
                  02
                </strong>
              </div>


              <div className="employee-login-command-divider">
                <span />

                <small>
                  REGISTERED AEDC EMPLOYEES
                </small>

                <span />
              </div>


              {errorMessage && (
                <div
                  className="employee-login-command-error"
                  role="alert"
                >
                  <FaExclamationTriangle />

                  <span>
                    {errorMessage}
                  </span>
                </div>
              )}


              <form
                className="employee-login-command-form"
                onSubmit={handleLogin}
              >
                <div className="employee-login-command-field">
                  <label htmlFor="employee-number">
                    COMPANY EMPLOYEE NUMBER
                  </label>

                  <div className="employee-login-command-input">
                    <FaUser />

                    <input
                      id="employee-number"
                      type="text"
                      value={employeeNumber}
                      onChange={(event) =>
                        setEmployeeNumber(
                          event.target.value
                        )
                      }
                      placeholder="Enter your company number"
                      autoComplete="off"
                      disabled={loading}
                    />

                    <span>
                      E1
                    </span>
                  </div>
                </div>


                <button
                  type="submit"
                  className="employee-login-command-button"
                  disabled={loading}
                >
                  <span className="employee-login-command-button-shine" />

                  <span className="employee-login-command-button-label">
                    {loading ? (
                      <>
                        <FaClock className="employee-login-command-spinner" />

                        VERIFYING EMPLOYEE
                      </>
                    ) : (
                      <>
                        <FaIdBadge />

                        ENTER EMPLOYEE PORTAL
                      </>
                    )}
                  </span>

                  <FaArrowRight className="employee-login-command-arrow" />
                </button>
              </form>


              <div className="employee-login-command-security">
                <FaShieldAlt />

                <div>
                  <strong>
                    Registered employee access
                  </strong>

                  <span>
                    Your company employee number must
                    already exist in the AEDC employee
                    register.
                  </span>
                </div>
              </div>


              <div className="employee-login-command-terminal-footer">
                <div>
                  <span className="employee-login-command-live-dot" />

                  VEHICLE PORTAL CONNECTION ACTIVE
                </div>

                <span>
                  AEDC / EMPLOYEE / VMS
                </span>
              </div>
            </section>
          </div>
        </section>


        <footer className="employee-login-command-footer">
          <span>
            AFRICAN ENTREPRENEURSHIP DEVELOPMENT CORPORATION
          </span>

          <span>
            EMPLOYEE VEHICLE MANAGEMENT PORTAL
          </span>
        </footer>
      </main>
    );
  }


  /*
   * =====================================================
   * EMPLOYEE DASHBOARD
   * =====================================================
   */

  return (
    <main className="employee-portal-page">
      <header className="employee-portal-header">
        <div className="employee-portal-header-inner">
          <div className="employee-portal-header-left">
            <AEDCLogo
              compact
              className="employee-portal-logo"
            />

            <div>
              <span>
                AEDC VEHICLE MANAGEMENT
              </span>

              <h1>
                Employee Vehicle Portal
              </h1>

              <p>
                Request, inspect and
                return company vehicles.
              </p>
            </div>
          </div>

          <div className="employee-portal-header-actions">
            <div className="employee-navbar-status">
              <span className="employee-navbar-live-dot" />

              <div>
                <small>
                  SYSTEM
                </small>

                <strong>
                  ONLINE
                </strong>
              </div>
            </div>

            <div className="employee-navbar-time">
              <FaClock />

              <div>
                <small>
                  LOCAL TIME
                </small>

                <strong>
                  {timeText}
                </strong>
              </div>
            </div>

          <button
            type="button"
            className="employee-switch-button"
            onClick={
              handleSignOut
            }
          >
            <FaSignOutAlt />

            Sign Out
          </button>
          </div>
        </div>
      </header>


      <section className="employee-portal-content">
        {/* =============================================
            WELCOME
        ============================================= */}

        <section className="employee-welcome">
          <div>
            <span>
              EMPLOYEE PORTAL
            </span>

            <h2>
              Welcome,{" "}
              {employee?.full_name ||
                "Employee"}
            </h2>

            <p>
              Company Number:{" "}
              <strong>
                {
                  employee?.employee_number
                }
              </strong>

              {employee?.department && (
                <>
                  {" "}
                  ·{" "}
                  {
                    employee.department
                  }
                </>
              )}
            </p>
          </div>

          <Link
            to="/employee/request-vehicle"
            className="employee-primary-action"
          >
            <FaPlus />

            Request Vehicle
          </Link>
        </section>


        {/* =============================================
            ELIGIBILITY WARNING
        ============================================= */}

        {(
          !employee?.license_verified ||
          !employee?.authorized_to_drive ||
          !employee?.policy_acknowledged
        ) && (
          <div className="employee-eligibility-warning">
            <FaExclamationTriangle />

            <div>
              <strong>
                Driver eligibility incomplete
              </strong>

              <span>
                You can access the employee
                portal and submit a request,
                but your vehicle use remains
                subject to driver verification
                and Facilities Manager
                approval.
              </span>
            </div>
          </div>
        )}


        {/* =============================================
            SUMMARY
        ============================================= */}

        <section className="employee-summary-grid">
          <article>
            <div className="employee-summary-icon">
              <FaClock />
            </div>

            <div>
              <span>
                Pending
              </span>

              <strong>
                {
                  pendingRequests.length
                }
              </strong>
            </div>
          </article>

          <article>
            <div className="employee-summary-icon">
              <FaCheckCircle />
            </div>

            <div>
              <span>
                Approved
              </span>

              <strong>
                {
                  approvedRequests.length
                }
              </strong>
            </div>
          </article>

          <article>
            <div className="employee-summary-icon">
              <FaCar />
            </div>

            <div>
              <span>
                Active Trips
              </span>

              <strong>
                {
                  activeTrips.length
                }
              </strong>
            </div>
          </article>

          <article>
            <div className="employee-summary-icon">
              <FaHistory />
            </div>

            <div>
              <span>
                Previous Trips
              </span>

              <strong>
                {
                  completedTrips.length
                }
              </strong>
            </div>
          </article>
        </section>


        {/* =============================================
            ACTIVE VEHICLE
        ============================================= */}

        <section className="employee-dashboard-section">
          <div className="employee-section-heading">
            <span>
              CURRENT VEHICLE
            </span>

            <h2>
              My Active Vehicle
            </h2>
          </div>


          {activeTrips.length ===
          0 ? (
            <div className="employee-empty-card">
              <FaCar />

              <h3>
                No active vehicle
              </h3>

              <p>
                You currently have no
                company vehicle checked
                out.
              </p>
            </div>
          ) : (
            <div className="employee-record-list">
              {activeTrips.map(
                (trip) => {
                  const vehicle =
                    getVehicle(
                      trip.vehicle_id
                    );

                  return (
                    <article
                      key={
                        trip.id
                      }
                      className="employee-active-trip-card"
                    >
                      <div className="employee-record-top">
                        <div>
                          <span>
                            {
                              trip.booking_reference
                            }
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

                        <span className="employee-status employee-status-in-use">
                          {formatStatus(
                            trip.status
                          )}
                        </span>
                      </div>


                      <div className="employee-trip-details">
                        <div>
                          <span>
                            Destination
                          </span>

                          <strong>
                            {trip.destination ||
                              "Not recorded"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Trip Started
                          </span>

                          <strong>
                            {formatDate(
                              trip.departure_at ||
                                trip.created_at
                            )}
                          </strong>
                        </div>
                      </div>


                      <div className="employee-record-actions">
                        <Link
                          to={`/employee/return/${trip.id}`}
                          className="employee-return-action"
                        >
                          <FaUndoAlt />

                          Return Vehicle
                        </Link>

                        <Link
                          to={`/incidents/report/${trip.id}`}
                          className="employee-secondary-action"
                        >
                          <FaExclamationTriangle />

                          Report Incident
                        </Link>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>


        {/* =============================================
            APPROVED REQUESTS
        ============================================= */}

        <section className="employee-dashboard-section">
          <div className="employee-section-heading">
            <span>
              READY FOR INSPECTION
            </span>

            <h2>
              Approved Requests
            </h2>
          </div>


          {approvedRequests.length ===
          0 ? (
            <div className="employee-empty-card employee-empty-small">
              <FaClipboardCheck />

              <h3>
                No approved requests
              </h3>
            </div>
          ) : (
            <div className="employee-record-list">
              {approvedRequests.map(
                (request) => {
                  const vehicle =
                    getVehicle(
                      request.vehicle_id
                    );

                  const existingTrip =
                    trips.find(
                      (trip) =>
                        trip.request_id ===
                        request.id
                    );

                  if (existingTrip) {
                    return null;
                  }

                  return (
                    <article
                      key={
                        request.id
                      }
                      className="employee-request-card"
                    >
                      <div className="employee-record-top">
                        <div>
                          <span>
                            {
                              request.booking_reference
                            }
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

                        <span className="employee-status employee-status-approved">
                          APPROVED
                        </span>
                      </div>


                      <div className="employee-trip-details">
                        <div>
                          <span>
                            Destination
                          </span>

                          <strong>
                            {
                              request.destination
                            }
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
                      </div>


                      <div className="employee-inspection-notice">
                        <FaClipboardCheck />

                        <span>
                          Complete the mandatory
                          pre-use inspection
                          before taking the
                          vehicle.
                        </span>
                      </div>


                      <div className="employee-record-actions">
                        <Link
                          to={`/employee/pre-inspection/${request.id}`}
                          className="employee-inspection-action"
                        >
                          <FaClipboardCheck />

                          Start Pre-Use Inspection
                        </Link>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>


        {/* =============================================
            PENDING REQUESTS
        ============================================= */}

        <section className="employee-dashboard-section">
          <div className="employee-section-heading">
            <span>
              REQUEST STATUS
            </span>

            <h2>
              Pending Requests
            </h2>
          </div>


          {pendingRequests.length ===
          0 ? (
            <div className="employee-empty-card employee-empty-small">
              <FaClipboardList />

              <h3>
                No pending requests
              </h3>
            </div>
          ) : (
            <div className="employee-record-list">
              {pendingRequests.map(
                (request) => {
                  const vehicle =
                    getVehicle(
                      request.vehicle_id
                    );

                  return (
                    <article
                      key={
                        request.id
                      }
                      className="employee-request-card"
                    >
                      <div className="employee-record-top">
                        <div>
                          <span>
                            {
                              request.booking_reference
                            }
                          </span>

                          <h3>
                            {vehicle
                              ? `${vehicle.make} ${vehicle.model}`
                              : "Company Vehicle"}
                          </h3>

                          <p>
                            {
                              request.destination
                            }
                          </p>
                        </div>

                        <span className="employee-status employee-status-pending">
                          PENDING
                        </span>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>


        {/* =============================================
            EMPLOYEE QUICK LINKS
            NO EMPLOYEE MANAGEMENT HERE
        ============================================= */}

        <section className="employee-quick-links">
          <Link
            to="/employee/request-vehicle"
          >
            <FaPlus />

            <div>
              <strong>
                Request Vehicle
              </strong>

              <span>
                Submit a new company
                vehicle request
              </span>
            </div>

            <FaArrowRight />
          </Link>


          <Link
            to="/employee/my-requests"
          >
            <FaClipboardList />

            <div>
              <strong>
                My Requests
              </strong>

              <span>
                View only your own
                booking requests
              </span>
            </div>

            <FaArrowRight />
          </Link>


          <Link
            to="/employee/my-history"
          >
            <FaHistory />

            <div>
              <strong>
                My Trip History
              </strong>

              <span>
                View only your own
                previous vehicle trips
              </span>
            </div>

            <FaArrowRight />
          </Link>
        </section>
      </section>


      <footer className="employee-portal-footer">
        AEDC Company Vehicle Management
        System
      </footer>
    </main>
  );
}


export default EmployeeDashboard;