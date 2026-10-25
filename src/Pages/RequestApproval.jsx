import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaCar,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaIdCard,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaTimesCircle,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import "../Styles/VehicleForms.css";


function RequestApproval() {
  const { requestId } = useParams();

  const navigate = useNavigate();


  const [
    request,
    setRequest,
  ] = useState(null);

  const [
    vehicle,
    setVehicle,
  ] = useState(null);

  const [
    driver,
    setDriver,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    approvalNotes,
    setApprovalNotes,
  ] = useState("");

  const [
    declineReason,
    setDeclineReason,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  useEffect(() => {
    loadRequest();
  }, [requestId]);


  function normalizeEmployeeNumber(
    value
  ) {
    return String(value || "")
      .trim()
      .toUpperCase();
  }


  async function loadRequest() {
    try {
      setLoading(true);

      setErrorMessage("");

      setDriver(null);


      /* ==========================================
         LOAD REQUEST
      ========================================== */

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from("vehicle_requests")
        .select("*")
        .eq(
          "id",
          requestId
        )
        .single();


      if (requestError) {
        throw requestError;
      }


      setRequest(
        requestData
      );


      /* ==========================================
         LOAD VEHICLE
      ========================================== */

      const {
        data: vehicleData,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq(
          "id",
          requestData.vehicle_id
        )
        .single();


      if (vehicleError) {
        throw vehicleError;
      }


      setVehicle(
        vehicleData
      );


      /* ==========================================
         LOAD DRIVER / EMPLOYEE
      ========================================== */

      const employeeNumber =
        normalizeEmployeeNumber(
          requestData.employee_number
        );


      if (!employeeNumber) {
        setDriver(null);

        return;
      }


      const {
        data: driverData,
        error: driverError,
      } = await supabase
        .from("drivers")
        .select("*")
        .eq(
          "employee_number",
          employeeNumber
        )
        .maybeSingle();


      if (driverError) {
        throw driverError;
      }


      setDriver(
        driverData || null
      );

    } catch (error) {

      console.error(
        "Request approval load error:",
        error
      );


      setErrorMessage(
        error.message ||
          "Unable to load request."
      );

    } finally {

      setLoading(false);

    }
  }


  /* ==========================================
     DRIVER ELIGIBILITY
  ========================================== */

  const driverChecks =
    useMemo(
      () => {
        const today =
          new Date();

        today.setHours(
          0,
          0,
          0,
          0
        );


        let licenseExpiryDate;

        let licenseExpired =
          false;


        if (
          driver?.license_expiry_date
        ) {
          licenseExpiryDate =
            new Date(
              `${driver.license_expiry_date}T00:00:00`
            );


          if (
            !Number.isNaN(
              licenseExpiryDate.getTime()
            )
          ) {
            licenseExpired =
              licenseExpiryDate <
              today;
          }
        }


        return [
          {
            key:
              "employee-record",

            label:
              "Employee registered",

            passed:
              Boolean(driver),

            message:
              driver
                ? "Employee exists in the AEDC Employee Register."
                : "Employee is not registered in the AEDC Vehicle System.",
          },

          {
            key:
              "employee-active",

            label:
              "Employee account active",

            passed:
              Boolean(
                driver &&
                  driver.active ===
                    true
              ),

            message:
              driver?.active === true
                ? "Employee access is active."
                : "Employee access is inactive.",
          },

          {
            key:
              "license-recorded",

            label:
              "Driver's licence recorded",

            passed:
              Boolean(
                driver?.driver_license_number
                  ?.toString()
                  .trim()
              ),

            message:
              driver
                ?.driver_license_number
                ? `Licence: ${driver.driver_license_number}`
                : "No driver's licence number is recorded.",
          },

          {
            key:
              "license-verified",

            label:
              "Driver's licence verified",

            passed:
              Boolean(
                driver?.license_verified ===
                  true
              ),

            message:
              driver?.license_verified ===
              true
                ? "Driver's licence has been verified."
                : "Driver's licence has not been verified.",
          },

          {
            key:
              "license-expiry",

            label:
              "Driver's licence valid",

            passed:
              Boolean(
                driver
                  ?.license_expiry_date &&
                  !licenseExpired
              ),

            message:
              !driver
                ?.license_expiry_date
                ? "Driver's licence expiry date is not recorded."
                : licenseExpired
                ? "Driver's licence has expired."
                : `Licence valid until ${formatDateOnly(
                    driver.license_expiry_date
                  )}.`,
          },

          {
            key:
              "authorized",

            label:
              "Authorized to drive",

            passed:
              Boolean(
                driver
                  ?.authorized_to_drive ===
                  true
              ),

            message:
              driver
                ?.authorized_to_drive ===
              true
                ? "Employee is authorized to drive an AEDC company vehicle."
                : "Employee has not been authorized to drive.",
          },

          {
            key:
              "policy",

            label:
              "Vehicle policy acknowledged",

            passed:
              Boolean(
                driver
                  ?.policy_acknowledged ===
                  true
              ),

            message:
              driver
                ?.policy_acknowledged ===
              true
                ? "AEDC vehicle policy acknowledgement is recorded."
                : "AEDC vehicle policy acknowledgement is missing.",
          },
        ];
      },
      [driver]
    );


  /* ==========================================
     VEHICLE ELIGIBILITY
  ========================================== */

  const vehicleChecks =
    useMemo(
      () => {
        return [
          {
            key:
              "vehicle-record",

            label:
              "Vehicle record available",

            passed:
              Boolean(vehicle),

            message:
              vehicle
                ? "Vehicle exists in the AEDC fleet."
                : "Vehicle record could not be found.",
          },

          {
            key:
              "vehicle-active",

            label:
              "Vehicle active",

            passed:
              Boolean(
                vehicle &&
                  vehicle.active !==
                    false
              ),

            message:
              vehicle?.active ===
              false
                ? "Vehicle has been deactivated."
                : "Vehicle is active.",
          },

          {
            key:
              "roadworthy",

            label:
              "Vehicle roadworthy",

            passed:
              Boolean(
                vehicle?.roadworthy ===
                  true
              ),

            message:
              vehicle?.roadworthy ===
              true
                ? "Vehicle is currently marked as roadworthy."
                : "Vehicle is marked as not roadworthy.",
          },

          {
            key:
              "availability",

            label:
              "Vehicle available",

            passed:
              Boolean(
                vehicle &&
                  [
                    "available",
                    "reserved",
                  ].includes(
                    vehicle.status
                  )
              ),

            message:
              vehicle
                ? `Current vehicle status: ${
                    vehicle.status ||
                    "unknown"
                  }.`
                : "Vehicle status unavailable.",
          },
        ];
      },
      [vehicle]
    );


  const allChecks = [
    ...driverChecks,
    ...vehicleChecks,
  ];


  const failedChecks =
    allChecks.filter(
      (check) =>
        !check.passed
    );


  const canApprove =
    failedChecks.length === 0;


  /* ==========================================
     APPROVE
  ========================================== */

  async function approveRequest() {
    if (
      request.status !==
      "pending"
    ) {
      alert(
        "Only pending vehicle requests can be approved."
      );

      return;
    }


    /*
     * Re-read the employee and vehicle immediately
     * before approval.
     *
     * This prevents Admin approving based only on
     * stale information already displayed on screen.
     */

    try {
      setProcessing(true);


      const employeeNumber =
        normalizeEmployeeNumber(
          request.employee_number
        );


      if (!employeeNumber) {
        throw new Error(
          "This request does not contain an employee number."
        );
      }


      const {
        data: latestDriver,
        error: driverError,
      } = await supabase
        .from("drivers")
        .select("*")
        .eq(
          "employee_number",
          employeeNumber
        )
        .maybeSingle();


      if (driverError) {
        throw driverError;
      }


      if (!latestDriver) {
        throw new Error(
          "Approval blocked: the employee is not registered in the AEDC Employee Register."
        );
      }


      if (
        latestDriver.active !==
        true
      ) {
        throw new Error(
          "Approval blocked: this employee is inactive."
        );
      }


      if (
        !latestDriver
          .driver_license_number
          ?.toString()
          .trim()
      ) {
        throw new Error(
          "Approval blocked: the employee does not have a driver's licence number recorded."
        );
      }


      if (
        latestDriver
          .license_verified !==
        true
      ) {
        throw new Error(
          "Approval blocked: the employee's driver's licence has not been verified."
        );
      }


      if (
        !latestDriver
          .license_expiry_date
      ) {
        throw new Error(
          "Approval blocked: the driver's licence expiry date has not been recorded."
        );
      }


      const expiryDate =
        new Date(
          `${latestDriver.license_expiry_date}T23:59:59`
        );


      if (
        Number.isNaN(
          expiryDate.getTime()
        )
      ) {
        throw new Error(
          "Approval blocked: the driver's licence expiry date is invalid."
        );
      }


      if (
        expiryDate <
        new Date()
      ) {
        throw new Error(
          "Approval blocked: the employee's driver's licence has expired."
        );
      }


      if (
        latestDriver
          .authorized_to_drive !==
        true
      ) {
        throw new Error(
          "Approval blocked: this employee has not been authorized to drive an AEDC company vehicle."
        );
      }


      if (
        latestDriver
          .policy_acknowledged !==
        true
      ) {
        throw new Error(
          "Approval blocked: this employee has not acknowledged the AEDC Company Vehicle Use Policy."
        );
      }


      const {
        data: latestVehicle,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq(
          "id",
          request.vehicle_id
        )
        .single();


      if (vehicleError) {
        throw vehicleError;
      }


      if (
        latestVehicle.active ===
        false
      ) {
        throw new Error(
          "Approval blocked: this vehicle is inactive."
        );
      }


      if (
        latestVehicle
          .roadworthy !==
        true
      ) {
        throw new Error(
          "Approval blocked: this vehicle is not currently marked as roadworthy."
        );
      }


      if (
        ![
          "available",
          "reserved",
        ].includes(
          latestVehicle.status
        )
      ) {
        throw new Error(
          `Approval blocked: the vehicle is currently ${latestVehicle.status || "unavailable"}.`
        );
      }


      /*
       * Check for overlapping approved/in-use
       * bookings before approval.
       */

      const {
        data:
          conflictingRequests,
        error:
          conflictError,
      } = await supabase
        .from(
          "vehicle_requests"
        )
        .select(
          `
            id,
            booking_reference,
            requested_departure_at,
            requested_return_at,
            status
          `
        )
        .eq(
          "vehicle_id",
          request.vehicle_id
        )
        .in(
          "status",
          [
            "approved",
          ]
        )
        .neq(
          "id",
          request.id
        )
        .lt(
          "requested_departure_at",
          request.requested_return_at
        )
        .gt(
          "requested_return_at",
          request.requested_departure_at
        );


      if (conflictError) {
        throw conflictError;
      }


      if (
        conflictingRequests &&
        conflictingRequests.length >
          0
      ) {
        const conflict =
          conflictingRequests[0];


        throw new Error(
          `Approval blocked: this vehicle already has an approved booking (${conflict.booking_reference || "booking"}) during the requested period.`
        );
      }


      /*
       * Everything passed.
       * Ask for Facilities Manager identity.
       */

      const managerName =
        window.prompt(
          "Enter the Facilities Manager / approver name:"
        );


      if (
        !managerName?.trim()
      ) {
        setProcessing(false);

        return;
      }


      const {
        error,
      } = await supabase
        .from(
          "vehicle_requests"
        )
        .update({
          status:
            "approved",

          approved_by:
            managerName.trim(),

          approved_at:
            new Date()
              .toISOString(),

          approval_notes:
            approvalNotes.trim() ||
            null,

          declined_by:
            null,

          declined_at:
            null,

          decline_reason:
            null,
        })
        .eq(
          "id",
          request.id
        )
        .eq(
          "status",
          "pending"
        );


      if (error) {
        throw error;
      }


      alert(
        "Vehicle request approved. The employee may now complete the pre-use digital logbook before the vehicle keys are released."
      );


      await loadRequest();

    } catch (error) {

      console.error(
        "Vehicle request approval error:",
        error
      );


      alert(
        error.message ||
          "Unable to approve request."
      );

    } finally {

      setProcessing(false);

    }
  }


  /* ==========================================
     DECLINE
  ========================================== */

  async function declineRequest() {
    if (
      request.status !==
      "pending"
    ) {
      alert(
        "Only pending vehicle requests can be declined."
      );

      return;
    }


    if (
      !declineReason.trim()
    ) {
      alert(
        "Please enter a reason for declining the request."
      );

      return;
    }


    const managerName =
      window.prompt(
        "Enter the Facilities Manager / approver name:"
      );


    if (
      !managerName?.trim()
    ) {
      return;
    }


    try {
      setProcessing(true);


      const {
        error,
      } = await supabase
        .from(
          "vehicle_requests"
        )
        .update({
          status:
            "declined",

          declined_by:
            managerName.trim(),

          declined_at:
            new Date()
              .toISOString(),

          decline_reason:
            declineReason.trim(),

          approved_by:
            null,

          approved_at:
            null,

          approval_notes:
            null,
        })
        .eq(
          "id",
          request.id
        )
        .eq(
          "status",
          "pending"
        );


      if (error) {
        throw error;
      }


      alert(
        "Vehicle request declined."
      );


      await loadRequest();

    } catch (error) {

      console.error(
        "Vehicle request decline error:",
        error
      );


      alert(
        error.message ||
          "Unable to decline request."
      );

    } finally {

      setProcessing(false);

    }
  }


  /* ==========================================
     FORMATTERS
  ========================================== */

  function formatDate(
    date
  ) {
    if (!date) {
      return "Not recorded";
    }


    const value =
      new Date(date);


    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return "Not recorded";
    }


    return value.toLocaleString(
      "en-ZA",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    );
  }


  function formatDateOnly(
    date
  ) {
    if (!date) {
      return "Not recorded";
    }


    const value =
      new Date(
        `${date}T00:00:00`
      );


    if (
      Number.isNaN(
        value.getTime()
      )
    ) {
      return "Not recorded";
    }


    return value.toLocaleDateString(
      "en-ZA",
      {
        dateStyle:
          "medium",
      }
    );
  }


  /* ==========================================
     LOADING
  ========================================== */

  if (loading) {
    return (
      <main className="vehicle-form-page">

        <div className="page-loading">
          Loading request...
        </div>

      </main>
    );
  }


  /* ==========================================
     REQUEST NOT FOUND
  ========================================== */

  if (!request) {
    return (
      <main className="vehicle-form-page">

        <div className="page-loading">

          {errorMessage ||
            "Request not found."}

        </div>

      </main>
    );
  }


  return (
    <main className="vehicle-form-page">


      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="form-header">

        <div className="form-header-inner">

          <Link
            to="/requests"
            className="back-button"
          >
            <FaArrowLeft />

            Requests
          </Link>


          <div className="form-brand">

            <FaCar />

            <span>
              AEDC Approval
            </span>

          </div>

        </div>

      </header>


      {/* ==========================================
          HERO
      ========================================== */}

      <section className="form-hero">

        <div className="form-hero-inner">

          <span>
            FACILITIES MANAGEMENT
          </span>

          <h1>
            Review Vehicle Request
          </h1>

          <p>
            Review the requested trip,
            driver eligibility and vehicle
            readiness before authorizing
            use of the company vehicle.
          </p>

        </div>

      </section>


      <div className="vehicle-form">


        {/* ========================================
            REQUEST SUMMARY
        ======================================== */}

        <section className="form-card">

          <div className="request-approval-top">

            <div>

              <span className="booking-reference">

                {request.booking_reference}

              </span>

              <h2>
                Vehicle Booking
              </h2>

            </div>


            <span
              className={`request-status request-status-${request.status}`}
            >

              {request.status.toUpperCase()}

            </span>

          </div>


          <div className="request-info-grid">

            <div>

              <FaUser />

              <span>
                Intended Driver
              </span>

              <strong>
                {request.requested_driver_name}
              </strong>

            </div>


            <div>

              <span>
                Employee Number
              </span>

              <strong>

                {request.employee_number ||
                  "Not recorded"}

              </strong>

            </div>


            <div>

              <span>
                Department
              </span>

              <strong>

                {request.department ||
                  "Not recorded"}

              </strong>

            </div>


            <div>

              <FaMapMarkerAlt />

              <span>
                Destination
              </span>

              <strong>
                {request.destination}
              </strong>

            </div>


            <div>

              <FaClock />

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

              <FaClock />

              <span>
                Expected Return
              </span>

              <strong>

                {formatDate(
                  request.requested_return_at
                )}

              </strong>

            </div>

          </div>

        </section>


        {/* ========================================
            BUSINESS PURPOSE
        ======================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              01
            </span>

            <div>

              <h2>
                Business Purpose
              </h2>

              <p>
                Confirm the booking is for
                a legitimate AEDC business
                requirement.
              </p>

            </div>

          </div>


          <div className="approval-information">

            <strong>
              Destination
            </strong>

            <p>
              {request.destination}
            </p>


            <strong>
              Purpose
            </strong>

            <p>
              {request.purpose}
            </p>

          </div>

        </section>


        {/* ========================================
            OUT OF PROVINCE
        ======================================== */}

        {request.out_of_province && (

          <section className="form-card">

            <div className="form-section-heading">

              <span>
                02
              </span>

              <div>

                <h2>
                  Out-of-Province Travel
                </h2>

                <p>
                  This journey requires
                  additional approval and
                  itinerary review.
                </p>

              </div>

            </div>


            <div className="approval-information">

              <strong>
                Planned Itinerary
              </strong>

              <p>

                {request.itinerary ||
                  "Not recorded"}

              </p>


              <strong>
                Overnight Location
              </strong>

              <p>

                {request.overnight_location ||
                  "Not applicable"}

              </p>

            </div>

          </section>

        )}


        {/* ========================================
            DRIVER ELIGIBILITY
        ======================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              {request.out_of_province
                ? "03"
                : "02"}
            </span>

            <div>

              <h2>
                Driver Eligibility
              </h2>

              <p>
                Mandatory AEDC checks that
                must pass before this
                request can be approved.
              </p>

            </div>

          </div>


          {!driver && (

            <div className="damage-warning">

              <FaExclamationTriangle />

              <div>

                <strong>
                  Employee Not Registered
                </strong>

                <p>
                  The company number on
                  this request could not
                  be matched to an active
                  driver record. Add or
                  update the employee in
                  Employee Management
                  before approving.
                </p>

                <Link
                  to="/employees"
                  className="button-link"
                >
                  Manage Employees
                </Link>

              </div>

            </div>

          )}


          {driver && (

            <div className="request-info-grid">

              <div>

                <FaUser />

                <span>
                  Registered Employee
                </span>

                <strong>
                  {driver.full_name}
                </strong>

              </div>


              <div>

                <FaIdCard />

                <span>
                  Company Number
                </span>

                <strong>
                  {driver.employee_number}
                </strong>

              </div>


              <div>

                <span>
                  Driver's Licence
                </span>

                <strong>

                  {driver.driver_license_number ||
                    "NOT RECORDED"}

                </strong>

              </div>


              <div>

                <span>
                  Licence Expiry
                </span>

                <strong>

                  {formatDateOnly(
                    driver.license_expiry_date
                  )}

                </strong>

              </div>


              <div>

                <span>
                  Licence Verified
                </span>

                <strong>

                  {driver.license_verified
                    ? "YES"
                    : "NO"}

                </strong>

              </div>


              <div>

                <span>
                  Authorized to Drive
                </span>

                <strong>

                  {driver.authorized_to_drive
                    ? "YES"
                    : "NO"}

                </strong>

              </div>


              <div>

                <span>
                  Policy Acknowledged
                </span>

                <strong>

                  {driver.policy_acknowledged
                    ? "YES"
                    : "NO"}

                </strong>

              </div>


              <div>

                <span>
                  Employee Status
                </span>

                <strong>

                  {driver.active
                    ? "ACTIVE"
                    : "INACTIVE"}

                </strong>

              </div>

            </div>

          )}


          <div
            style={{
              marginTop:
                "18px",
            }}
          >

            {driverChecks.map(
              (check) => (

                <div
                  key={
                    check.key
                  }
                  className={
                    check.passed
                      ? "confirmation-card"
                      : "damage-warning"
                  }
                  style={{
                    marginBottom:
                      "10px",
                  }}
                >

                  {check.passed ? (
                    <FaCheckCircle />
                  ) : (
                    <FaTimesCircle />
                  )}


                  <div>

                    <strong>
                      {check.label}
                    </strong>

                    <p>
                      {check.message}
                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        </section>


        {/* ========================================
            VEHICLE READINESS
        ======================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>

              {request.out_of_province
                ? "04"
                : "03"}

            </span>

            <div>

              <h2>
                Vehicle Readiness
              </h2>

              <p>
                Confirm the selected
                company vehicle is active,
                available and roadworthy.
              </p>

            </div>

          </div>


          <div className="request-info-grid">

            <div>

              <FaCar />

              <span>
                Vehicle
              </span>

              <strong>

                {vehicle
                  ? `${vehicle.make} ${vehicle.model}`
                  : "Not found"}

              </strong>

            </div>


            <div>

              <span>
                Registration
              </span>

              <strong>

                {vehicle?.registration ||
                  "Not recorded"}

              </strong>

            </div>


            <div>

              <span>
                Status
              </span>

              <strong>

                {vehicle?.status
                  ?.toUpperCase() ||
                  "UNKNOWN"}

              </strong>

            </div>


            <div>

              <span>
                Roadworthy
              </span>

              <strong>

                {vehicle?.roadworthy
                  ? "YES"
                  : "NO"}

              </strong>

            </div>


            <div>

              <span>
                Current Odometer
              </span>

              <strong>

                {Number(
                  vehicle
                    ?.current_odometer ||
                    0
                ).toLocaleString(
                  "en-ZA"
                )}{" "}
                km

              </strong>

            </div>


            <div>

              <span>
                Default Parking
              </span>

              <strong>

                {vehicle?.default_parking ||
                  "Not recorded"}

              </strong>

            </div>

          </div>


          <div
            style={{
              marginTop:
                "18px",
            }}
          >

            {vehicleChecks.map(
              (check) => (

                <div
                  key={
                    check.key
                  }
                  className={
                    check.passed
                      ? "confirmation-card"
                      : "damage-warning"
                  }
                  style={{
                    marginBottom:
                      "10px",
                  }}
                >

                  {check.passed ? (
                    <FaCheckCircle />
                  ) : (
                    <FaTimesCircle />
                  )}


                  <div>

                    <strong>
                      {check.label}
                    </strong>

                    <p>
                      {check.message}
                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        </section>


        {/* ========================================
            APPROVAL GATE
        ======================================== */}

        {request.status ===
          "pending" && (

          <section className="form-card">

            <div className="form-section-heading">

              <span>

                {request.out_of_province
                  ? "05"
                  : "04"}

              </span>

              <div>

                <h2>
                  Approval Gate
                </h2>

                <p>
                  The system checks driver
                  eligibility and vehicle
                  readiness before allowing
                  approval.
                </p>

              </div>

            </div>


            {canApprove ? (

              <div className="confirmation-card">

                <FaShieldAlt />

                <div>

                  <strong>
                    All Mandatory Checks Passed
                  </strong>

                  <p>
                    The driver and vehicle
                    currently satisfy the
                    mandatory approval
                    requirements.
                  </p>

                </div>

              </div>

            ) : (

              <div className="damage-warning">

                <FaExclamationTriangle />

                <div>

                  <strong>
                    Approval Blocked
                  </strong>

                  <p>
                    {
                      failedChecks.length
                    }{" "}
                    mandatory check
                    {failedChecks.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    must be resolved before
                    this request can be
                    approved.
                  </p>

                </div>

              </div>

            )}

          </section>

        )}


        {/* ========================================
            DECISION
        ======================================== */}

        {request.status ===
          "pending" && (

          <section className="form-card">

            <div className="form-section-heading">

              <span>

                {request.out_of_province
                  ? "06"
                  : "05"}

              </span>

              <div>

                <h2>
                  Decision
                </h2>

                <p>
                  Approve or decline this
                  booking request.
                </p>

              </div>

            </div>


            <div className="form-grid">

              <div className="input-group">

                <label>
                  Approval Notes
                </label>

                <textarea
                  rows="3"
                  value={
                    approvalNotes
                  }
                  onChange={(
                    event
                  ) =>
                    setApprovalNotes(
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional notes or instructions"
                />

              </div>


              <div className="input-group">

                <label>
                  Decline Reason
                </label>

                <textarea
                  rows="3"
                  value={
                    declineReason
                  }
                  onChange={(
                    event
                  ) =>
                    setDeclineReason(
                      event.target
                        .value
                    )
                  }
                  placeholder="Required only when declining"
                />

              </div>

            </div>


            <div className="approval-actions">

              <button
                type="button"
                disabled={
                  processing
                }
                onClick={
                  declineRequest
                }
                className="decline-button"
              >

                <FaTimesCircle />

                {processing
                  ? "Processing..."
                  : "Decline"}

              </button>


              <button
                type="button"
                disabled={
                  processing ||
                  !canApprove
                }
                onClick={
                  approveRequest
                }
                className="submit-button"
                title={
                  canApprove
                    ? "Approve this vehicle request"
                    : "Resolve all mandatory eligibility checks before approval"
                }
              >

                <FaCheckCircle />

                {processing
                  ? "Processing..."
                  : canApprove
                  ? "Approve Request"
                  : "Approval Blocked"}

              </button>

            </div>


            {!canApprove && (

              <div
                className="damage-warning"
                style={{
                  marginTop:
                    "16px",
                }}
              >

                <FaTimesCircle />

                <div>

                  <strong>
                    Requirements Outstanding
                  </strong>


                  {failedChecks.map(
                    (check) => (

                      <p
                        key={
                          check.key
                        }
                      >
                        •{" "}
                        {check.label}
                        :{" "}
                        {check.message}
                      </p>

                    )
                  )}

                </div>

              </div>

            )}

          </section>

        )}


        {/* ========================================
            APPROVED
        ======================================== */}

        {request.status ===
          "approved" && (

          <section className="confirmation-card">

            <div className="confirmation-icon">

              <FaCheckCircle />

            </div>


            <div>

              <strong>
                Booking Approved
              </strong>

              <p>

                Approved by{" "}
                {request.approved_by}{" "}
                on{" "}
                {formatDate(
                  request.approved_at
                )}

              </p>


              {request.approval_notes && (

                <p>
                  {
                    request.approval_notes
                  }
                </p>

              )}


              <Link
                to={`/checkout/${request.id}`}
                className="submit-button button-link"
              >

                Start Pre-Use Logbook

              </Link>

            </div>

          </section>

        )}


        {/* ========================================
            DECLINED
        ======================================== */}

        {request.status ===
          "declined" && (

          <section className="damage-warning">

            <FaTimesCircle />

            <div>

              <strong>
                Request Declined
              </strong>

              <p>

                {request.decline_reason ||
                  "No decline reason was recorded."}

              </p>

              {request.declined_by && (

                <p>

                  Declined by{" "}
                  {request.declined_by}{" "}
                  on{" "}
                  {formatDate(
                    request.declined_at
                  )}

                </p>

              )}

            </div>

          </section>

        )}


        {/* ========================================
            BACK
        ======================================== */}

        <div
          style={{
            marginTop:
              "20px",
          }}
        >

          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate(
                "/requests"
              )
            }
          >

            <FaArrowLeft />

            Back to Requests

          </button>

        </div>


      </div>

    </main>
  );
}


export default RequestApproval;