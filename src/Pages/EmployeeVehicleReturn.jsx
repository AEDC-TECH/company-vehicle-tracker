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
  FaExclamationTriangle,
  FaGasPump,
  FaKey,
  FaMapMarkerAlt,
  FaRoad,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import { lookupVehicleEmployee } from "../lib/employeeLookup";

import {
  completeVehicleReturnForEmployee,
  getVehicleTripForEmployee,
} from "../lib/vehicleTripLookup";

import {
  listVehiclePostUseEvidenceForTrip,
} from "../lib/vehicleEvidenceLookup";

import AEDCLogo from "../Components/AEDCLogo";

import VehicleEvidenceUpload from "../Components/VehicleEvidenceUpload";

import "../Styles/EmployeeVehicleReturn.css";


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


const severity = {
  good: 0,
  attention: 1,
  damaged: 2,
};


function EmployeeVehicleReturn() {
  const { tripId } = useParams();

  const navigate = useNavigate();


  const [
    employee,
    setEmployee,
  ] = useState(null);


  const [
    trip,
    setTrip,
  ] = useState(null);


  const [
    vehicle,
    setVehicle,
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
    conditionAfter,
    setConditionAfter,
  ] = useState({});


  const [
    damageEvidenceCount,
    setDamageEvidenceCount,
  ] = useState(0);


  const [
    formData,
    setFormData,
  ] = useState({
    endOdometer: "",

    fuelAfter: "full",

    fuelPurchased: "no",

    fuelAmount: "",

    fuelReceiptSubmitted: "no",

    fuelReceiptReference: "",

    newDamage: "no",

    newDamageDescription: "",

    warningLightReported: "no",

    warningLightDescription: "",

    mechanicalIssueReported: "no",

    mechanicalIssueDescription: "",

    postUseNotes: "",

    returnedToDesignatedBay: "yes",

    returnParkingLocation:
      "AEDC Office Basement Parking",

    alternativeParkingReason: "",

    vehicleLocked: false,

    windowsClosed: false,

    personalBelongingsRemoved: false,

    companyPropertyRemoved: false,

    keysReturned: false,

    keysReturnedTo: "",

    returnConditionConfirmed: false,

    vehicleSecuredConfirmed: false,

    informationAccuracyConfirmed: false,
  });


  useEffect(() => {
    loadReturn();
  }, [tripId]);


  function normalizeEmployeeNumber(
    value
  ) {
    return String(value || "")
      .trim()
      .toUpperCase();
  }


  function getStoredEmployeeNumber() {
    return normalizeEmployeeNumber(
      localStorage.getItem(
        "aedc_employee_number"
      )
    );
  }


  async function loadReturn() {
    try {
      setLoading(true);

      setErrorMessage("");


      /*
       * ============================================
       * GET EMPLOYEE SESSION
       * ============================================
       */

      const storedEmployeeNumber =
        getStoredEmployeeNumber();


      if (!storedEmployeeNumber) {
        throw new Error(
          "Your employee session could not be found. Please return to the Employee Portal and enter your company number again."
        );
      }


      /*
       * ============================================
       * VERIFY EMPLOYEE AGAINST DATABASE
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
          "Your AEDC Vehicle System access is inactive. Please contact Admin."
        );
      }


      setEmployee(
        employeeData
      );


      /*
       * ============================================
       * LOAD TRIP
       * ============================================
       */

      const tripData =
        await getVehicleTripForEmployee(
          tripId,
          storedEmployeeNumber
        );


      if (!tripData) {
        throw new Error(
          "You are not authorised to complete the return for this trip."
        );
      }


      if (
        tripData.status !==
          "in-use" &&
        tripData.status !==
          "incident-open"
      ) {
        throw new Error(
          "This vehicle trip has already been completed."
        );
      }


      /*
       * ============================================
       * EMPLOYEE OWNERSHIP CHECK
       * ============================================
       */

      const tripEmployeeNumber =
        normalizeEmployeeNumber(
          tripData.employee_number
        );


      const currentEmployeeNumber =
        normalizeEmployeeNumber(
          employeeData.employee_number
        );


      if (
        tripEmployeeNumber !==
        currentEmployeeNumber
      ) {
        throw new Error(
          "You are not authorised to complete the return for this trip."
        );
      }


      setTrip(
        tripData
      );


      /*
       * ============================================
       * LOAD VEHICLE
       * ============================================
       */

      const {
        data: vehicleData,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq(
          "id",
          tripData.vehicle_id
        )
        .single();


      if (vehicleError) {
        throw vehicleError;
      }


      setVehicle(
        vehicleData
      );


      /*
       * ============================================
       * LOAD PRE-USE CONDITION
       * ============================================
       */

      const before =
        tripData.condition_before ||
        {};


      setConditionAfter({
        bodywork:
          before.bodywork ||
          "good",

        tyres:
          before.tyres ||
          "good",

        windscreen:
          before.windscreen ||
          "good",

        lights:
          before.lights ||
          "good",
      });


      /*
       * ============================================
       * DEFAULT RETURN VALUES
       * ============================================
       */

      setFormData(
        (previous) => ({
          ...previous,

          endOdometer:
            String(
              tripData.start_odometer ||
                0
            ),

          fuelAfter:
            tripData.fuel_before ||
            "full",

          returnParkingLocation:
            tripData.out_of_province
              ? tripData
                  .approved_overnight_location ||
                vehicleData
                  .default_parking ||
                "AEDC Office Basement Parking"
              : vehicleData
                  .default_parking ||
                "AEDC Office Basement Parking",
        })
      );


      /*
       * ============================================
       * LOAD EXISTING POST-USE DAMAGE EVIDENCE
       * ============================================
       */

      const evidenceData =
        await listVehiclePostUseEvidenceForTrip(
          tripId,
          storedEmployeeNumber
        );


      if (evidenceData === null) {
        throw new Error(
          "You are not authorised to access evidence for this trip."
        );
      }


      setDamageEvidenceCount(
        (
          evidenceData ||
          []
        ).filter(
          (item) =>
            item.evidence_type ===
            "new-damage"
        ).length
      );

    } catch (error) {

      console.error(
        "Employee return load error:",
        error
      );


      setErrorMessage(
        error.message ||
          "Unable to load your active vehicle trip."
      );

    } finally {

      setLoading(
        false
      );

    }
  }


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
    setConditionAfter(
      (previous) => ({
        ...previous,

        [key]:
          value,
      })
    );
  }


  const conditionChanges =
    useMemo(
      () => {
        if (!trip) {
          return [];
        }


        const before =
          trip.condition_before ||
          {};


        return inspectionItems
          .filter(
            (item) => {

              const beforeValue =
                before[
                  item.key
                ] ||
                "good";


              const afterValue =
                conditionAfter[
                  item.key
                ] ||
                "good";


              return (
                severity[
                  afterValue
                ] >
                severity[
                  beforeValue
                ]
              );
            }
          )
          .map(
            (item) => ({
              key:
                item.key,

              label:
                item.label,

              before:
                before[
                  item.key
                ] ||
                "good",

              after:
                conditionAfter[
                  item.key
                ] ||
                "good",
            })
          );
      },
      [
        trip,
        conditionAfter,
      ]
    );


  function fuelScore(
    value
  ) {
    const levels = {
      "almost-empty": 0,
      quarter: 1,
      half: 2,
      "three-quarter": 3,
      full: 4,
    };


    return (
      levels[
        value
      ] ??
      0
    );
  }


  const fuelLowerThanDeparture =
    trip
      ? fuelScore(
          formData
            .fuelAfter
        ) <
        fuelScore(
          trip
            .fuel_before
        )
      : false;


  const distance =
    trip
      ? Math.max(
          0,

          Number(
            formData
              .endOdometer ||
              0
          ) -
            Number(
              trip
                .start_odometer ||
                0
            )
        )
      : 0;


  async function handleSubmit(
    event
  ) {
    event.preventDefault();


    if (
      !trip ||
      !vehicle ||
      !employee
    ) {
      return;
    }


    const endOdometer =
      Number(
        formData
          .endOdometer
      );


    /*
     * ============================================
     * ODOMETER VALIDATION
     * ============================================
     */

    if (
      !Number.isFinite(
        endOdometer
      )
    ) {
      window.alert(
        "Please enter a valid ending odometer reading."
      );

      return;
    }


    if (
      endOdometer <
      Number(
        trip.start_odometer
      )
    ) {
      window.alert(
        "Ending odometer cannot be lower than the starting odometer."
      );

      return;
    }


    /*
     * ============================================
     * FUEL VALIDATION
     * ============================================
     */

    if (
      formData
        .fuelPurchased ===
        "yes" &&
      Number(
        formData
          .fuelAmount
      ) <= 0
    ) {
      window.alert(
        "Please enter the amount spent on fuel."
      );

      return;
    }


    if (
      formData
        .fuelReceiptSubmitted ===
        "yes" &&
      !formData
        .fuelReceiptReference
        .trim()
    ) {
      window.alert(
        "Please enter the fuel receipt reference."
      );

      return;
    }


    if (
      fuelLowerThanDeparture &&
      formData
        .fuelPurchased !==
        "yes"
    ) {
      const continueReturn =
        window.confirm(
          "The vehicle is being returned with less fuel than it had at departure. Continue with the return?"
        );


      if (
        !continueReturn
      ) {
        return;
      }
    }


    /*
     * ============================================
     * DAMAGE VALIDATION
     * ============================================
     */

    if (
      formData
        .newDamage ===
        "yes" &&
      !formData
        .newDamageDescription
        .trim()
    ) {
      window.alert(
        "Please describe the new damage."
      );

      return;
    }


    if (
      formData
        .newDamage ===
        "yes" &&
      damageEvidenceCount ===
        0
    ) {
      window.alert(
        "Please upload at least one photograph of the new damage."
      );

      return;
    }


    /*
     * ============================================
     * WARNING LIGHT VALIDATION
     * ============================================
     */

    if (
      formData
        .warningLightReported ===
        "yes" &&
      !formData
        .warningLightDescription
        .trim()
    ) {
      window.alert(
        "Please describe the warning light."
      );

      return;
    }


    /*
     * ============================================
     * MECHANICAL ISSUE VALIDATION
     * ============================================
     */

    if (
      formData
        .mechanicalIssueReported ===
        "yes" &&
      !formData
        .mechanicalIssueDescription
        .trim()
    ) {
      window.alert(
        "Please describe the mechanical issue."
      );

      return;
    }


    /*
     * ============================================
     * PARKING VALIDATION
     * ============================================
     */

    if (
      formData
        .returnedToDesignatedBay ===
        "no" &&
      !formData
        .returnParkingLocation
        .trim()
    ) {
      window.alert(
        "Please record where the vehicle was parked."
      );

      return;
    }


    if (
      formData
        .returnedToDesignatedBay ===
        "no" &&
      !formData
        .alternativeParkingReason
        .trim()
    ) {
      window.alert(
        "Please explain why the vehicle was not returned to the designated AEDC parking bay."
      );

      return;
    }


    /*
     * ============================================
     * KEY VALIDATION
     * ============================================
     */

    if (
      !formData
        .keysReturned
    ) {
      window.alert(
        "Please confirm that the vehicle keys have been returned or secured."
      );

      return;
    }


    if (
      !formData
        .keysReturnedTo
        .trim()
    ) {
      window.alert(
        "Please state who received or secured the vehicle keys."
      );

      return;
    }


    /*
     * ============================================
     * SECURITY CONFIRMATIONS
     * ============================================
     */

    const securityComplete =
      formData
        .vehicleLocked &&
      formData
        .windowsClosed &&
      formData
        .personalBelongingsRemoved &&
      formData
        .companyPropertyRemoved;


    if (
      !securityComplete
    ) {
      window.alert(
        "Please complete all vehicle security confirmations."
      );

      return;
    }


    /*
     * ============================================
     * RETURN DECLARATIONS
     * ============================================
     */

    const declarationsComplete =
      formData
        .returnConditionConfirmed &&
      formData
        .vehicleSecuredConfirmed &&
      formData
        .informationAccuracyConfirmed;


    if (
      !declarationsComplete
    ) {
      window.alert(
        "Please complete all return declarations."
      );

      return;
    }


    /*
     * ============================================
     * CONDITION CHANGE CHECK
     * ============================================
     */

    if (
      conditionChanges.length >
        0 &&
      formData
        .newDamage ===
        "no"
    ) {
      const continueReturn =
        window.confirm(
          "The post-use inspection shows that the vehicle condition has worsened, but New Damage is set to No. Continue?"
        );


      if (
        !continueReturn
      ) {
        return;
      }
    }


    /*
     * ============================================
     * FINAL CONFIRMATION
     * ============================================
     */

    const confirmed =
      window.confirm(
        `Complete the return for ${vehicle.make} ${vehicle.model}?\n\nOnce submitted, this trip will be closed.`
      );


    if (!confirmed) {
      return;
    }


    try {
      setSubmitting(
        true
      );

      setErrorMessage(
        ""
      );


      const hasIncident =
        formData
          .newDamage ===
        "yes" ||
        formData
          .warningLightReported ===
        "yes" ||
        formData
          .mechanicalIssueReported ===
        "yes";


      /*
       * ============================================
       * COMPLETE VEHICLE RETURN
       * ============================================
       *
       * The database transaction updates the trip,
       * updates the vehicle and completes the
       * attached request as one restricted
       * server-side operation.
       */

      await completeVehicleReturnForEmployee({
        tripId:
          trip.id,

        employeeNumber:
          employee.employee_number,

        endOdometer,

        fuelAfter:
          formData.fuelAfter,

        fuelPurchased:
          formData.fuelPurchased ===
          "yes",

        fuelAmount:
          Number(
            formData.fuelAmount ||
            0
          ),

        fuelReceiptSubmitted:
          formData.fuelReceiptSubmitted ===
          "yes",

        fuelReceiptReference:
          formData.fuelReceiptReference,

        conditionAfter,

        conditionChanges,

        newDamage:
          formData.newDamage ===
          "yes",

        newDamageDescription:
          formData.newDamageDescription,

        warningLightReported:
          formData.warningLightReported ===
          "yes",

        warningLightDescription:
          formData.warningLightDescription,

        mechanicalIssueReported:
          formData.mechanicalIssueReported ===
          "yes",

        mechanicalIssueDescription:
          formData.mechanicalIssueDescription,

        postUseNotes:
          formData.postUseNotes,

        returnParkingLocation:
          formData.returnParkingLocation,

        returnedToDesignatedBay:
          formData.returnedToDesignatedBay ===
          "yes",

        alternativeParkingReason:
          formData.alternativeParkingReason,

        vehicleLocked:
          formData.vehicleLocked,

        windowsClosed:
          formData.windowsClosed,

        personalBelongingsRemoved:
          formData.personalBelongingsRemoved,

        companyPropertyRemoved:
          formData.companyPropertyRemoved,

        keysReturned:
          formData.keysReturned,

        keysReturnedTo:
          formData.keysReturnedTo,

        returnConditionConfirmed:
          formData.returnConditionConfirmed,

        vehicleSecuredConfirmed:
          formData.vehicleSecuredConfirmed,

        informationAccuracyConfirmed:
          formData.informationAccuracyConfirmed,
      });


      /*
       * ============================================
       * SUCCESS
       * ============================================
       */

      if (
        hasIncident
      ) {
        window.alert(
          `${vehicle.make} ${vehicle.model} has been returned successfully. An issue was reported, so the vehicle has been marked UNAVAILABLE pending Admin review.`
        );
      } else {
        window.alert(
          `${vehicle.make} ${vehicle.model} has been returned successfully and is now AVAILABLE.`
        );
      }


      navigate(
        "/employee"
      );

    } catch (error) {

      console.error(
        "Employee return error:",
        error
      );


      setErrorMessage(
        error.message ||
          "Unable to complete the return logbook."
      );

    } finally {

      setSubmitting(
        false
      );

    }
  }


  /*
   * ============================================
   * LOADING
   * ============================================
   */

  if (
    loading
  ) {
    return (
      <main className="employee-return-page">

        <div className="employee-return-loading">

          <FaCar />

          <h2>
            Loading Active Trip
          </h2>

          <p>
            Preparing your
            post-use digital
            logbook...
          </p>

        </div>

      </main>
    );
  }


  /*
   * ============================================
   * ERROR / UNAVAILABLE
   * ============================================
   */

  if (
    !trip ||
    !vehicle ||
    !employee ||
    errorMessage
  ) {
    return (
      <main className="employee-return-page">

        <div className="employee-return-unavailable">

          <FaExclamationTriangle />

          <h2>
            Return Logbook
            Unavailable
          </h2>

          <p>
            {errorMessage ||
              "This trip could not be loaded."}
          </p>

          <Link
            to="/employee"
            className="employee-return-primary-button"
          >
            Employee Dashboard
          </Link>

        </div>

      </main>
    );
  }


  /*
   * ============================================
   * PAGE
   * ============================================
   */

  return (
    <main className="employee-return-page">


      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="employee-return-header">

        <div className="employee-return-header-inner">

          <div className="employee-return-header-left">

            <Link
              to="/employee"
              className="employee-return-back"
            >
              <FaArrowLeft />
            </Link>


            <AEDCLogo
              compact
            />


            <div className="employee-return-brand">

              <span>
                AEDC VEHICLE SYSTEM
              </span>

              <strong>
                Employee Portal
              </strong>

            </div>

          </div>


          <div className="employee-return-user">

            <FaUser />

            <div>

              <span>
                Driver
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

      <section className="employee-return-hero">

        <div className="employee-return-hero-inner">

          <span>
            POST-USE DIGITAL LOGBOOK
          </span>

          <h1>
            Return{" "}
            {vehicle.make}{" "}
            {vehicle.model}
          </h1>

          <p>
            Complete the mandatory
            vehicle return inspection
            before handing back or
            securing the keys.
          </p>

        </div>

      </section>


      {/* ==========================================
          FORM
      ========================================== */}

      <form
        className="employee-return-form"
        onSubmit={
          handleSubmit
        }
      >


        {/* CURRENT TRIP */}

        <section className="employee-return-card employee-return-trip-card">

          <span className="employee-return-reference">

            {trip.booking_reference ||
              "ACTIVE TRIP"}

          </span>


          <h2>
            Current Trip
          </h2>


          <div className="employee-return-info-grid">

            <div>

              <span>
                Driver
              </span>

              <strong>
                {trip.driver_name}
              </strong>

            </div>


            <div>

              <span>
                Employee Number
              </span>

              <strong>
                {trip.employee_number}
              </strong>

            </div>


            <div>

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
                {trip.destination ||
                  "Not recorded"}
              </strong>

            </div>


            <div>

              <span>
                Purpose
              </span>

              <strong>
                {trip.purpose ||
                  "Not recorded"}
              </strong>

            </div>


            <div>

              <span>
                Starting Odometer
              </span>

              <strong>

                {Number(
                  trip.start_odometer
                ).toLocaleString(
                  "en-ZA"
                )}{" "}
                km

              </strong>

            </div>

          </div>

        </section>


        {/* ======================================
            01 ODOMETER
        ====================================== */}

        <ReturnSection
          number="01"
          title="Odometer & Distance"
          description="Record the vehicle mileage immediately after returning."
        >

          <div className="employee-return-grid two-columns">

            <div className="employee-return-field">

              <label>
                Starting Odometer
              </label>

              <input
                disabled
                value={`${Number(
                  trip.start_odometer
                ).toLocaleString(
                  "en-ZA"
                )} km`}
              />

            </div>


            <div className="employee-return-field">

              <label>
                Ending Odometer
                (km) *
              </label>

              <input
                required
                type="number"
                min={
                  trip.start_odometer
                }
                step="1"
                name="endOdometer"
                value={
                  formData.endOdometer
                }
                onChange={
                  handleChange
                }
              />

            </div>

          </div>


          <div className="employee-return-distance">

            <FaRoad />

            <div>

              <span>
                Distance Travelled
              </span>

              <strong>
                {distance.toLocaleString(
                  "en-ZA"
                )}{" "}
                km
              </strong>

            </div>

          </div>

        </ReturnSection>


        {/* ======================================
            02 FUEL
        ====================================== */}

        <ReturnSection
          number="02"
          title="Fuel & Expenses"
          description="Record the fuel level and any fuel purchased during the trip."
        >

          <div className="employee-return-fuel-summary">

            <FaGasPump />


            <div>

              <span>
                Fuel at Departure
              </span>

              <strong>

                {String(
                  trip.fuel_before ||
                    "Not recorded"
                )
                  .replaceAll(
                    "-",
                    " "
                  )
                  .toUpperCase()}

              </strong>

            </div>


            <div>

              <span>
                Fuel on Return
              </span>

              <strong>

                {formData
                  .fuelAfter
                  .replaceAll(
                    "-",
                    " "
                  )
                  .toUpperCase()}

              </strong>

            </div>

          </div>


          {fuelLowerThanDeparture && (

            <div className="employee-return-warning">

              <FaExclamationTriangle />

              <div>

                <strong>
                  Fuel level is lower
                </strong>

                <p>
                  The vehicle is being
                  returned with less fuel
                  than it had at
                  departure.
                </p>

              </div>

            </div>

          )}


          <div className="employee-return-grid two-columns">


            <div className="employee-return-field">

              <label>
                Fuel Level on
                Return *
              </label>

              <select
                required
                name="fuelAfter"
                value={
                  formData.fuelAfter
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


            <div className="employee-return-field">

              <label>
                Fuel Purchased?
              </label>

              <select
                name="fuelPurchased"
                value={
                  formData
                    .fuelPurchased
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
              .fuelPurchased ===
              "yes" && (
              <>

                <div className="employee-return-field">

                  <label>
                    Fuel Amount (R) *
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    name="fuelAmount"
                    value={
                      formData
                        .fuelAmount
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="0.00"
                  />

                </div>


                <div className="employee-return-field">

                  <label>
                    Receipt
                    Submitted?
                  </label>

                  <select
                    name="fuelReceiptSubmitted"
                    value={
                      formData
                        .fuelReceiptSubmitted
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
                  .fuelReceiptSubmitted ===
                  "yes" && (

                  <div className="employee-return-field employee-return-full">

                    <label>
                      Receipt
                      Reference *
                    </label>

                    <input
                      required
                      type="text"
                      name="fuelReceiptReference"
                      value={
                        formData
                          .fuelReceiptReference
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Receipt number or reference"
                    />

                  </div>

                )}

              </>
            )}

          </div>

        </ReturnSection>


        {/* ======================================
            03 INSPECTION
        ====================================== */}

        <ReturnSection
          number="03"
          title="Post-Use Vehicle Inspection"
          description="Inspect the same vehicle areas checked before departure."
        >

          <div className="employee-return-inspection-grid">

            {inspectionItems.map(
              (item) => (

                <div
                  key={
                    item.key
                  }
                  className="employee-return-inspection-item"
                >

                  <strong>
                    {item.label}
                  </strong>


                  <div className="employee-return-condition-buttons">

                    {[
                      "good",
                      "attention",
                      "damaged",
                    ].map(
                      (
                        condition
                      ) => (

                        <button
                          key={
                            condition
                          }
                          type="button"
                          className={`employee-return-condition-button ${
                            conditionAfter[
                              item.key
                            ] ===
                            condition
                              ? `employee-return-condition-${condition}`
                              : ""
                          }`}
                          onClick={() =>
                            handleConditionChange(
                              item.key,
                              condition
                            )
                          }
                        >

                          {condition ===
                          "good"
                            ? "Good"
                            : condition ===
                              "attention"
                            ? "Attention"
                            : "Damaged"}

                        </button>

                      )
                    )}

                  </div>

                </div>

              )
            )}

          </div>


          {conditionChanges.length >
            0 && (

            <div className="employee-return-warning">

              <FaExclamationTriangle />

              <div>

                <strong>
                  Condition change
                  detected
                </strong>

                <p>

                  {
                    conditionChanges.length
                  }{" "}
                  inspection item
                  {conditionChanges.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  worsened since
                  departure.

                </p>

              </div>

            </div>

          )}

        </ReturnSection>


        {/* ======================================
            04 PHOTOS
        ====================================== */}

        <ReturnSection
          number="04"
          title="Return Photographs"
          description="Upload photographic evidence of the vehicle condition at return."
        >

          <VehicleEvidenceUpload
            vehicleId={
              vehicle.id
            }
            tripId={
              trip.id
            }
            requestId={
              trip.request_id
            }
            stage="post-use"
            type="vehicle-condition"
            title="Post-Use Vehicle Photos"
            description={`Photograph the exterior condition of the ${vehicle.make} ${vehicle.model} after use.`}
          />


          <VehicleEvidenceUpload
            vehicleId={
              vehicle.id
            }
            tripId={
              trip.id
            }
            requestId={
              trip.request_id
            }
            stage="post-use"
            type="odometer"
            title="Ending Odometer Photo"
            description="Photograph the dashboard showing the ending odometer."
            multiple={
              false
            }
          />


          {formData
            .newDamage ===
            "yes" && (

            <VehicleEvidenceUpload
              vehicleId={
                vehicle.id
              }
              tripId={
                trip.id
              }
              requestId={
                trip.request_id
              }
              stage="post-use"
              type="new-damage"
              title="New Damage Photos"
              description="Photograph every area of newly reported damage clearly."
              required
              onUploaded={(
                files
              ) =>
                setDamageEvidenceCount(
                  (
                    current
                  ) =>
                    current +
                    files.length
                )
              }
            />

          )}

        </ReturnSection>


        {/* ======================================
            05 DAMAGE
        ====================================== */}

        <ReturnSection
          number="05"
          title="Damage, Warning Lights & Faults"
          description="Every issue, however minor, must be recorded."
        >

          <div className="employee-return-grid two-columns">


            <div className="employee-return-field">

              <label>
                New Damage?
              </label>

              <select
                name="newDamage"
                value={
                  formData.newDamage
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
              .newDamage ===
              "yes" && (

              <div className="employee-return-field">

                <label>
                  New Damage
                  Description *
                </label>

                <textarea
                  required
                  rows="4"
                  name="newDamageDescription"
                  value={
                    formData
                      .newDamageDescription
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Describe the new damage..."
                />

              </div>

            )}


            <div className="employee-return-field">

              <label>
                Warning Light
                Reported?
              </label>

              <select
                name="warningLightReported"
                value={
                  formData
                    .warningLightReported
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
              .warningLightReported ===
              "yes" && (

              <div className="employee-return-field">

                <label>
                  Warning Light
                  Description *
                </label>

                <textarea
                  required
                  rows="3"
                  name="warningLightDescription"
                  value={
                    formData
                      .warningLightDescription
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Describe the warning light..."
                />

              </div>

            )}


            <div className="employee-return-field">

              <label>
                Mechanical Issue?
              </label>

              <select
                name="mechanicalIssueReported"
                value={
                  formData
                    .mechanicalIssueReported
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
              .mechanicalIssueReported ===
              "yes" && (

              <div className="employee-return-field">

                <label>
                  Mechanical Issue
                  Description *
                </label>

                <textarea
                  required
                  rows="3"
                  name="mechanicalIssueDescription"
                  value={
                    formData
                      .mechanicalIssueDescription
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Describe the mechanical issue..."
                />

              </div>

            )}


            <div className="employee-return-field employee-return-full">

              <label>
                Additional Post-Use
                Notes
              </label>

              <textarea
                rows="4"
                name="postUseNotes"
                value={
                  formData
                    .postUseNotes
                }
                onChange={
                  handleChange
                }
                placeholder="Optional notes about the vehicle or trip..."
              />

            </div>

          </div>

        </ReturnSection>


        {/* ======================================
            06 PARKING
        ====================================== */}

        <ReturnSection
          number="06"
          title="Parking & Security"
          description="Confirm where the vehicle was parked and that it was properly secured."
        >

          <div className="employee-return-grid two-columns">


            <div className="employee-return-field">

              <label>
                Returned to AEDC
                Designated Bay?
              </label>

              <select
                name="returnedToDesignatedBay"
                value={
                  formData
                    .returnedToDesignatedBay
                }
                onChange={
                  handleChange
                }
              >

                <option value="yes">
                  Yes
                </option>

                <option value="no">
                  No
                </option>

              </select>

            </div>


            <div className="employee-return-field">

              <label>
                Parking Location *
              </label>

              <div className="employee-return-input-icon">

                <FaMapMarkerAlt />

                <input
                  required
                  type="text"
                  name="returnParkingLocation"
                  value={
                    formData
                      .returnParkingLocation
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>

            </div>


            {formData
              .returnedToDesignatedBay ===
              "no" && (

              <div className="employee-return-field employee-return-full">

                <label>
                  Reason for
                  Alternative
                  Parking *
                </label>

                <textarea
                  required
                  rows="3"
                  name="alternativeParkingReason"
                  value={
                    formData
                      .alternativeParkingReason
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Explain why the vehicle could not be returned to the designated AEDC bay."
                />

                <small>
                  Admin will review
                  the alternative
                  parking
                  arrangement.
                </small>

              </div>

            )}

          </div>


          <div className="employee-return-checklist">


            <ReturnCheck
              name="vehicleLocked"
              checked={
                formData
                  .vehicleLocked
              }
              onChange={
                handleChange
              }
              text="Vehicle is locked and secured."
            />


            <ReturnCheck
              name="windowsClosed"
              checked={
                formData
                  .windowsClosed
              }
              onChange={
                handleChange
              }
              text="All windows are fully closed."
            />


            <ReturnCheck
              name="personalBelongingsRemoved"
              checked={
                formData
                  .personalBelongingsRemoved
              }
              onChange={
                handleChange
              }
              text="Personal belongings have been removed."
            />


            <ReturnCheck
              name="companyPropertyRemoved"
              checked={
                formData
                  .companyPropertyRemoved
              }
              onChange={
                handleChange
              }
              text="Company property has been removed or properly secured."
            />


          </div>

        </ReturnSection>


        {/* ======================================
            07 KEYS
        ====================================== */}

        <ReturnSection
          number="07"
          title="Key Handover"
          description="Confirm that the vehicle keys have been returned or properly secured."
        >

          <div className="employee-return-key-box">

            <FaKey />

            <div>

              <ReturnCheck
                name="keysReturned"
                checked={
                  formData
                    .keysReturned
                }
                onChange={
                  handleChange
                }
                text="Vehicle keys have been returned or secured."
              />


              <div className="employee-return-field">

                <label>
                  Keys Returned To *
                </label>

                <input
                  required
                  type="text"
                  name="keysReturnedTo"
                  value={
                    formData
                      .keysReturnedTo
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Facilities Manager"
                />

              </div>

            </div>

          </div>

        </ReturnSection>


        {/* ======================================
            08 DECLARATION
        ====================================== */}

        <ReturnSection
          number="08"
          title="Driver Return Declaration"
          description="Confirm that this return record is complete and accurate."
        >

          <div className="employee-return-checklist">


            <ReturnCheck
              name="returnConditionConfirmed"
              checked={
                formData
                  .returnConditionConfirmed
              }
              onChange={
                handleChange
              }
              text="I personally completed the post-use vehicle condition inspection."
            />


            <ReturnCheck
              name="vehicleSecuredConfirmed"
              checked={
                formData
                  .vehicleSecuredConfirmed
              }
              onChange={
                handleChange
              }
              text="I confirm that the vehicle has been parked and secured."
            />


            <ReturnCheck
              name="informationAccuracyConfirmed"
              checked={
                formData
                  .informationAccuracyConfirmed
              }
              onChange={
                handleChange
              }
              text="I confirm that the information in this return record is complete, honest and accurate."
            />


          </div>

        </ReturnSection>


        {/* ======================================
            ACTIONS
        ====================================== */}

        <div className="employee-return-actions">

          <Link
            to="/employee"
            className="employee-return-cancel"
          >
            Cancel
          </Link>


          <button
            type="submit"
            disabled={
              submitting
            }
            className="employee-return-submit"
          >

            <FaCheckCircle />

            {submitting
              ? "Completing Return..."
              : "Complete Return Logbook"}

          </button>

        </div>


      </form>

    </main>
  );
}


function ReturnSection({
  number,
  title,
  description,
  children,
}) {
  return (
    <section className="employee-return-card">

      <div className="employee-return-section-heading">

        <span>
          {number}
        </span>

        <div>

          <h2>
            {title}
          </h2>

          {description && (
            <p>
              {description}
            </p>
          )}

        </div>

      </div>

      {children}

    </section>
  );
}


function ReturnCheck({
  name,
  checked,
  onChange,
  text,
}) {
  return (
    <label className="employee-return-check">

      <input
        type="checkbox"
        name={
          name
        }
        checked={
          checked
        }
        onChange={
          onChange
        }
      />

      <span>
        {text}
      </span>

    </label>
  );
}


export default EmployeeVehicleReturn;