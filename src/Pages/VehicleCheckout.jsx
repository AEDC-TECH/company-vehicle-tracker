import {
  useEffect,
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
  FaClipboardCheck,
  FaExclamationTriangle,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import VehicleEvidenceUpload from "../Components/VehicleEvidenceUpload";

import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/VehicleForms.css";


const inspectionItems = [
  {
    key: "bodywork",
    label: "Exterior Bodywork",
  },
  {
    key: "tyres",
    label: "Tyres",
  },
  {
    key: "windscreen",
    label: "Windscreen",
  },
  {
    key: "lights",
    label: "Lights",
  },
];


const initialCondition =
  inspectionItems.reduce(
    (result, item) => {
      result[item.key] = "good";

      return result;
    },
    {}
  );


function VehicleCheckout() {
  const { requestId } =
    useParams();

  const navigate =
    useNavigate();


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
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  const [
    condition,
    setCondition,
  ] = useState(
    initialCondition
  );


  const [
    preUseEvidenceCount,
    setPreUseEvidenceCount,
  ] = useState(0);


  const [
    odometerEvidenceCount,
    setOdometerEvidenceCount,
  ] = useState(0);


  const [
    damageEvidenceCount,
    setDamageEvidenceCount,
  ] = useState(0);


  const [
    formData,
    setFormData,
  ] = useState({
    adminCompletedBy: "",

    phone: "",

    driverLicenseNumber: "",

    startOdometer: "",

    fuelBefore: "full",

    preExistingDamage: "no",

    preExistingDamageDescription:
      "",

    preUseNotes: "",

    licenseValidConfirmed: false,

    fitToDriveConfirmed: false,

    authorizedDriverConfirmed: false,

    policyAcknowledgedConfirmed:
      false,

    inspectionAccuracyConfirmed:
      false,
  });


  useEffect(() => {
    loadCheckout();
  }, [requestId]);


  function normalizeEmployeeNumber(
    value
  ) {
    return String(value || "")
      .trim()
      .toUpperCase();
  }


  /* =========================================================
     LOAD CHECKOUT
  ========================================================= */

  async function loadCheckout() {
    try {
      setLoading(true);

      setErrorMessage("");


      /*
       * =====================================================
       * LOAD APPROVED REQUEST
       * =====================================================
       */

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from(
          "vehicle_requests"
        )
        .select("*")
        .eq(
          "id",
          requestId
        )
        .single();


      if (requestError) {
        throw requestError;
      }


      if (
        requestData.status !==
        "approved"
      ) {
        throw new Error(
          "This booking has not been approved by the Facilities Manager."
        );
      }


      setRequest(
        requestData
      );


      /*
       * =====================================================
       * CHECK FOR EXISTING TRIP
       * =====================================================
       */

      const {
        data: existingTrip,
        error:
          existingTripError,
      } = await supabase
        .from(
          "vehicle_trips"
        )
        .select(
          "id, status, returned_at"
        )
        .eq(
          "request_id",
          requestId
        )
        .maybeSingle();


      if (
        existingTripError
      ) {
        throw existingTripError;
      }


      if (existingTrip) {
        if (
          existingTrip.status ===
            "in-use" ||
          (
            existingTrip.status ===
              "incident-open" &&
            !existingTrip.returned_at
          )
        ) {
          navigate(
            `/vehicles/return/${existingTrip.id}`
          );

          return;
        }


        if (
          existingTrip.status ===
            "returned" ||
          existingTrip.returned_at
        ) {
          navigate(
            "/history"
          );

          return;
        }
      }


      /*
       * =====================================================
       * LOAD VEHICLE
       * =====================================================
       */

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


      if (
        vehicleData.active ===
        false
      ) {
        throw new Error(
          "The selected company vehicle is inactive."
        );
      }


      setVehicle(
        vehicleData
      );


      /*
       * =====================================================
       * LOAD REGISTERED DRIVER
       * =====================================================
       */

      const employeeNumber =
        normalizeEmployeeNumber(
          requestData.employee_number
        );


      if (employeeNumber) {
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
          driverData ||
          null
        );


        /*
         * Pre-fill details already held
         * in the employee register.
         */

        setFormData(
          (previous) => ({
            ...previous,

            phone:
              driverData?.phone ||
              "",

            driverLicenseNumber:
              driverData
                ?.driver_license_number ||
              "",

            startOdometer:
              String(
                vehicleData
                  .current_odometer ||
                  0
              ),
          })
        );
      } else {
        setDriver(null);


        setFormData(
          (previous) => ({
            ...previous,

            startOdometer:
              String(
                vehicleData
                  .current_odometer ||
                  0
              ),
          })
        );
      }


      /*
       * =====================================================
       * LOAD PRE-USE EVIDENCE
       * =====================================================
       */

      const {
        data: existingEvidence,
        error: evidenceError,
      } = await supabase
        .from(
          "vehicle_evidence"
        )
        .select(
          "id, evidence_type"
        )
        .eq(
          "request_id",
          requestId
        )
        .eq(
          "evidence_stage",
          "pre-use"
        );


      if (evidenceError) {
        throw evidenceError;
      }


      const evidence =
        existingEvidence || [];


      setPreUseEvidenceCount(
        evidence.filter(
          (item) =>
            item.evidence_type ===
            "vehicle-condition"
        ).length
      );


      setOdometerEvidenceCount(
        evidence.filter(
          (item) =>
            item.evidence_type ===
            "odometer"
        ).length
      );


      setDamageEvidenceCount(
        evidence.filter(
          (item) =>
            item.evidence_type ===
            "pre-existing-damage"
        ).length
      );

    } catch (error) {

      console.error(
        "Admin checkout load error:",
        error
      );


      setErrorMessage(
        error.message ||
          "Unable to load approved booking."
      );

    } finally {

      setLoading(false);

    }
  }


  /* =========================================================
     FORM HANDLERS
  ========================================================= */

  function handleChange(
    event
  ) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;


    setFormData(
      (previous) => ({
        ...previous,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  }


  function handleConditionChange(
    key,
    value
  ) {
    setCondition(
      (previous) => ({
        ...previous,

        [key]: value,
      })
    );
  }


  /* =========================================================
     CHECK DRIVER ELIGIBILITY AGAIN
  ========================================================= */

  async function validateDriverBeforeCheckout() {
    const employeeNumber =
      normalizeEmployeeNumber(
        request.employee_number
      );


    if (!employeeNumber) {
      throw new Error(
        "Vehicle release blocked: the booking does not contain an employee number."
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
        "Vehicle release blocked: the employee is not registered in Employee Management."
      );
    }


    if (
      latestDriver.active !==
      true
    ) {
      throw new Error(
        "Vehicle release blocked: this employee is inactive."
      );
    }


    if (
      !latestDriver
        .driver_license_number
        ?.toString()
        .trim()
    ) {
      throw new Error(
        "Vehicle release blocked: no driver's licence is recorded for this employee."
      );
    }


    if (
      latestDriver
        .license_verified !==
      true
    ) {
      throw new Error(
        "Vehicle release blocked: the driver's licence is not verified."
      );
    }


    if (
      !latestDriver
        .license_expiry_date
    ) {
      throw new Error(
        "Vehicle release blocked: the driver's licence expiry date is missing."
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
        "Vehicle release blocked: the driver's licence expiry date is invalid."
      );
    }


    if (
      expiryDate <
      new Date()
    ) {
      throw new Error(
        "Vehicle release blocked: the driver's licence has expired."
      );
    }


    if (
      latestDriver
        .authorized_to_drive !==
      true
    ) {
      throw new Error(
        "Vehicle release blocked: this employee is not authorised to drive an AEDC company vehicle."
      );
    }


    if (
      latestDriver
        .policy_acknowledged !==
      true
    ) {
      throw new Error(
        "Vehicle release blocked: the AEDC Company Vehicle Use Policy has not been acknowledged."
      );
    }


    return latestDriver;
  }


  /* =========================================================
     SUBMIT PRE-USE LOGBOOK
  ========================================================= */

  async function handleSubmit(
    event
  ) {
    event.preventDefault();


    if (
      !vehicle ||
      !request
    ) {
      return;
    }


    /*
     * =====================================================
     * ADMIN / FACILITIES MANAGER AUDIT
     * =====================================================
     */

    const completedBy =
      formData
        .adminCompletedBy
        .trim();


    if (!completedBy) {
      alert(
        "Please enter the name of the Facilities Manager or Admin completing this logbook on behalf of the driver."
      );

      return;
    }


    /*
     * =====================================================
     * VEHICLE STATUS
     * =====================================================
     */

    if (
      vehicle.status !==
      "available"
    ) {
      alert(
        `${vehicle.make} ${vehicle.model} is currently ${vehicle.status || "unavailable"} and cannot be checked out.`
      );

      return;
    }


    if (
      !vehicle.roadworthy
    ) {
      alert(
        `${vehicle.make} ${vehicle.model} is marked as not roadworthy and cannot be used.`
      );

      return;
    }


    /*
     * =====================================================
     * ODOMETER
     * =====================================================
     */

    const startOdometer =
      Number(
        formData.startOdometer
      );


    if (
      !Number.isFinite(
        startOdometer
      )
    ) {
      alert(
        "Please enter a valid starting odometer reading."
      );

      return;
    }


    if (
      startOdometer <
      Number(
        vehicle
          .current_odometer ||
          0
      )
    ) {
      alert(
        `Starting odometer cannot be below ${Number(
          vehicle.current_odometer ||
            0
        ).toLocaleString(
          "en-ZA"
        )} km.`
      );

      return;
    }


    /*
     * =====================================================
     * LICENCE NUMBER
     * =====================================================
     */

    if (
      !formData
        .driverLicenseNumber
        .trim()
    ) {
      alert(
        "Please enter the driver's licence number."
      );

      return;
    }


    /*
     * =====================================================
     * DAMAGE
     * =====================================================
     */

    if (
      formData
        .preExistingDamage ===
        "yes" &&
      !formData
        .preExistingDamageDescription
        .trim()
    ) {
      alert(
        "Please describe the pre-existing damage."
      );

      return;
    }


    if (
      formData
        .preExistingDamage ===
        "yes" &&
      damageEvidenceCount ===
        0
    ) {
      alert(
        "Please upload at least one photo of the pre-existing damage."
      );

      return;
    }


    /*
     * =====================================================
     * DECLARATIONS
     * =====================================================
     */

    const declarationsComplete =
      formData
        .licenseValidConfirmed &&
      formData
        .fitToDriveConfirmed &&
      formData
        .authorizedDriverConfirmed &&
      formData
        .policyAcknowledgedConfirmed &&
      formData
        .inspectionAccuracyConfirmed;


    if (
      !declarationsComplete
    ) {
      alert(
        "All driver declarations must be confirmed before taking the vehicle."
      );

      return;
    }


    /*
     * =====================================================
     * CONFIRM ADMIN ON-BEHALF ENTRY
     * =====================================================
     */

    const confirmed =
      window.confirm(
        `Complete the pre-use logbook for ${request.requested_driver_name}?\n\nCompleted by: ${completedBy}\nVehicle: ${vehicle.make} ${vehicle.model}\n\nThis record will show that the Facilities Manager / Admin completed the pre-use entry on behalf of the driver.`
      );


    if (!confirmed) {
      return;
    }


    try {
      setSubmitting(true);

      setErrorMessage("");


      /*
       * =====================================================
       * RE-CHECK APPROVED REQUEST
       * =====================================================
       */

      const {
        data: latestRequest,
        error:
          latestRequestError,
      } = await supabase
        .from(
          "vehicle_requests"
        )
        .select("*")
        .eq(
          "id",
          request.id
        )
        .single();


      if (
        latestRequestError
      ) {
        throw latestRequestError;
      }


      if (
        latestRequest.status !==
        "approved"
      ) {
        throw new Error(
          "Vehicle release blocked: this booking is no longer approved."
        );
      }


      /*
       * =====================================================
       * RE-CHECK DRIVER
       * =====================================================
       */

      const latestDriver =
        await validateDriverBeforeCheckout();


      /*
       * Make sure the licence entered in the
       * logbook matches the verified licence
       * held in Employee Management.
       */

      const enteredLicense =
        formData
          .driverLicenseNumber
          .trim()
          .toUpperCase();


      const registeredLicense =
        String(
          latestDriver
            .driver_license_number ||
            ""
        )
          .trim()
          .toUpperCase();


      if (
        enteredLicense !==
        registeredLicense
      ) {
        throw new Error(
          "Vehicle release blocked: the licence number entered does not match the verified licence held in Employee Management."
        );
      }


      /*
       * =====================================================
       * RE-CHECK VEHICLE
       * =====================================================
       */

      const {
        data: latestVehicle,
        error:
          latestVehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq(
          "id",
          vehicle.id
        )
        .single();


      if (
        latestVehicleError
      ) {
        throw latestVehicleError;
      }


      if (
        latestVehicle.active ===
        false
      ) {
        throw new Error(
          "Vehicle release blocked: the company vehicle is inactive."
        );
      }


      if (
        latestVehicle
          .roadworthy !==
        true
      ) {
        throw new Error(
          "Vehicle release blocked: the company vehicle is no longer marked as roadworthy."
        );
      }


      if (
        latestVehicle.status !==
        "available"
      ) {
        throw new Error(
          `Vehicle release blocked: ${latestVehicle.make} ${latestVehicle.model} is currently ${latestVehicle.status || "unavailable"}.`
        );
      }


      /*
       * =====================================================
       * CHECK AGAIN FOR EXISTING TRIP
       * =====================================================
       */

      const {
        data:
          existingTripNow,
        error:
          existingTripNowError,
      } = await supabase
        .from(
          "vehicle_trips"
        )
        .select(
          "id, status"
        )
        .eq(
          "request_id",
          request.id
        )
        .maybeSingle();


      if (
        existingTripNowError
      ) {
        throw existingTripNowError;
      }


      if (
        existingTripNow
      ) {
        throw new Error(
          "A vehicle trip has already been created for this booking."
        );
      }


      /*
       * =====================================================
       * CREATE TRIP
       * =====================================================
       */

      const now =
        new Date()
          .toISOString();


      const {
        data: trip,
        error: tripError,
      } = await supabase
        .from(
          "vehicle_trips"
        )
        .insert({
          vehicle_id:
            vehicle.id,

          request_id:
            request.id,

          booking_reference:
            request.booking_reference,

          driver_name:
            request.requested_driver_name,

          employee_number:
            normalizeEmployeeNumber(
              request.employee_number
            ),

          department:
            request.department,

          phone:
            formData
              .phone
              .trim() ||
            latestDriver.phone ||
            null,

          driver_license_number:
            formData
              .driverLicenseNumber
              .trim(),

          license_valid_confirmed:
            formData
              .licenseValidConfirmed,

          fit_to_drive_confirmed:
            formData
              .fitToDriveConfirmed,

          authorized_driver_confirmed:
            formData
              .authorizedDriverConfirmed,

          policy_acknowledged_confirmed:
            formData
              .policyAcknowledgedConfirmed,

          purpose:
            request.purpose,

          destination:
            request.destination,

          expected_return_at:
            request.requested_return_at,

          matches_approved_booking:
            true,

          start_odometer:
            startOdometer,

          fuel_before:
            formData.fuelBefore,

          condition_before:
            condition,

          pre_existing_damage:
            formData
              .preExistingDamage ===
            "yes",

          pre_existing_damage_description:
            formData
              .preExistingDamage ===
            "yes"
              ? formData
                  .preExistingDamageDescription
                  .trim()
              : null,

          pre_use_notes:
            formData
              .preUseNotes
              .trim() ||
            null,

          /*
           * CORRECT CURRENT VEHICLE FIELD:
           * default_parking
           */

          expected_parking_location:
            request.out_of_province
              ? request
                  .overnight_location ||
                latestVehicle
                  .default_parking ||
                null
              : latestVehicle
                  .default_parking ||
                null,

          out_of_province:
            Boolean(
              request.out_of_province
            ),

          approved_itinerary:
            request.itinerary ||
            null,

          approved_overnight_location:
            request
              .overnight_location ||
            null,

          information_accuracy_confirmed:
            formData
              .inspectionAccuracyConfirmed,

          /*
           * ADMIN AUDIT TRAIL
           */

          pre_inspection_completed_by:
            completedBy,

          pre_inspection_completed_by_role:
            "admin",

          pre_inspection_on_behalf:
            true,

          pre_inspection_completed_at:
            now,

          status:
            "in-use",
        })
        .select("*")
        .single();


      if (tripError) {
        throw tripError;
      }


      /*
       * =====================================================
       * LINK PRE-USE EVIDENCE TO TRIP
       * =====================================================
       */

      const {
        error:
          evidenceLinkError,
      } = await supabase
        .from(
          "vehicle_evidence"
        )
        .update({
          trip_id:
            trip.id,
        })
        .eq(
          "request_id",
          request.id
        )
        .eq(
          "evidence_stage",
          "pre-use"
        )
        .is(
          "trip_id",
          null
        );


      if (
        evidenceLinkError
      ) {
        console.error(
          "Unable to link pre-use evidence:",
          evidenceLinkError
        );
      }


      /*
       * =====================================================
       * SET VEHICLE IN USE
       * =====================================================
       */

      const {
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .update({
          status:
            "in-use",

          current_odometer:
            startOdometer,
        })
        .eq(
          "id",
          vehicle.id
        );


      if (vehicleError) {
        throw vehicleError;
      }


      /*
       * =====================================================
       * SUCCESS
       * =====================================================
       */

      alert(
        `Pre-use logbook completed successfully.\n\nBooking: ${request.booking_reference}\nDriver: ${request.requested_driver_name}\nVehicle: ${vehicle.make} ${vehicle.model}\nCompleted by: ${completedBy}\n\nThe vehicle is now IN USE.`
      );


      navigate("/");

    } catch (error) {

      console.error(
        "Admin checkout error:",
        error
      );


      setErrorMessage(
        error.message ||
          "Unable to start the trip."
      );


      window.alert(
        error.message ||
          "Unable to start the trip."
      );

    } finally {

      setSubmitting(false);

    }
  }


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="vehicle-form-page">

        <div className="page-loading">

          <FaCar />

          <h2>
            Loading Approved Booking
          </h2>

          <p>
            Preparing the pre-use
            digital logbook...
          </p>

        </div>

      </main>
    );
  }


  /* =========================================================
     ERROR
  ========================================================= */

  if (
    !request ||
    !vehicle ||
    errorMessage
  ) {
    return (
      <main className="vehicle-form-page">

        <div className="page-loading">

          <div>

            <FaExclamationTriangle />

            <h2>
              Checkout Unavailable
            </h2>

            <p>
              {errorMessage ||
                "This approved booking could not be loaded."}
            </p>

            <Link
              to="/requests"
              className="submit-button button-link"
            >
              Vehicle Requests
            </Link>

          </div>

        </div>

      </main>
    );
  }


  return (
    <main className="vehicle-form-page">


      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="form-header">

        <div className="form-header-inner">

          <Link
            to={`/requests/${request.id}`}
            className="back-button"
          >
            <FaArrowLeft />

            Booking
          </Link>


          <div className="form-brand">

            <AEDCLogo
              compact
              className="form-brand-logo"
            />

            <span>
              Vehicle Management
            </span>

          </div>

        </div>

      </header>


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="form-hero">

        <div className="form-hero-inner">

          <span>
            PRE-USE DIGITAL LOGBOOK
          </span>

          <h1>
            Vehicle Checkout
          </h1>

          <p>
            Complete the mandatory
            inspection before the
            vehicle keys are released.
          </p>

        </div>

      </section>


      <form
        className="vehicle-form"
        onSubmit={
          handleSubmit
        }
      >


        {/* ===================================================
            APPROVED BOOKING
        =================================================== */}

        <section className="form-card">

          <span className="booking-reference">
            {request.booking_reference}
          </span>

          <h2>
            Approved Booking
          </h2>


          <div className="request-info-grid">

            <div>

              <FaUser />

              <span>
                Driver
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

              <FaCar />

              <span>
                Vehicle
              </span>

              <strong>
                {vehicle.make}{" "}
                {vehicle.model}
              </strong>

            </div>


            <div>

              <span>
                Registration
              </span>

              <strong>
                {vehicle.registration ||
                  "Not recorded"}
              </strong>

            </div>


            <div>

              <span>
                Destination
              </span>

              <strong>
                {request.destination}
              </strong>

            </div>


            <div>

              <span>
                Purpose
              </span>

              <strong>
                {request.purpose}
              </strong>

            </div>


            <div>

              <span>
                Default Parking
              </span>

              <strong>
                {vehicle.default_parking ||
                  "Not recorded"}
              </strong>

            </div>

          </div>

        </section>


        {/* ===================================================
            ADMIN AUDIT
        =================================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              01
            </span>

            <div>

              <h2>
                Admin Completion Record
              </h2>

              <p>
                Record the Facilities
                Manager or Admin completing
                this pre-use entry on behalf
                of the intended driver.
              </p>

            </div>

          </div>


          <div className="confirmation-card">

            <FaShieldAlt />

            <div>

              <strong>
                On-Behalf Entry
              </strong>

              <p>
                This Admin page creates an
                audit record showing who
                completed the pre-use
                logbook and that it was
                completed on behalf of the
                employee.
              </p>

            </div>

          </div>


          <div className="form-grid">

            <div className="input-group">

              <label>
                Facilities Manager /
                Admin Name *
              </label>

              <input
                required
                type="text"
                name="adminCompletedBy"
                value={
                  formData
                    .adminCompletedBy
                }
                onChange={
                  handleChange
                }
                placeholder="Full name of person completing this form"
              />

            </div>

          </div>

        </section>


        {/* ===================================================
            DRIVER VERIFICATION
        =================================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              02
            </span>

            <div>

              <h2>
                Driver Verification
              </h2>

              <p>
                Verify the intended driver
                against the approved booking
                and AEDC Employee Register.
              </p>

            </div>

          </div>


          {driver ? (

            <div className="confirmation-card">

              <FaCheckCircle />

              <div>

                <strong>
                  Employee Record Found
                </strong>

                <p>
                  {driver.full_name} is
                  registered under employee
                  number{" "}
                  {driver.employee_number}.
                </p>

              </div>

            </div>

          ) : (

            <div className="damage-warning">

              <FaExclamationTriangle />

              <div>

                <strong>
                  Employee Record Missing
                </strong>

                <p>
                  The employee could not be
                  matched to Employee
                  Management. Vehicle
                  release will be blocked.
                </p>

              </div>

            </div>

          )}


          <div className="form-grid two-columns">

            <div className="input-group">

              <label>
                Driver Full Name
              </label>

              <input
                disabled
                value={
                  request
                    .requested_driver_name ||
                  ""
                }
              />

            </div>


            <div className="input-group">

              <label>
                Employee / Contractor No.
              </label>

              <input
                disabled
                value={
                  request.employee_number ||
                  ""
                }
              />

            </div>


            <div className="input-group">

              <label>
                Driver Licence Number *
              </label>

              <input
                required
                type="text"
                name="driverLicenseNumber"
                value={
                  formData
                    .driverLicenseNumber
                }
                onChange={
                  handleChange
                }
                placeholder="Driver licence number"
              />

            </div>


            <div className="input-group">

              <label>
                Contact Number
              </label>

              <input
                type="tel"
                name="phone"
                value={
                  formData.phone
                }
                onChange={
                  handleChange
                }
                placeholder="Contact number"
              />

            </div>

          </div>

        </section>


        {/* ===================================================
            ODOMETER & FUEL
        =================================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              03
            </span>

            <div>

              <h2>
                Odometer & Fuel
              </h2>

              <p>
                Record the readings
                immediately before
                departure.
              </p>

            </div>

          </div>


          <div className="form-grid two-columns">

            <div className="input-group">

              <label>
                Starting Odometer
                (km) *
              </label>

              <input
                required
                type="number"
                min={
                  vehicle
                    .current_odometer
                }
                step="1"
                name="startOdometer"
                value={
                  formData
                    .startOdometer
                }
                onChange={
                  handleChange
                }
              />

            </div>


            <div className="input-group">

              <label>
                Fuel Level *
              </label>

              <select
                required
                name="fuelBefore"
                value={
                  formData
                    .fuelBefore
                }
                onChange={
                  handleChange
                }
              >

                <option value="full">
                  Full
                </option>

                <option value="three-quarter">
                  3/4
                </option>

                <option value="half">
                  1/2
                </option>

                <option value="quarter">
                  1/4
                </option>

                <option value="almost-empty">
                  Almost Empty
                </option>

              </select>

            </div>

          </div>

        </section>


        {/* ===================================================
            PRE-USE INSPECTION
        =================================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              04
            </span>

            <div>

              <h2>
                Pre-Use Inspection
              </h2>

              <p>
                Inspect the required
                vehicle areas before
                departure.
              </p>

            </div>

          </div>


          <div className="inspection-grid">

            {inspectionItems.map(
              (item) => (

                <div
                  key={
                    item.key
                  }
                  className="inspection-item"
                >

                  <strong>
                    {item.label}
                  </strong>


                  <div className="condition-buttons">

                    <button
                      type="button"
                      className={
                        condition[
                          item.key
                        ] ===
                        "good"
                          ? "condition-button selected-good"
                          : "condition-button"
                      }
                      onClick={() =>
                        handleConditionChange(
                          item.key,
                          "good"
                        )
                      }
                    >
                      Good
                    </button>


                    <button
                      type="button"
                      className={
                        condition[
                          item.key
                        ] ===
                        "attention"
                          ? "condition-button selected-attention"
                          : "condition-button"
                      }
                      onClick={() =>
                        handleConditionChange(
                          item.key,
                          "attention"
                        )
                      }
                    >
                      Attention
                    </button>


                    <button
                      type="button"
                      className={
                        condition[
                          item.key
                        ] ===
                        "damaged"
                          ? "condition-button selected-damaged"
                          : "condition-button"
                      }
                      onClick={() =>
                        handleConditionChange(
                          item.key,
                          "damaged"
                        )
                      }
                    >
                      Damaged
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        </section>


        {/* ===================================================
            EXISTING DAMAGE
        =================================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              05
            </span>

            <div>

              <h2>
                Existing Damage
              </h2>

              <p>
                Record any existing
                damage, however minor.
              </p>

            </div>

          </div>


          <div className="form-grid">

            <div className="input-group">

              <label>
                Pre-existing Damage? *
              </label>

              <select
                name="preExistingDamage"
                value={
                  formData
                    .preExistingDamage
                }
                onChange={
                  handleChange
                }
              >

                <option value="no">
                  No
                </option>

                <option value="yes">
                  Yes
                </option>

              </select>

            </div>


            {formData
              .preExistingDamage ===
              "yes" && (

              <div className="input-group">

                <label>
                  Damage Description *
                </label>

                <textarea
                  required
                  rows="4"
                  name="preExistingDamageDescription"
                  value={
                    formData
                      .preExistingDamageDescription
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Describe every existing scratch, dent, crack or other issue"
                />

              </div>

            )}


            <div className="input-group">

              <label>
                Additional Notes
              </label>

              <textarea
                rows="3"
                name="preUseNotes"
                value={
                  formData
                    .preUseNotes
                }
                onChange={
                  handleChange
                }
                placeholder="Optional notes about the vehicle before departure"
              />

            </div>

          </div>

        </section>


        {/* ===================================================
            PHOTOGRAPHS
        =================================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              06
            </span>

            <div>

              <h2>
                Pre-Use Photographs
              </h2>

              <p>
                Record photographic
                evidence of the{" "}
                {vehicle.make}{" "}
                {vehicle.model} before
                departure.
              </p>

            </div>

          </div>


          <VehicleEvidenceUpload
            vehicleId={
              vehicle.id
            }
            requestId={
              request.id
            }
            stage="pre-use"
            type="vehicle-condition"
            title="Vehicle Condition Photos"
            description={`Photograph the exterior condition of the ${vehicle.make} ${vehicle.model} before departure.`}
            onUploaded={(
              files
            ) =>
              setPreUseEvidenceCount(
                (current) =>
                  current +
                  files.length
              )
            }
          />


          <VehicleEvidenceUpload
            vehicleId={
              vehicle.id
            }
            requestId={
              request.id
            }
            stage="pre-use"
            type="odometer"
            title="Starting Odometer Photo"
            description="Photograph the dashboard showing the starting odometer."
            multiple={
              false
            }
            onUploaded={(
              files
            ) =>
              setOdometerEvidenceCount(
                (current) =>
                  current +
                  files.length
              )
            }
          />


          {formData
            .preExistingDamage ===
            "yes" && (

            <VehicleEvidenceUpload
              vehicleId={
                vehicle.id
              }
              requestId={
                request.id
              }
              stage="pre-use"
              type="pre-existing-damage"
              title="Pre-Existing Damage Photos"
              description="Upload clear photos of all damage already present before the trip."
              required
              onUploaded={(
                files
              ) =>
                setDamageEvidenceCount(
                  (current) =>
                    current +
                    files.length
                )
              }
            />

          )}


          <div className="evidence-status-summary">

            <span>
              Vehicle photos:{" "}
              <strong>
                {
                  preUseEvidenceCount
                }
              </strong>
            </span>


            <span>
              Odometer photos:{" "}
              <strong>
                {
                  odometerEvidenceCount
                }
              </strong>
            </span>


            {formData
              .preExistingDamage ===
              "yes" && (

              <span>
                Damage photos:{" "}
                <strong>
                  {
                    damageEvidenceCount
                  }
                </strong>
              </span>

            )}

          </div>

        </section>


        {/* ===================================================
            DRIVER DECLARATION
        =================================================== */}

        <section className="form-card">

          <div className="form-section-heading">

            <span>
              07
            </span>

            <div>

              <h2>
                Driver Declaration
              </h2>

              <p>
                Every declaration must
                be confirmed before
                vehicle release.
              </p>

            </div>

          </div>


          <div className="declaration-list">


            <label className="confirmation-check">

              <input
                type="checkbox"
                name="licenseValidConfirmed"
                checked={
                  formData
                    .licenseValidConfirmed
                }
                onChange={
                  handleChange
                }
              />

              <span>
                I confirm that the
                intended driver holds
                a current valid
                driver's licence
                appropriate for this
                vehicle.
              </span>

            </label>


            <label className="confirmation-check">

              <input
                type="checkbox"
                name="authorizedDriverConfirmed"
                checked={
                  formData
                    .authorizedDriverConfirmed
                }
                onChange={
                  handleChange
                }
              />

              <span>
                I confirm that the
                intended driver is
                authorized to drive
                this AEDC company
                vehicle.
              </span>

            </label>


            <label className="confirmation-check">

              <input
                type="checkbox"
                name="fitToDriveConfirmed"
                checked={
                  formData
                    .fitToDriveConfirmed
                }
                onChange={
                  handleChange
                }
              />

              <span>
                The driver confirms
                that they are fit to
                drive and are not
                impaired by alcohol,
                drugs, medication,
                fatigue or illness.
              </span>

            </label>


            <label className="confirmation-check">

              <input
                type="checkbox"
                name="policyAcknowledgedConfirmed"
                checked={
                  formData
                    .policyAcknowledgedConfirmed
                }
                onChange={
                  handleChange
                }
              />

              <span>
                I confirm that the
                intended driver has
                acknowledged the AEDC
                Company Vehicle Use
                Policy.
              </span>

            </label>


            <label className="confirmation-check">

              <input
                type="checkbox"
                name="inspectionAccuracyConfirmed"
                checked={
                  formData
                    .inspectionAccuracyConfirmed
                }
                onChange={
                  handleChange
                }
              />

              <span>
                I confirm that this
                pre-use inspection
                record is complete,
                honest and accurate.
              </span>

            </label>

          </div>

        </section>


        {/* ===================================================
            FINAL ACTIONS
        =================================================== */}

        <div className="form-actions">

          <Link
            to={`/requests/${request.id}`}
            className="cancel-button"
          >
            Cancel
          </Link>


          <button
            disabled={
              submitting
            }
            type="submit"
            className="submit-button"
          >

            <FaClipboardCheck />

            {submitting
              ? "Starting Trip..."
              : "Complete Logbook & Release Vehicle"}

          </button>

        </div>


      </form>

    </main>
  );
}


export default VehicleCheckout;