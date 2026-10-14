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
  FaGasPump,
  FaIdCard,
  FaRoad,
  FaShieldAlt,
  FaTachometerAlt,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import { lookupVehicleEmployee } from "../lib/employeeLookup";

import { getVehicleRequestForEmployee } from "../lib/vehicleRequestLookup";

import { getVehicleForEmployeeContext } from "../lib/vehicleLookup";

import {
  completeVehiclePreInspectionForEmployee,
  getVehicleTripForEmployeeRequest,
} from "../lib/vehicleTripLookup";

import {
  listVehiclePreUseEvidenceForRequest,
} from "../lib/vehicleEvidenceLookup";

import VehicleEvidenceUpload from "../Components/VehicleEvidenceUpload";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/EmployeePreInspection.css";
import "../Styles/EmployeePreInspection-photo-requirements.css";


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


function EmployeePreInspection() {
  const { requestId } = useParams();

  const navigate = useNavigate();

  const [request, setRequest] =
    useState(null);

  const [vehicle, setVehicle] =
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
    const savedEmployeeNumber =
      localStorage.getItem(
        "aedc_employee_number"
      );

    if (!savedEmployeeNumber) {
      navigate(
        "/employee",
        {
          replace: true,
        }
      );

      return;
    }

    setEmployeeNumber(
      savedEmployeeNumber
    );

    loadInspection(
      savedEmployeeNumber
    );
  }, [requestId, navigate]);


  async function loadInspection(
    currentEmployeeNumber
  ) {
    try {
      setLoading(true);
      setErrorMessage("");

      /*
       * -------------------------------------------------
       * LOAD REQUEST
       * -------------------------------------------------
       */

      const requestData =
        await getVehicleRequestForEmployee(
          requestId,
          currentEmployeeNumber
        );

      if (!requestData) {
        throw new Error(
          "Unable to load this approved booking."
        );
      }


      /*
       * Employee may only complete their own request.
       */

      if (
        String(
          requestData.employee_number ||
            ""
        ).trim() !==
        String(
          currentEmployeeNumber
        ).trim()
      ) {
        throw new Error(
          "You cannot complete a pre-use inspection for another employee's booking."
        );
      }


      /*
       * Request must already be approved.
       */

      if (
        requestData.status !==
        "approved"
      ) {
        throw new Error(
          "This vehicle request has not been approved by the Facilities Manager."
        );
      }

      setRequest(requestData);


      /*
       * -------------------------------------------------
       * LOAD VEHICLE
       * -------------------------------------------------
       */

      const vehicleData =
        await getVehicleForEmployeeContext({
          vehicleId:
            requestData.vehicle_id,

          employeeNumber:
            currentEmployeeNumber,

          requestId,
        });

      if (!vehicleData) {
        throw new Error(
          "Unable to load the vehicle for this approved booking."
        );
      }

      setVehicle(vehicleData);


      /*
       * Start with the current vehicle odometer.
       */

      setFormData(
        (previous) => ({
          ...previous,

          startOdometer:
            String(
              vehicleData.current_odometer ||
                0
            ),
        })
      );


      /*
       * -------------------------------------------------
       * OPTIONAL DRIVER REGISTER PREFILL
       * -------------------------------------------------
       *
       * We do not block the prototype if the employee
       * isn't registered yet.
       */

      let driverData = null;

      try {
        driverData =
          await lookupVehicleEmployee(
            currentEmployeeNumber
          );
      } catch (driverError) {
        console.error(
          "Driver profile lookup:",
          driverError
        );
      }

      if (driverData) {
        setFormData(
          (previous) => ({
            ...previous,

            phone:
              driverData.phone ||
              previous.phone,

            driverLicenseNumber:
              driverData.driver_license_number ||
              previous.driverLicenseNumber,
          })
        );
      }


      /*
       * -------------------------------------------------
       * PREVENT SECOND CHECKOUT
       * -------------------------------------------------
       */

      const existingTrip =
        await getVehicleTripForEmployeeRequest(
          requestId,
          currentEmployeeNumber
        );

      if (existingTrip) {
        if (
          existingTrip.status ===
            "in-use" ||
          existingTrip.status ===
            "incident-open"
        ) {
          navigate(
            `/employee/return/${existingTrip.id}`,
            {
              replace: true,
            }
          );

          return;
        }

        if (
          existingTrip.status ===
          "returned"
        ) {
          navigate(
            "/employee/my-history",
            {
              replace: true,
            }
          );

          return;
        }
      }


      /*
       * -------------------------------------------------
       * LOAD EXISTING EVIDENCE
       * -------------------------------------------------
       */

      const existingEvidence =
        await listVehiclePreUseEvidenceForRequest(
          requestId,
          currentEmployeeNumber
        );

      if (existingEvidence === null) {
        throw new Error(
          "You are not authorised to access evidence for this booking."
        );
      }

      const evidence =
        existingEvidence || [];

      setFrontPhotoCount(
        evidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
            "vehicle-front"
        ).length
      );

      setRearPhotoCount(
        evidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
            "vehicle-rear"
        ).length
      );

      setDriverSidePhotoCount(
        evidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
            "vehicle-driver-side"
        ).length
      );

      setPassengerSidePhotoCount(
        evidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
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
        "Employee pre-inspection error:",
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


  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (
      submitting ||
      !vehicle ||
      !request
    ) {
      return;
    }

    setErrorMessage("");


    /*
     * -------------------------------------------------
     * VERIFY EMPLOYEE
     * -------------------------------------------------
     */

    if (
      String(
        request.employee_number ||
          ""
      ).trim() !==
      String(employeeNumber).trim()
    ) {
      setErrorMessage(
        "This approved booking does not belong to your employee number."
      );

      return;
    }


    /*
     * -------------------------------------------------
     * VEHICLE CHECKS
     * -------------------------------------------------
     */

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


    /*
     * -------------------------------------------------
     * ODOMETER
     * -------------------------------------------------
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
      setErrorMessage(
        "Enter a valid starting odometer reading."
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


    /*
     * -------------------------------------------------
     * LICENCE
     * -------------------------------------------------
     */

    if (
      !formData.driverLicenseNumber.trim()
    ) {
      setErrorMessage(
        "Enter your driver's licence number."
      );

      return;
    }


    /*
     * -------------------------------------------------
     * INSPECTION DEFECTS
     * -------------------------------------------------
     */

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


    /*
     * -------------------------------------------------
     * MANDATORY 4-SIDE EXTERIOR PHOTOS
     * -------------------------------------------------
     */

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
        `Upload all 4 required exterior vehicle photos before starting the trip. Missing: ${missingExteriorPhotos.join(
          ", "
        )}.`
      );

      return;
    }

    if (
      odometerEvidenceCount === 0
    ) {
      setErrorMessage(
        "Upload the required starting odometer photo before starting the trip."
      );

      return;
    }


    /*
     * -------------------------------------------------
     * DAMAGE
     * -------------------------------------------------
     */

    if (
      formData.preExistingDamage ===
        "yes" &&
      !formData.preExistingDamageDescription.trim()
    ) {
      setErrorMessage(
        "Describe all pre-existing damage before taking the vehicle."
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


    /*
     * -------------------------------------------------
     * DECLARATIONS
     * -------------------------------------------------
     */

    const declarationsComplete =
      formData.licenseValidConfirmed &&
      formData.fitToDriveConfirmed &&
      formData.authorizedDriverConfirmed &&
      formData.policyAcknowledgedConfirmed &&
      formData.inspectionAccuracyConfirmed;

    if (!declarationsComplete) {
      setErrorMessage(
        "All driver declarations must be confirmed before taking the vehicle."
      );

      return;
    }


    try {
      setSubmitting(true);


      /*
       * -------------------------------------------------
       * RECHECK REQUEST
       * -------------------------------------------------
       */

      const latestRequest =
        await getVehicleRequestForEmployee(
          request.id,
          employeeNumber
        );

      if (!latestRequest) {
        throw new Error(
          "This booking does not belong to your employee number."
        );
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
        String(
          latestRequest.employee_number ||
            ""
        ).trim() !==
        String(employeeNumber).trim()
      ) {
        throw new Error(
          "This booking does not belong to your employee number."
        );
      }


      /*
       * -------------------------------------------------
       * CHECK FOR EXISTING TRIP AGAIN
       * -------------------------------------------------
       */

      const existingTrip =
        await getVehicleTripForEmployeeRequest(
          request.id,
          employeeNumber
        );

      if (existingTrip) {
        if (
          existingTrip.status ===
            "in-use" ||
          existingTrip.status ===
            "incident-open"
        ) {
          navigate(
            `/employee/return/${existingTrip.id}`,
            {
              replace: true,
            }
          );

          return;
        }

        throw new Error(
          "A trip has already been created for this booking."
        );
      }


      /*
       * -------------------------------------------------
       * RECHECK VEHICLE
       * -------------------------------------------------
       */

      const latestVehicle =
        await getVehicleForEmployeeContext({
          vehicleId:
            vehicle.id,

          employeeNumber,

          requestId:
            request.id,
        });

      if (!latestVehicle) {
        throw new Error(
          "This vehicle could not be loaded for your approved booking."
        );
      }

      if (
        !latestVehicle.active
      ) {
        throw new Error(
          "This vehicle is no longer active."
        );
      }

      if (
        !latestVehicle.roadworthy
      ) {
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


      /*
       * -------------------------------------------------
       * SAVE FORMAL FLEET INSPECTION
       * -------------------------------------------------
       *
       * This restricted RPC verifies the employee,
       * approved booking and vehicle before creating
       * the inspection and any defect records.
       */

      const {
        data: inspectionResult,
        error: inspectionError,
      } = await supabase.rpc(
        "submit_fleet_pretrip_inspection",
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
          "/employee/my-requests",
          {
            replace: true,
          }
        );

        return;
      }


      /*
       * -------------------------------------------------
       * COMPLETE PRE-USE CHECKOUT
       * -------------------------------------------------
       *
       * The database transaction creates the trip,
       * links pre-use evidence and marks the vehicle
       * IN USE as one restricted server-side operation.
       */

      await completeVehiclePreInspectionForEmployee({
        requestId:
          request.id,

        employeeNumber,

        phone:
          formData.phone,

        driverLicenseNumber:
          formData.driverLicenseNumber,

        licenseValidConfirmed:
          formData.licenseValidConfirmed,

        fitToDriveConfirmed:
          formData.fitToDriveConfirmed,

        authorizedDriverConfirmed:
          formData.authorizedDriverConfirmed,

        policyAcknowledgedConfirmed:
          formData.policyAcknowledgedConfirmed,

        startOdometer,

        fuelBefore:
          formData.fuelBefore,

        conditionBefore:
          condition,

        preExistingDamage:
          formData.preExistingDamage ===
          "yes",

        preExistingDamageDescription:
          formData.preExistingDamageDescription,

        preUseNotes:
          formData.preUseNotes,

        informationAccuracyConfirmed:
          formData.inspectionAccuracyConfirmed,
      });


      /*
       * -------------------------------------------------
       * SUCCESS
       * -------------------------------------------------
       */

      alert(
        `Pre-use inspection completed successfully.\n\nBooking: ${
          request.booking_reference
        }\nVehicle: ${formatVehicleName()}\nDriver: ${
          request.requested_driver_name
        }\n\nThe vehicle is now recorded as IN USE.`
      );

      navigate(
        "/employee",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Employee checkout error:",
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
            to="/employee/my-requests"
            className="employee-preinspection-error-link"
          >
            My Vehicle Requests
          </Link>
        </div>
      </main>
    );
  }


  return (
    <main className="employee-preinspection-page">
      {/* ================================================
          HEADER
      ================================================ */}

      <header className="employee-preinspection-header">
        <div className="employee-preinspection-header-inner">
          <div className="employee-preinspection-header-left">
            <Link
              to="/employee/my-requests"
              className="employee-preinspection-back"
            >
              <FaArrowLeft />
            </Link>

            <AEDCLogo
              compact
              className="employee-preinspection-logo"
            />

            <div>
              <span>
                AEDC VEHICLE MANAGEMENT
              </span>

              <h1>
                Pre-Use Inspection
              </h1>

              <p>
                Employee Vehicle Portal
              </p>
            </div>
          </div>
        </div>
      </header>


      {/* ================================================
          HERO
      ================================================ */}

      <section className="employee-preinspection-hero">
        <div className="employee-preinspection-hero-inner">
          <span>
            PRE-USE DIGITAL LOGBOOK
          </span>

          <h2>
            Inspect Before You Drive
          </h2>

          <p>
            Complete the mandatory vehicle
            inspection before taking the
            company vehicle.
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
                The employee named on the
                approved booking must personally
                complete this logbook.
              </p>
            </div>
          </div>

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
                Driver Declaration
              </h2>

              <p>
                Every declaration must be
                confirmed before the vehicle
                may be taken.
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
                The digital logbook must be
                complete, honest and accurate.
                The employee completing this
                inspection is recorded in the
                trip audit trail.
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
                I confirm that I hold a
                current valid driver's licence
                appropriate for this vehicle.
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
                I confirm that I am authorized
                to drive the AEDC company
                vehicle.
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
                I confirm that I am fit to
                drive and am not impaired by
                alcohol, drugs, medication,
                fatigue or illness.
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
                I confirm that I have read
                and acknowledged the AEDC
                Company Vehicle Use Policy.
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
                I confirm that I personally
                completed this pre-use
                inspection and that the
                information recorded is
                complete and accurate.
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
              Before Taking the Vehicle
            </strong>

            <p>
              Submit this logbook only after
              physically inspecting the vehicle.
              A safe inspection will continue to
              trip start. Critical defects are
              recorded and will block vehicle use.
            </p>
          </div>
        </section>


        {/* ==============================================
            ACTIONS
        ============================================== */}

        <div className="employee-preinspection-actions">
          <Link
            to="/employee/my-requests"
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
              : "Complete Inspection & Take Vehicle"}
          </button>
        </div>
      </form>


      <footer className="employee-preinspection-footer">
        AEDC Company Vehicle Management System
      </footer>
    </main>
  );
}

export default EmployeePreInspection;