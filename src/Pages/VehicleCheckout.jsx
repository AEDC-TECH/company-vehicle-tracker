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
  FaCar,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaGasPump,
  FaIdCard,
  FaRoad,
  FaShieldAlt,
  FaTachometerAlt,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import VehicleEvidenceUpload from "../Components/VehicleEvidenceUpload";

import "../Styles/EmployeePreInspection.css";
import "../Styles/EmployeePreInspection-photo-requirements.css";
import "../Styles/AdminPreInspection.css";


const inspectionItems = [
  {
    key: "bodywork",
    label: "Exterior Bodywork",
    category: "bodywork",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "tyres",
    label: "Tyres & Wheels",
    category: "tyres",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "windscreen",
    label: "Windscreen & Windows",
    category: "windscreen",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "lights",
    label: "Lights & Indicators",
    category: "lights",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "brakes",
    label: "Brakes",
    category: "brakes",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "steering",
    label: "Steering",
    category: "steering",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "horn",
    label: "Horn",
    category: "electrical",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "seatbelts",
    label: "Seatbelts",
    category: "safety-equipment",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "mirrors",
    label: "Mirrors",
    category: "safety-equipment",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "wipers",
    label: "Wipers & Washers",
    category: "electrical",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "fluidLeaks",
    label: "Fluid Leaks",
    category: "fluids",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "safetyEquipment",
    label: "Safety Equipment",
    category: "safety-equipment",
    attentionSeverity: "major",
    damagedSeverity: "critical",
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


const initialDefectDetails =
  inspectionItems.reduce(
    (result, item) => {
      result[item.key] = "";

      return result;
    },
    {}
  );


function getLogicalEvidenceType(
  item
) {
  const storedType =
    String(
      item?.evidence_type || ""
    )
      .trim()
      .toLowerCase();

  const storagePath =
    String(
      item?.storage_path || ""
    )
      .trim()
      .toLowerCase();

  const directionalTypes = [
    "vehicle-front",
    "vehicle-rear",
    "vehicle-driver-side",
    "vehicle-passenger-side",
  ];

  for (const type of directionalTypes) {
    if (
      storagePath.includes(
        `/${type}/`
      ) ||
      storagePath.includes(
        `/${type}--`
      ) ||
      storagePath.includes(
        `/${type}-`
      )
    ) {
      return type;
    }
  }

  return storedType;
}


function VehicleCheckout() {
  const { requestId } = useParams();

  const navigate = useNavigate();

  const [request, setRequest] =
    useState(null);

  const [vehicle, setVehicle] =
    useState(null);

  const [driver, setDriver] =
    useState(null);

  const [employeeNumber, setEmployeeNumber] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [condition, setCondition] =
    useState(initialCondition);

  const [
    defectDetails,
    setDefectDetails,
  ] = useState(initialDefectDetails);

  const [
    frontPhotoCount,
    setFrontPhotoCount,
  ] = useState(0);

  const [
    rearPhotoCount,
    setRearPhotoCount,
  ] = useState(0);

  const [
    driverSidePhotoCount,
    setDriverSidePhotoCount,
  ] = useState(0);

  const [
    passengerSidePhotoCount,
    setPassengerSidePhotoCount,
  ] = useState(0);

  const [
    odometerEvidenceCount,
    setOdometerEvidenceCount,
  ] = useState(0);

  const [
    damageEvidenceCount,
    setDamageEvidenceCount,
  ] = useState(0);

  const [formData, setFormData] =
    useState({
      adminCompletedBy: "",

      phone: "",

      driverLicenseNumber: "",

      startOdometer: "",

      fuelBefore: "full",

      preExistingDamage: "no",

      preExistingDamageDescription: "",

      preUseNotes: "",

      licenseValidConfirmed: false,

      fitToDriveConfirmed: false,

      authorizedDriverConfirmed: false,

      policyAcknowledgedConfirmed: false,

      inspectionAccuracyConfirmed: false,
    });


  useEffect(() => {
    loadInspection();
  }, [requestId]);


  function normalizeEmployeeNumber(value) {
    return String(value || "")
      .trim()
      .toUpperCase();
  }


  async function loadInspection() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from("vehicle_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (requestError) {
        throw requestError;
      }

      if (requestData.status !== "approved") {
        throw new Error(
          "This vehicle request is no longer approved."
        );
      }

      const normalizedEmployeeNumber =
        normalizeEmployeeNumber(
          requestData.employee_number
        );

      if (!normalizedEmployeeNumber) {
        throw new Error(
          "This approved booking does not contain an employee number."
        );
      }

      setRequest(requestData);
      setEmployeeNumber(
        normalizedEmployeeNumber
      );


      const {
        data: existingTrip,
        error: existingTripError,
      } = await supabase
        .from("vehicle_trips")
        .select("id, status, returned_at")
        .eq("request_id", requestId)
        .maybeSingle();

      if (existingTripError) {
        throw existingTripError;
      }

      if (existingTrip) {
        if (
          existingTrip.status === "in-use" ||
          (
            existingTrip.status === "incident-open" &&
            !existingTrip.returned_at
          )
        ) {
          navigate(
            `/vehicles/return/${existingTrip.id}`,
            { replace: true }
          );

          return;
        }

        if (
          existingTrip.status === "returned" ||
          existingTrip.returned_at
        ) {
          navigate(
            "/history",
            { replace: true }
          );

          return;
        }
      }


      const {
        data: vehicleData,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", requestData.vehicle_id)
        .single();

      if (vehicleError) {
        throw vehicleError;
      }

      if (vehicleData.active === false) {
        throw new Error(
          "The assigned company vehicle is inactive."
        );
      }

      setVehicle(vehicleData);


      const {
        data: driverData,
        error: driverError,
      } = await supabase
        .from("drivers")
        .select("*")
        .eq(
          "employee_number",
          normalizedEmployeeNumber
        )
        .maybeSingle();

      if (driverError) {
        throw driverError;
      }

      setDriver(driverData || null);

      setFormData(
        (previous) => ({
          ...previous,

          phone:
            driverData?.phone ||
            previous.phone,

          driverLicenseNumber:
            driverData
              ?.driver_license_number ||
            previous.driverLicenseNumber,

          startOdometer:
            String(
              vehicleData.current_odometer ||
              0
            ),
        })
      );


      const {
        data: existingEvidence,
        error: evidenceError,
      } = await supabase
        .from("vehicle_evidence")
        .select(
          "id, evidence_type, storage_path"
        )
        .eq("request_id", requestId)
        .eq("evidence_stage", "pre-use");

      if (evidenceError) {
        throw evidenceError;
      }

      const evidence =
        existingEvidence || [];

      setFrontPhotoCount(
        evidence.filter(
          (item) =>
            getLogicalEvidenceType(item) ===
            "vehicle-front"
        ).length
      );

      setRearPhotoCount(
        evidence.filter(
          (item) =>
            getLogicalEvidenceType(item) ===
            "vehicle-rear"
        ).length
      );

      setDriverSidePhotoCount(
        evidence.filter(
          (item) =>
            getLogicalEvidenceType(item) ===
            "vehicle-driver-side"
        ).length
      );

      setPassengerSidePhotoCount(
        evidence.filter(
          (item) =>
            getLogicalEvidenceType(item) ===
            "vehicle-passenger-side"
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
        "Admin pre-inspection load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load this approved booking."
      );
    } finally {
      setLoading(false);
    }
  }


  async function validateDriverBeforeCheckout() {
    const normalizedEmployeeNumber =
      normalizeEmployeeNumber(
        request?.employee_number
      );

    const {
      data: latestDriver,
      error: driverError,
    } = await supabase
      .from("drivers")
      .select("*")
      .eq(
        "employee_number",
        normalizedEmployeeNumber
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

    if (latestDriver.active !== true) {
      throw new Error(
        "Vehicle release blocked: this employee is inactive."
      );
    }

    if (latestDriver.is_driver !== true) {
      throw new Error(
        "Vehicle release blocked: this employee is not registered as a driver."
      );
    }

    if (
      latestDriver.driver_status !==
      "eligible"
    ) {
      throw new Error(
        "Vehicle release blocked: this driver's current status is not eligible."
      );
    }

    if (
      latestDriver.authorized_to_drive !==
      true
    ) {
      throw new Error(
        "Vehicle release blocked: this employee is not authorised to drive an AEDC company vehicle."
      );
    }

    if (
      latestDriver.license_verified !==
      true
    ) {
      throw new Error(
        "Vehicle release blocked: the driver's licence is not verified."
      );
    }

    if (
      latestDriver.policy_acknowledged !==
      true
    ) {
      throw new Error(
        "Vehicle release blocked: the AEDC Company Vehicle Use Policy has not been acknowledged."
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

    if (!latestDriver.driver_licence_expiry) {
      throw new Error(
        "Vehicle release blocked: the driver's licence expiry date is missing."
      );
    }

    const licenceExpiry =
      new Date(
        `${latestDriver.driver_licence_expiry}T23:59:59`
      );

    if (
      Number.isNaN(
        licenceExpiry.getTime()
      ) ||
      licenceExpiry < new Date()
    ) {
      throw new Error(
        "Vehicle release blocked: the driver's licence has expired or is invalid."
      );
    }

    if (latestDriver.pdp_required) {
      if (!latestDriver.pdp_expiry) {
        throw new Error(
          "Vehicle release blocked: a valid PrDP is required for this driver."
        );
      }

      const pdpExpiry =
        new Date(
          `${latestDriver.pdp_expiry}T23:59:59`
        );

      if (
        Number.isNaN(
          pdpExpiry.getTime()
        ) ||
        pdpExpiry < new Date()
      ) {
        throw new Error(
          "Vehicle release blocked: the driver's PrDP has expired or is invalid."
        );
      }
    }

    const enteredLicense =
      formData.driverLicenseNumber
        .trim()
        .toUpperCase();

    const registeredLicense =
      String(
        latestDriver.driver_license_number ||
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

    return latestDriver;
  }


  function handleChange(event) {
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

    if (value === "good") {
      setDefectDetails(
        (previous) => ({
          ...previous,
          [key]: "",
        })
      );
    }
  }


  function handleDefectDescriptionChange(
    key,
    value
  ) {
    setDefectDetails(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );
  }


  function getConditionSeverity(
    item,
    value
  ) {
    if (value === "attention") {
      return item.attentionSeverity;
    }

    if (value === "damaged") {
      return item.damagedSeverity;
    }

    return null;
  }


  function buildInspectionDefects() {
    return inspectionItems
      .filter(
        (item) =>
          condition[item.key] !==
          "good"
      )
      .map((item) => {
        const value =
          condition[item.key];

        const severity =
          getConditionSeverity(
            item,
            value
          );

        return {
          category:
            item.category,

          severity,

          title:
            `${item.label} ${
              value === "damaged"
                ? "defect"
                : "requires attention"
            }`,

          description:
            defectDetails[
              item.key
            ].trim(),

          vehicle_grounded:
            severity ===
            "critical",
        };
      });
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


  function formatVehicleName() {
    if (!vehicle) {
      return "Company Vehicle";
    }

    return [
      vehicle.make,
      vehicle.model,
    ]
      .filter(Boolean)
      .join(" ");
  }


  async function handleSubmit(event) {
    event.preventDefault();

    if (
      submitting ||
      !vehicle ||
      !request
    ) {
      return;
    }

    setErrorMessage("");

    const completedBy =
      formData.adminCompletedBy.trim();

    if (!completedBy) {
      setErrorMessage(
        "Enter the Facilities Manager or Admin name completing this inspection on behalf of the employee."
      );

      return;
    }

    if (
      vehicle.status !==
      "available"
    ) {
      setErrorMessage(
        "The vehicle is currently not available."
      );

      return;
    }

    if (!vehicle.roadworthy) {
      setErrorMessage(
        "The vehicle is marked as not roadworthy and cannot be used."
      );

      return;
    }

    const startOdometer =
      Number(
        formData.startOdometer
      );

    if (
      !Number.isInteger(
        startOdometer
      ) ||
      startOdometer < 0
    ) {
      setErrorMessage(
        "Enter a valid whole-number starting odometer reading."
      );

      return;
    }

    if (
      startOdometer <
      Number(
        vehicle.current_odometer ||
        0
      )
    ) {
      setErrorMessage(
        `Starting odometer cannot be below ${Number(
          vehicle.current_odometer ||
          0
        ).toLocaleString(
          "en-ZA"
        )} km.`
      );

      return;
    }

    if (
      !formData.driverLicenseNumber.trim()
    ) {
      setErrorMessage(
        "Enter the driver's licence number."
      );

      return;
    }

    const inspectionDefects =
      buildInspectionDefects();

    const missingDefectDescription =
      inspectionItems.find(
        (item) =>
          condition[item.key] !==
            "good" &&
          !defectDetails[
            item.key
          ].trim()
      );

    if (missingDefectDescription) {
      setErrorMessage(
        `Describe the issue found under ${missingDefectDescription.label}.`
      );

      return;
    }

    const missingExteriorPhotos = [];

    if (frontPhotoCount === 0) {
      missingExteriorPhotos.push(
        "front"
      );
    }

    if (rearPhotoCount === 0) {
      missingExteriorPhotos.push(
        "rear"
      );
    }

    if (driverSidePhotoCount === 0) {
      missingExteriorPhotos.push(
        "driver side"
      );
    }

    if (passengerSidePhotoCount === 0) {
      missingExteriorPhotos.push(
        "passenger side"
      );
    }

    if (
      missingExteriorPhotos.length >
      0
    ) {
      setErrorMessage(
        `Upload all 4 required exterior vehicle photos before releasing the vehicle. Missing: ${missingExteriorPhotos.join(
          ", "
        )}.`
      );

      return;
    }

    if (
      odometerEvidenceCount === 0
    ) {
      setErrorMessage(
        "Upload the required starting odometer photo before releasing the vehicle."
      );

      return;
    }

    if (
      formData.preExistingDamage ===
        "yes" &&
      !formData.preExistingDamageDescription.trim()
    ) {
      setErrorMessage(
        "Describe all pre-existing damage before releasing the vehicle."
      );

      return;
    }

    if (
      formData.preExistingDamage ===
        "yes" &&
      damageEvidenceCount === 0
    ) {
      setErrorMessage(
        "Upload at least one clear photograph of the pre-existing damage."
      );

      return;
    }

    const declarationsComplete =
      formData.licenseValidConfirmed &&
      formData.fitToDriveConfirmed &&
      formData.authorizedDriverConfirmed &&
      formData.policyAcknowledgedConfirmed &&
      formData.inspectionAccuracyConfirmed;

    if (!declarationsComplete) {
      setErrorMessage(
        "All on-behalf declarations must be confirmed before vehicle release."
      );

      return;
    }

    try {
      setSubmitting(true);

      const {
        data: latestRequest,
        error: latestRequestError,
      } = await supabase
        .from("vehicle_requests")
        .select("*")
        .eq("id", request.id)
        .single();

      if (latestRequestError) {
        throw latestRequestError;
      }

      if (
        latestRequest.status !==
        "approved"
      ) {
        throw new Error(
          "This booking is no longer approved."
        );
      }

      if (
        normalizeEmployeeNumber(
          latestRequest.employee_number
        ) !== employeeNumber
      ) {
        throw new Error(
          "The employee number on this booking changed. Reload the page before continuing."
        );
      }

      const {
        data: existingTrip,
        error: existingTripError,
      } = await supabase
        .from("vehicle_trips")
        .select("id, status")
        .eq("request_id", request.id)
        .maybeSingle();

      if (existingTripError) {
        throw existingTripError;
      }

      if (existingTrip) {
        throw new Error(
          "A vehicle trip has already been created for this booking."
        );
      }

      const {
        data: latestVehicle,
        error: latestVehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicle.id)
        .single();

      if (latestVehicleError) {
        throw latestVehicleError;
      }

      if (!latestVehicle.active) {
        throw new Error(
          "This vehicle is no longer active."
        );
      }

      if (!latestVehicle.roadworthy) {
        throw new Error(
          "This vehicle is no longer marked as roadworthy."
        );
      }

      if (
        latestVehicle.status !==
        "available"
      ) {
        throw new Error(
          "The vehicle has already been taken or is no longer available."
        );
      }

      await validateDriverBeforeCheckout();

      const {
        data: inspectionResult,
        error: inspectionError,
      } = await supabase.rpc(
        "admin_submit_fleet_pretrip_inspection",
        {
          p_request_id:
            request.id,

          p_employee_number:
            employeeNumber,

          p_odometer:
            startOdometer,

          p_fuel_level:
            formData.fuelBefore,

          p_checklist:
            condition,

          p_damage_reported:
            formData.preExistingDamage ===
            "yes",

          p_notes:
            formData.preUseNotes.trim() ||
            null,

          p_defects:
            inspectionDefects,
        }
      );

      if (inspectionError) {
        throw inspectionError;
      }

      if (
        inspectionResult?.can_start_trip ===
        false
      ) {
        window.alert(
          `Critical vehicle defect recorded.\n\n${inspectionResult.critical_defect_count || 1} critical defect${
            Number(
              inspectionResult.critical_defect_count ||
              1
            ) === 1
              ? ""
              : "s"
          } found.\n\nThe trip has NOT been started and the vehicle has been blocked from use pending Fleet Admin review.`
        );

        navigate(
          `/requests/${request.id}`,
          { replace: true }
        );

        return;
      }

      const {
        error: checkoutError,
      } = await supabase.rpc(
        "admin_complete_vehicle_preinspection",
        {
          p_request_id:
            request.id,

          p_admin_completed_by:
            completedBy,

          p_phone:
            formData.phone.trim() ||
            null,

          p_driver_license_number:
            formData.driverLicenseNumber.trim(),

          p_license_valid_confirmed:
            formData.licenseValidConfirmed,

          p_fit_to_drive_confirmed:
            formData.fitToDriveConfirmed,

          p_authorized_driver_confirmed:
            formData.authorizedDriverConfirmed,

          p_policy_acknowledged_confirmed:
            formData.policyAcknowledgedConfirmed,

          p_start_odometer:
            startOdometer,

          p_fuel_before:
            formData.fuelBefore,

          p_condition_before:
            condition,

          p_pre_existing_damage:
            formData.preExistingDamage ===
            "yes",

          p_pre_existing_damage_description:
            formData.preExistingDamageDescription.trim() ||
            null,

          p_pre_use_notes:
            formData.preUseNotes.trim() ||
            null,

          p_information_accuracy_confirmed:
            formData.inspectionAccuracyConfirmed,
        }
      );

      if (checkoutError) {
        throw checkoutError;
      }

      window.alert(
        `Pre-use inspection completed successfully.\n\nBooking: ${request.booking_reference}\nVehicle: ${formatVehicleName()}\nDriver: ${request.requested_driver_name}\nCompleted by: ${completedBy}\n\nThe vehicle is now recorded as IN USE.`
      );

      navigate(
        "/",
        { replace: true }
      );
    } catch (error) {
      console.error(
        "Admin pre-inspection error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to complete the pre-use inspection."
      );
    } finally {
      setSubmitting(false);
    }
  }


  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <main className="employee-preinspection-page">
        <div className="employee-preinspection-loading">
          <FaCar />

          <h2>
            Loading Approved Booking
          </h2>

          <p>
            Preparing your pre-use vehicle
            inspection...
          </p>
        </div>
      </main>
    );
  }


  /*
   * =====================================================
   * ERROR
   * =====================================================
   */

  if (
    !request ||
    !vehicle ||
    errorMessage
  ) {
    return (
      <main className="employee-preinspection-page">
        <div className="employee-preinspection-loading">
          <FaExclamationTriangle />

          <h2>
            Pre-Use Inspection Unavailable
          </h2>

          <p>
            {errorMessage ||
              "Unable to load this booking."}
          </p>

          <Link
            to="/requests"
            className="employee-preinspection-error-link"
          >
            Vehicle Requests
          </Link>
        </div>
      </main>
    );
  }


  return (
    <main className="employee-preinspection-page">
      {/* ================================================
          HERO
      ================================================ */}

      <section className="employee-preinspection-hero">
        <div className="employee-preinspection-hero-inner">
          <span>
            PRE-USE DIGITAL LOGBOOK
          </span>

          <h2>
            Inspect Before Vehicle Release
          </h2>

          <p>
            Complete the same mandatory pre-use vehicle
            inspection before the company vehicle
            is released to the employee.
          </p>
        </div>
      </section>


      <form
        className="employee-preinspection-form"
        onSubmit={handleSubmit}
      >
        {/* ==============================================
            ERROR
        ============================================== */}

        {errorMessage && (
          <div className="employee-preinspection-message employee-preinspection-message-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}


        {/* ==============================================
            APPROVED BOOKING
        ============================================== */}

        <section className="employee-preinspection-card employee-preinspection-booking">
          <div className="employee-preinspection-booking-top">
            <div>
              <span>
                APPROVED BOOKING
              </span>

              <h2>
                {request.booking_reference}
              </h2>
            </div>

            <div className="employee-preinspection-approved">
              <FaCheckCircle />
              Approved
            </div>
          </div>

          <div className="employee-preinspection-booking-grid">
            <div>
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
                {request.employee_number}
              </strong>
            </div>

            <div>
              <span>
                Vehicle
              </span>

              <strong>
                {formatVehicleName()}
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
                Department
              </span>

              <strong>
                {request.department ||
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
                Expected Return
              </span>

              <strong>
                {formatDate(
                  request.requested_return_at
                )}
              </strong>
            </div>
          </div>

          <div className="employee-preinspection-purpose">
            <span>
              Business Purpose
            </span>

            <p>
              {request.purpose}
            </p>
          </div>
        </section>


        {/* ==============================================
            ADMIN COMPLETION RECORD
        ============================================== */}

        <section className="employee-preinspection-card admin-preinspection-audit-card">
          <div className="admin-preinspection-audit-heading">
            <div className="admin-preinspection-audit-icon">
              <FaShieldAlt />
            </div>

            <div>
              <span>
                ADMIN ON-BEHALF ENTRY
              </span>

              <h2>
                Admin Completion Record
              </h2>

              <p>
                Record the Facilities Manager or
                Admin who is completing the same
                pre-use inspection on behalf of
                the intended driver.
              </p>
            </div>
          </div>

          <div className="admin-preinspection-audit-note">
            <FaShieldAlt />

            <div>
              <strong>
                Audit trail required
              </strong>

              <p>
                The resulting trip record will
                state that this inspection was
                completed by Admin on behalf of
                the employee. All safety checks,
                evidence and defect rules remain
                identical to the Employee Portal.
              </p>
            </div>
          </div>

          <div className="employee-preinspection-field">
            <label>
              Facilities Manager / Admin Name *
            </label>

            <input
              required
              type="text"
              name="adminCompletedBy"
              value={
                formData.adminCompletedBy
              }
              onChange={handleChange}
              placeholder="Full name of person completing this inspection"
            />
          </div>
        </section>


        {/* ==============================================
            01 DRIVER VERIFICATION
        ============================================== */}

        <section className="employee-preinspection-card">
          <div className="employee-preinspection-heading">
            <div className="employee-preinspection-number">
              01
            </div>

            <div>
              <h2>
                Driver Verification
              </h2>

              <p>
                Verify the intended driver against
                the approved booking and the AEDC
                Employee Register.
              </p>
            </div>
          </div>

          {driver ? (
            <div className="admin-preinspection-driver-status success">
              <FaCheckCircle />

              <div>
                <strong>
                  Employee Record Found
                </strong>

                <span>
                  {driver.full_name} is registered under
                  employee number {driver.employee_number}.
                </span>
              </div>
            </div>
          ) : (
            <div className="admin-preinspection-driver-status error">
              <FaExclamationTriangle />

              <div>
                <strong>
                  Employee Record Missing
                </strong>

                <span>
                  Vehicle release will be blocked until
                  this employee exists in Employee Management.
                </span>
              </div>
            </div>
          )}


          <div className="employee-preinspection-grid">
            <div className="employee-preinspection-field">
              <label>
                Driver Full Name
              </label>

              <div className="employee-preinspection-readonly">
                <FaUser />

                <input
                  type="text"
                  disabled
                  value={
                    request.requested_driver_name ||
                    ""
                  }
                />
              </div>
            </div>

            <div className="employee-preinspection-field">
              <label>
                Employee / Contractor Number
              </label>

              <div className="employee-preinspection-readonly">
                <FaIdCard />

                <input
                  type="text"
                  disabled
                  value={
                    request.employee_number ||
                    ""
                  }
                />
              </div>
            </div>

            <div className="employee-preinspection-field">
              <label>
                Driver Licence Number *
              </label>

              <input
                required
                type="text"
                name="driverLicenseNumber"
                value={
                  formData.driverLicenseNumber
                }
                onChange={handleChange}
                placeholder="Driver licence number"
              />
            </div>

            <div className="employee-preinspection-field">
              <label>
                Contact Number
              </label>

              <input
                type="tel"
                name="phone"
                value={
                  formData.phone
                }
                onChange={handleChange}
                placeholder="Contact number"
              />
            </div>
          </div>
        </section>


        {/* ==============================================
            02 ODOMETER & FUEL
        ============================================== */}

        <section className="employee-preinspection-card">
          <div className="employee-preinspection-heading">
            <div className="employee-preinspection-number">
              02
            </div>

            <div>
              <h2>
                Odometer & Fuel
              </h2>

              <p>
                Record the readings immediately
                before departure.
              </p>
            </div>
          </div>

          <div className="employee-preinspection-grid">
            <div className="employee-preinspection-field">
              <label>
                <FaTachometerAlt />
                Starting Odometer (km) *
              </label>

              <input
                required
                type="number"
                min={
                  vehicle.current_odometer ||
                  0
                }
                name="startOdometer"
                value={
                  formData.startOdometer
                }
                onChange={handleChange}
              />

              <small>
                Current recorded odometer:{" "}
                {Number(
                  vehicle.current_odometer ||
                    0
                ).toLocaleString(
                  "en-ZA"
                )}{" "}
                km
              </small>
            </div>

            <div className="employee-preinspection-field">
              <label>
                <FaGasPump />
                Fuel Level *
              </label>

              <select
                required
                name="fuelBefore"
                value={
                  formData.fuelBefore
                }
                onChange={handleChange}
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


        {/* ==============================================
            03 INSPECTION
        ============================================== */}

        <section className="employee-preinspection-card">
          <div className="employee-preinspection-heading">
            <div className="employee-preinspection-number">
              03
            </div>

            <div>
              <h2>
                Pre-Trip Safety Inspection
              </h2>

              <p>
                Check every item before
                driving. Any item marked
                Attention or Defect must be
                described.
              </p>
            </div>
          </div>

          <div className="employee-preinspection-logistics-summary">
            <div>
              <span>
                Checklist
              </span>

              <strong>
                {
                  inspectionItems.length
                }{" "}
                items
              </strong>
            </div>

            <div>
              <span>
                Issues Found
              </span>

              <strong>
                {
                  inspectionItems.filter(
                    (item) =>
                      condition[
                        item.key
                      ] !== "good"
                  ).length
                }
              </strong>
            </div>

            <div
              className={
                inspectionItems.some(
                  (item) =>
                    getConditionSeverity(
                      item,
                      condition[
                        item.key
                      ]
                    ) === "critical"
                )
                  ? "employee-preinspection-summary-critical"
                  : ""
              }
            >
              <span>
                Critical
              </span>

              <strong>
                {
                  inspectionItems.filter(
                    (item) =>
                      getConditionSeverity(
                        item,
                        condition[
                          item.key
                        ]
                      ) ===
                      "critical"
                  ).length
                }
              </strong>
            </div>
          </div>

          <div className="employee-preinspection-inspection-grid employee-preinspection-logistics-grid">
            {inspectionItems.map(
              (item) => {
                const selected =
                  condition[
                    item.key
                  ];

                const severity =
                  getConditionSeverity(
                    item,
                    selected
                  );

                return (
                  <article
                    key={item.key}
                    className={`employee-preinspection-inspection-item employee-preinspection-logistics-item ${
                      selected !==
                      "good"
                        ? "employee-preinspection-item-has-defect"
                        : ""
                    }`}
                  >
                    <div className="employee-preinspection-item-heading">
                      <FaCar />

                      <div>
                        <strong>
                          {
                            item.label
                          }
                        </strong>

                        <span>
                          {selected ===
                          "good"
                            ? "No issue identified"
                            : severity ===
                              "critical"
                            ? "Critical — trip will be blocked"
                            : `${severity} defect`}
                        </span>
                      </div>
                    </div>

                    <div className="employee-preinspection-condition-buttons">
                      <button
                        type="button"
                        className={
                          selected ===
                          "good"
                            ? "employee-condition-button employee-condition-good"
                            : "employee-condition-button"
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
                          selected ===
                          "attention"
                            ? "employee-condition-button employee-condition-attention"
                            : "employee-condition-button"
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
                          selected ===
                          "damaged"
                            ? "employee-condition-button employee-condition-damaged"
                            : "employee-condition-button"
                        }
                        onClick={() =>
                          handleConditionChange(
                            item.key,
                            "damaged"
                          )
                        }
                      >
                        Defect
                      </button>
                    </div>

                    {selected !==
                      "good" && (
                      <div className="employee-preinspection-defect-detail">
                        <div className="employee-preinspection-defect-meta">
                          <span>
                            Severity
                          </span>

                          <strong
                            className={`employee-preinspection-severity employee-preinspection-severity-${severity}`}
                          >
                            {
                              severity
                            }
                          </strong>
                        </div>

                        <label>
                          Describe the issue *

                          <textarea
                            value={
                              defectDetails[
                                item.key
                              ]
                            }
                            onChange={(
                              event
                            ) =>
                              handleDefectDescriptionChange(
                                item.key,
                                event
                                  .target
                                  .value
                              )
                            }
                            rows="3"
                            placeholder={`Describe the ${item.label.toLowerCase()} issue clearly...`}
                            required
                          />
                        </label>

                        {severity ===
                          "critical" && (
                          <div className="employee-preinspection-critical-warning">
                            <FaExclamationTriangle />

                            <span>
                              This defect is
                              classified as
                              critical. The
                              vehicle will not
                              be released for
                              this trip.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>

          {inspectionItems.some(
            (item) =>
              getConditionSeverity(
                item,
                condition[
                  item.key
                ]
              ) === "critical"
          ) && (
            <div className="employee-preinspection-trip-blocked">
              <FaShieldAlt />

              <div>
                <strong>
                  Trip will be blocked
                </strong>

                <p>
                  One or more critical
                  defects have been
                  identified. Submit the
                  inspection to record the
                  defects and remove the
                  vehicle from operational
                  availability.
                </p>
              </div>
            </div>
          )}
        </section>


        {/* ==============================================
            04 EXISTING DAMAGE
        ============================================== */}

        <section className="employee-preinspection-card">
          <div className="employee-preinspection-heading">
            <div className="employee-preinspection-number">
              04
            </div>

            <div>
              <h2>
                Pre-Existing Damage
              </h2>

              <p>
                Record every scratch, dent,
                crack or other defect already
                present.
              </p>
            </div>
          </div>

          <div className="employee-preinspection-field">
            <label>
              Is there any pre-existing damage? *
            </label>

            <select
              name="preExistingDamage"
              value={
                formData.preExistingDamage
              }
              onChange={handleChange}
            >
              <option value="no">
                No
              </option>

              <option value="yes">
                Yes
              </option>
            </select>
          </div>

          {formData.preExistingDamage ===
            "yes" && (
            <div className="employee-preinspection-field employee-preinspection-spacing">
              <label>
                Damage Description *
              </label>

              <textarea
                required
                rows="4"
                name="preExistingDamageDescription"
                value={
                  formData.preExistingDamageDescription
                }
                onChange={handleChange}
                placeholder="Describe every existing scratch, dent, crack or other issue..."
              />
            </div>
          )}

          <div className="employee-preinspection-field employee-preinspection-spacing">
            <label>
              Additional Pre-Use Notes
            </label>

            <textarea
              rows="3"
              name="preUseNotes"
              value={
                formData.preUseNotes
              }
              onChange={handleChange}
              placeholder="Any additional observations..."
            />
          </div>
        </section>


        {/* ==============================================
            05 PHOTOGRAPHS
        ============================================== */}

        <section className="employee-preinspection-card">
          <div className="employee-preinspection-heading">
            <div className="employee-preinspection-number">
              05
            </div>

            <div>
              <h2>
                Mandatory Vehicle Photos
              </h2>

              <p>
                Take four clear exterior photos
                before departure. The trip cannot
                start until all four sides are
                uploaded.
              </p>
            </div>
          </div>


          <div className="employee-preinspection-photo-rule">
            <FaExclamationTriangle />

            <div>
              <strong>
                Photo Quality Rules
              </strong>

              <p>
                Stand far enough away to show the
                complete side of the vehicle. Keep
                the full vehicle inside the frame,
                use good lighting, avoid blurry
                images, and make sure the
                registration plate is visible in
                the front and rear photos where
                possible.
              </p>
            </div>
          </div>


          <div className="employee-preinspection-photo-guide">
            <article
              className={
                frontPhotoCount > 0
                  ? "employee-preinspection-photo-guide-card complete"
                  : "employee-preinspection-photo-guide-card"
              }
            >
              <span className="employee-preinspection-photo-step">
                1 / 4
              </span>

              <div className="employee-preinspection-photo-icon">
                FRONT
              </div>

              <h3>
                Front of Vehicle
              </h3>

              <p>
                Stand directly in front of the
                vehicle. Capture the full front,
                both headlights, bumper,
                windscreen and registration plate.
              </p>

              <strong>
                {frontPhotoCount > 0
                  ? "✓ Uploaded"
                  : "Required"}
              </strong>
            </article>


            <article
              className={
                rearPhotoCount > 0
                  ? "employee-preinspection-photo-guide-card complete"
                  : "employee-preinspection-photo-guide-card"
              }
            >
              <span className="employee-preinspection-photo-step">
                2 / 4
              </span>

              <div className="employee-preinspection-photo-icon">
                REAR
              </div>

              <h3>
                Rear of Vehicle
              </h3>

              <p>
                Stand directly behind the vehicle.
                Capture the full rear, tail lights,
                rear window, bumper and
                registration plate.
              </p>

              <strong>
                {rearPhotoCount > 0
                  ? "✓ Uploaded"
                  : "Required"}
              </strong>
            </article>


            <article
              className={
                driverSidePhotoCount > 0
                  ? "employee-preinspection-photo-guide-card complete"
                  : "employee-preinspection-photo-guide-card"
              }
            >
              <span className="employee-preinspection-photo-step">
                3 / 4
              </span>

              <div className="employee-preinspection-photo-icon">
                DRIVER
              </div>

              <h3>
                Driver Side
              </h3>

              <p>
                Stand square to the driver's side.
                Capture the entire side from front
                wheel to rear wheel, including
                doors, mirrors and body panels.
              </p>

              <strong>
                {driverSidePhotoCount > 0
                  ? "✓ Uploaded"
                  : "Required"}
              </strong>
            </article>


            <article
              className={
                passengerSidePhotoCount > 0
                  ? "employee-preinspection-photo-guide-card complete"
                  : "employee-preinspection-photo-guide-card"
              }
            >
              <span className="employee-preinspection-photo-step">
                4 / 4
              </span>

              <div className="employee-preinspection-photo-icon">
                PASSENGER
              </div>

              <h3>
                Passenger Side
              </h3>

              <p>
                Stand square to the passenger side.
                Capture the entire side from front
                wheel to rear wheel, including
                doors, mirrors and body panels.
              </p>

              <strong>
                {passengerSidePhotoCount > 0
                  ? "✓ Uploaded"
                  : "Required"}
              </strong>
            </article>
          </div>


          <div className="employee-preinspection-photo-uploads">
            <div className="employee-preinspection-photo-upload-slot">
              <div className="employee-preinspection-photo-upload-heading">
                <span>
                  PHOTO 1 OF 4
                </span>

                <strong>
                  Front View
                </strong>

                <small>
                  Full front of the vehicle,
                  straight-on, clear and well lit.
                </small>
              </div>

              <VehicleEvidenceUpload
                vehicleId={
                  vehicle.id
                }
                requestId={
                  request.id
                }
                stage="pre-use"
                type="vehicle-front"
                title="Upload Front Photo"
                description="Take one clear photo showing the complete front of the vehicle."
                required
                multiple={false}
                imagesOnly
              expectedVehicle={
                vehicle
              }
              preferCamera
                onUploaded={
                  (files) =>
                    setFrontPhotoCount(
                      (current) =>
                        current +
                        files.length
                    )
                }
              />
            </div>


            <div className="employee-preinspection-photo-upload-slot">
              <div className="employee-preinspection-photo-upload-heading">
                <span>
                  PHOTO 2 OF 4
                </span>

                <strong>
                  Rear View
                </strong>

                <small>
                  Full rear of the vehicle,
                  straight-on, clear and well lit.
                </small>
              </div>

              <VehicleEvidenceUpload
                vehicleId={
                  vehicle.id
                }
                requestId={
                  request.id
                }
                stage="pre-use"
                type="vehicle-rear"
                title="Upload Rear Photo"
                description="Take one clear photo showing the complete rear of the vehicle."
                required
                multiple={false}
                imagesOnly
              expectedVehicle={
                vehicle
              }
              preferCamera
                onUploaded={
                  (files) =>
                    setRearPhotoCount(
                      (current) =>
                        current +
                        files.length
                    )
                }
              />
            </div>


            <div className="employee-preinspection-photo-upload-slot">
              <div className="employee-preinspection-photo-upload-heading">
                <span>
                  PHOTO 3 OF 4
                </span>

                <strong>
                  Driver-Side View
                </strong>

                <small>
                  Entire driver's side from front
                  wheel to rear wheel.
                </small>
              </div>

              <VehicleEvidenceUpload
                vehicleId={
                  vehicle.id
                }
                requestId={
                  request.id
                }
                stage="pre-use"
                type="vehicle-driver-side"
                title="Upload Driver-Side Photo"
                description="Take one clear photo showing the full driver's side of the vehicle."
                required
                multiple={false}
                imagesOnly
              expectedVehicle={
                vehicle
              }
              preferCamera
                onUploaded={
                  (files) =>
                    setDriverSidePhotoCount(
                      (current) =>
                        current +
                        files.length
                    )
                }
              />
            </div>


            <div className="employee-preinspection-photo-upload-slot">
              <div className="employee-preinspection-photo-upload-heading">
                <span>
                  PHOTO 4 OF 4
                </span>

                <strong>
                  Passenger-Side View
                </strong>

                <small>
                  Entire passenger side from front
                  wheel to rear wheel.
                </small>
              </div>

              <VehicleEvidenceUpload
                vehicleId={
                  vehicle.id
                }
                requestId={
                  request.id
                }
                stage="pre-use"
                type="vehicle-passenger-side"
                title="Upload Passenger-Side Photo"
                description="Take one clear photo showing the full passenger side of the vehicle."
                required
                multiple={false}
                imagesOnly
              expectedVehicle={
                vehicle
              }
              preferCamera
                onUploaded={
                  (files) =>
                    setPassengerSidePhotoCount(
                      (current) =>
                        current +
                        files.length
                    )
                }
              />
            </div>
          </div>


          <div className="employee-preinspection-four-photo-status">
            <div
              className={
                frontPhotoCount > 0
                  ? "complete"
                  : ""
              }
            >
              <span>
                Front
              </span>

              <strong>
                {frontPhotoCount > 0
                  ? "✓"
                  : "Missing"}
              </strong>
            </div>

            <div
              className={
                rearPhotoCount > 0
                  ? "complete"
                  : ""
              }
            >
              <span>
                Rear
              </span>

              <strong>
                {rearPhotoCount > 0
                  ? "✓"
                  : "Missing"}
              </strong>
            </div>

            <div
              className={
                driverSidePhotoCount > 0
                  ? "complete"
                  : ""
              }
            >
              <span>
                Driver Side
              </span>

              <strong>
                {driverSidePhotoCount > 0
                  ? "✓"
                  : "Missing"}
              </strong>
            </div>

            <div
              className={
                passengerSidePhotoCount > 0
                  ? "complete"
                  : ""
              }
            >
              <span>
                Passenger Side
              </span>

              <strong>
                {passengerSidePhotoCount > 0
                  ? "✓"
                  : "Missing"}
              </strong>
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
            type="odometer"
            title="Starting Odometer Photo"
            description="Photograph the dashboard clearly showing the starting odometer reading."
            required
            multiple={false}
            imagesOnly
              expectedVehicle={
                vehicle
              }
              expectedOdometer={
                formData.startOdometer
              }
              preferCamera
            onUploaded={
              (files) =>
                setOdometerEvidenceCount(
                  (current) =>
                    current +
                    files.length
                )
            }
          />


          {formData.preExistingDamage ===
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
              description="Upload close-up photographs of every scratch, dent, crack or other damage already present."
              required
              imagesOnly
              onUploaded={
                (files) =>
                  setDamageEvidenceCount(
                    (current) =>
                      current +
                      files.length
                  )
              }
            />
          )}


          <div className="employee-preinspection-evidence-summary">
            <div>
              <span>
                Required Exterior Photos
              </span>

              <strong>
                {
                  [
                    frontPhotoCount,
                    rearPhotoCount,
                    driverSidePhotoCount,
                    passengerSidePhotoCount,
                  ].filter(
                    (count) =>
                      count > 0
                  ).length
                }
                /4
              </strong>
            </div>

            <div>
              <span>
                Required Odometer Photo
              </span>

              <strong>
                {odometerEvidenceCount > 0
                  ? "✓"
                  : "Missing"}
              </strong>
            </div>

            {formData.preExistingDamage ===
              "yes" && (
              <div>
                <span>
                  Damage Photos
                </span>

                <strong>
                  {damageEvidenceCount}
                </strong>
              </div>
            )}
          </div>
        </section>


        {/* ==============================================
            06 DECLARATIONS
        ============================================== */}

        <section className="employee-preinspection-card">
          <div className="employee-preinspection-heading">
            <div className="employee-preinspection-number">
              06
            </div>

            <div>
              <h2>
                On-Behalf Driver Declaration
              </h2>

              <p>
                Every declaration must be confirmed
                by the Admin completing this inspection
                before vehicle release.
              </p>
            </div>
          </div>

          <div className="employee-preinspection-policy-note">
            <FaShieldAlt />

            <div>
              <strong>
                Driver Responsibility
              </strong>

              <p>
                The same safety standard applies to Admin and Employee inspections. The Admin completing this form is recorded in the trip audit trail as acting on behalf of the intended driver.
              </p>
            </div>
          </div>

          <div className="employee-preinspection-declarations">
            <label>
              <input
                type="checkbox"
                name="licenseValidConfirmed"
                checked={
                  formData.licenseValidConfirmed
                }
                onChange={handleChange}
              />

              <span>
                I confirm that the intended driver holds a current valid driver's licence appropriate for this vehicle.
              </span>
            </label>

            <label>
              <input
                type="checkbox"
                name="authorizedDriverConfirmed"
                checked={
                  formData.authorizedDriverConfirmed
                }
                onChange={handleChange}
              />

              <span>
                I confirm that the intended driver is authorized to drive the AEDC company vehicle.
              </span>
            </label>

            <label>
              <input
                type="checkbox"
                name="fitToDriveConfirmed"
                checked={
                  formData.fitToDriveConfirmed
                }
                onChange={handleChange}
              />

              <span>
                I confirm that the intended driver is fit to drive and is not impaired by alcohol, drugs, medication, fatigue or illness.
              </span>
            </label>

            <label>
              <input
                type="checkbox"
                name="policyAcknowledgedConfirmed"
                checked={
                  formData.policyAcknowledgedConfirmed
                }
                onChange={handleChange}
              />

              <span>
                I confirm that the intended driver has acknowledged the AEDC Company Vehicle Use Policy.
              </span>
            </label>

            <label>
              <input
                type="checkbox"
                name="inspectionAccuracyConfirmed"
                checked={
                  formData.inspectionAccuracyConfirmed
                }
                onChange={handleChange}
              />

              <span>
                I confirm that I completed this pre-use inspection on behalf of the intended driver and that the information recorded is complete and accurate.
              </span>
            </label>
          </div>
        </section>


        {/* ==============================================
            FINAL WARNING
        ============================================== */}

        <section className="employee-preinspection-final-warning">
          <FaRoad />

          <div>
            <strong>
              Before Releasing the Vehicle
            </strong>

            <p>
              Submit this logbook only after the vehicle has been physically inspected. A safe inspection will start the trip. Critical defects are recorded and will block vehicle release.
            </p>
          </div>
        </section>


        {/* ==============================================
            ACTIONS
        ============================================== */}

        <div className="employee-preinspection-actions">
          <Link
            to={`/requests/${request.id}`}
            className="employee-preinspection-cancel"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              submitting
            }
            className="employee-preinspection-submit"
          >
            <FaClipboardCheck />

            {submitting
              ? "Submitting Inspection..."
              : inspectionItems.some(
                  (item) =>
                    getConditionSeverity(
                      item,
                      condition[
                        item.key
                      ]
                    ) ===
                    "critical"
                )
              ? "Submit Critical Defect Report"
              : "Complete Inspection & Release Vehicle"}
          </button>
        </div>
      </form>


      <footer className="employee-preinspection-footer">
        AEDC Company Vehicle Management System · Admin Pre-Use Inspection
      </footer>
    </main>
  );
}

export default VehicleCheckout;