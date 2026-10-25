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

import { lookupVehicleEmployee } from "../lib/employeeLookup";

import {
  completeVehicleReturnForEmployee,
  getVehicleTripForEmployee,
} from "../lib/vehicleTripLookup";

import {
  stageTripFuelForEmployee,
} from "../lib/fuelLookup";

import { getVehicleForEmployeeContext } from "../lib/vehicleLookup";

import {
  listVehiclePostUseEvidenceForTrip,
} from "../lib/vehicleEvidenceLookup";

import AEDCLogo from "../Components/AEDCLogo";

import VehicleEvidenceUpload from "../Components/VehicleEvidenceUpload";

import "../Styles/EmployeeVehicleReturn.css";
import "../Styles/EmployeeVehicleReturnPhotos.css";


const inspectionItems = [
  {
    key: "bodywork",
    label: "Exterior Bodywork",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "tyres",
    label: "Tyres & Wheels",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "windscreen",
    label: "Windscreen & Windows",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "lights",
    label: "Lights & Indicators",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "brakes",
    label: "Brakes",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "steering",
    label: "Steering",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "horn",
    label: "Horn",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "seatbelts",
    label: "Seatbelts",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "mirrors",
    label: "Mirrors",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "wipers",
    label: "Wipers & Washers",
    attentionSeverity: "minor",
    damagedSeverity: "major",
  },
  {
    key: "fluidLeaks",
    label: "Fluid Leaks",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
  {
    key: "safetyEquipment",
    label: "Safety Equipment",
    attentionSeverity: "major",
    damagedSeverity: "critical",
  },
];


const severity = {
  good: 0,
  attention: 1,
  damaged: 2,
};


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
    returnDefectDetails,
    setReturnDefectDetails,
  ] = useState({});


  const [
    damageEvidenceCount,
    setDamageEvidenceCount,
  ] = useState(0);


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
    formData,
    setFormData,
  ] = useState({
    endOdometer: "",

    fuelAfter: "full",

    fuelPurchased: "no",

    fuelAmount: "",

    fuelLitres: "",

    fuelStation: "",

    fuelPaymentMethod: "fuel-card",

    fuelFullTank: true,

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

      const vehicleData =
        await getVehicleForEmployeeContext({
          vehicleId:
            tripData.vehicle_id,

          employeeNumber:
            storedEmployeeNumber,

          tripId:
            tripData.id,
        });


      if (!vehicleData) {
        throw new Error(
          "Unable to load the vehicle for this trip."
        );
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


      setConditionAfter(
        inspectionItems.reduce(
          (result, item) => {
            result[item.key] =
              before[item.key] ||
              "good";

            return result;
          },
          {}
        )
      );

      setReturnDefectDetails({});


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


      const postUseEvidence =
        evidenceData || [];

      setFrontPhotoCount(
        postUseEvidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
            "vehicle-front"
        ).length
      );

      setRearPhotoCount(
        postUseEvidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
            "vehicle-rear"
        ).length
      );

      setDriverSidePhotoCount(
        postUseEvidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
            "vehicle-driver-side"
        ).length
      );

      setPassengerSidePhotoCount(
        postUseEvidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
            "vehicle-passenger-side"
        ).length
      );

      setOdometerEvidenceCount(
        postUseEvidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
            "odometer"
        ).length
      );

      setDamageEvidenceCount(
        postUseEvidence.filter(
          (item) =>
            getLogicalEvidenceType(
              item
            ) ===
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

    if (value === "good") {
      setReturnDefectDetails(
        (previous) => ({
          ...previous,

          [key]: "",
        })
      );
    }
  }


  function handleReturnDefectDescriptionChange(
    key,
    value
  ) {
    setReturnDefectDetails(
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

              severity:
                getConditionSeverity(
                  item,
                  conditionAfter[
                    item.key
                  ] ||
                  "good"
                ),

              description:
                String(
                  returnDefectDetails[
                    item.key
                  ] ||
                  ""
                ).trim(),
            })
          );
      },
      [
        trip,
        conditionAfter,
        returnDefectDetails,
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


  const fuelCostPerLitre =
    Number(
      formData.fuelLitres
    ) > 0
      ? Number(
          formData.fuelAmount ||
            0
        ) /
        Number(
          formData.fuelLitres
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
        .fuelPurchased ===
        "yes" &&
      Number(
        formData
          .fuelLitres
      ) <= 0
    ) {
      window.alert(
        "Please enter the number of litres purchased."
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
     * POST-USE SAFETY INSPECTION
     * ============================================
     */

    const inspectionItemsMissingDetails =
      inspectionItems.filter(
        (item) =>
          (
            conditionAfter[
              item.key
            ] ||
            "good"
          ) !== "good" &&
          !String(
            returnDefectDetails[
              item.key
            ] ||
            ""
          ).trim()
      );


    if (
      inspectionItemsMissingDetails
        .length > 0
    ) {
      window.alert(
        `Describe every return inspection item marked Attention or Defect before completing the return. Missing: ${inspectionItemsMissingDetails
          .map(
            (item) =>
              item.label
          )
          .join(", ")}.`
      );

      return;
    }


    /*
     * ============================================
     * REQUIRED RETURN PHOTOS
     * ============================================
     */

    const missingReturnPhotos = [];

    if (frontPhotoCount === 0) {
      missingReturnPhotos.push(
        "front"
      );
    }

    if (rearPhotoCount === 0) {
      missingReturnPhotos.push(
        "rear"
      );
    }

    if (
      driverSidePhotoCount === 0
    ) {
      missingReturnPhotos.push(
        "driver side"
      );
    }

    if (
      passengerSidePhotoCount === 0
    ) {
      missingReturnPhotos.push(
        "passenger side"
      );
    }

    if (
      missingReturnPhotos.length >
      0
    ) {
      window.alert(
        `Upload all 4 required return exterior photos before completing the return. Missing: ${missingReturnPhotos.join(
          ", "
        )}.`
      );

      return;
    }

    if (
      odometerEvidenceCount === 0
    ) {
      window.alert(
        "Upload the required return odometer photo before completing the return."
      );

      return;
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
      window.alert(
        "The return inspection shows that the vehicle condition has worsened. Set New Damage to Yes and record the damage before completing the return."
      );

      return;
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
        conditionChanges.length >
          0 ||
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
       * STAGE FUEL LEDGER DETAILS
       * ============================================
       *
       * If fuel was purchased, store the litres,
       * station and payment details against this
       * active trip first. The database trigger
       * creates the final fleet_fuel_logs record
       * only after the secure return succeeds.
       */

      if (
        formData.fuelPurchased ===
        "yes"
      ) {
        await stageTripFuelForEmployee({
          tripId:
            trip.id,

          employeeNumber:
            employee.employee_number,

          litres:
            Number(
              formData.fuelLitres
            ),

          station:
            formData.fuelStation,

          paymentMethod:
            formData.fuelPaymentMethod,

          fullTank:
            formData.fuelFullTank,
        });
      }


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
            "yes" ||
          conditionChanges.length > 0,

        newDamageDescription:
          formData
            .newDamageDescription ||
          conditionChanges
            .map(
              (change) =>
                `${change.label}: ${
                  change.description ||
                  change.after
                }`
            )
            .join("; "),

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
          [
            formData.postUseNotes,

            ...inspectionItems
              .filter(
                (item) =>
                  (
                    conditionAfter[
                      item.key
                    ] ||
                    "good"
                  ) !== "good"
              )
              .map(
                (item) =>
                  `Return inspection - ${
                    item.label
                  }: ${
                    conditionAfter[
                      item.key
                    ]
                  } - ${
                    returnDefectDetails[
                      item.key
                    ] ||
                    "No description"
                  }`
              ),
          ]
            .filter(Boolean)
            .join("\n"),

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
                    min="0.01"
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
                    Litres Purchased *
                  </label>

                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    name="fuelLitres"
                    value={
                      formData
                        .fuelLitres
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. 45.50"
                  />

                </div>


                <div className="employee-return-field">

                  <label>
                    Cost per Litre
                  </label>

                  <input
                    type="text"
                    value={
                      fuelCostPerLitre > 0
                        ? `R ${fuelCostPerLitre.toFixed(
                            2
                          )}`
                        : ""
                    }
                    placeholder="Calculated automatically"
                    readOnly
                  />

                </div>


                <div className="employee-return-field">

                  <label>
                    Filling Station
                  </label>

                  <input
                    type="text"
                    name="fuelStation"
                    value={
                      formData
                        .fuelStation
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Engen Midrand"
                  />

                </div>


                <div className="employee-return-field">

                  <label>
                    Payment Method
                  </label>

                  <select
                    name="fuelPaymentMethod"
                    value={
                      formData
                        .fuelPaymentMethod
                    }
                    onChange={
                      handleChange
                    }
                  >

                    <option value="fuel-card">
                      Fuel Card
                    </option>

                    <option value="company-card">
                      Company Card
                    </option>

                    <option value="cash">
                      Cash
                    </option>

                    <option value="reimbursement">
                      Reimbursement
                    </option>

                    <option value="eft">
                      EFT
                    </option>

                    <option value="other">
                      Other
                    </option>

                  </select>

                </div>


                <div className="employee-return-field">

                  <label>
                    Receipt Submitted?
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


                <label className="employee-return-fuel-full-option employee-return-full">

                  <input
                    type="checkbox"
                    name="fuelFullTank"
                    checked={
                      formData
                        .fuelFullTank
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <span>

                    <strong>
                      Vehicle Filled to Full Tank
                    </strong>

                    <small>
                      This helps calculate reliable
                      fuel-consumption figures later.
                    </small>

                  </span>

                </label>


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

          <div className="employee-return-inspection-summary">

            <div>
              <span>
                Checklist
              </span>

              <strong>
                {inspectionItems.length} items
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
                      (
                        conditionAfter[
                          item.key
                        ] ||
                        "good"
                      ) !== "good"
                  ).length
                }
              </strong>
            </div>

            <div
              className={
                conditionChanges.length > 0
                  ? "employee-return-summary-warning"
                  : ""
              }
            >
              <span>
                Worsened
              </span>

              <strong>
                {conditionChanges.length}
              </strong>
            </div>

          </div>


          <div className="employee-return-inspection-grid">

            {inspectionItems.map(
              (item) => {
                const selected =
                  conditionAfter[
                    item.key
                  ] ||
                  "good";

                const beforeValue =
                  trip
                    ?.condition_before
                    ?.[item.key] ||
                  "good";

                const itemSeverity =
                  getConditionSeverity(
                    item,
                    selected
                  );

                return (

                  <div
                    key={item.key}
                    className={`employee-return-inspection-item ${
                      selected !==
                      "good"
                        ? "employee-return-inspection-has-issue"
                        : ""
                    }`}
                  >

                    <div className="employee-return-inspection-heading">

                      <FaCar />

                      <div>

                        <strong>
                          {item.label}
                        </strong>

                        <span>
                          {selected ===
                          "good"
                            ? "No issue identified"
                            : `${itemSeverity} issue`}
                        </span>

                        <small>
                          Departure: {
                            beforeValue
                          }
                        </small>

                      </div>

                    </div>


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
                              selected ===
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
                              : "Defect"}

                          </button>

                        )
                      )}

                    </div>


                    {selected !==
                      "good" && (

                      <div className="employee-return-defect-detail">

                        <div className="employee-return-defect-meta">

                          <span>
                            Severity
                          </span>

                          <strong
                            className={`employee-return-severity employee-return-severity-${itemSeverity}`}
                          >
                            {
                              itemSeverity
                            }
                          </strong>

                        </div>


                        <label>

                          Describe the issue *

                          <textarea
                            value={
                              returnDefectDetails[
                                item.key
                              ] ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              handleReturnDefectDescriptionChange(
                                item.key,
                                event
                                  .target
                                  .value
                              )
                            }
                            rows="3"
                            placeholder={`Describe the ${item.label.toLowerCase()} condition clearly...`}
                            required
                          />

                        </label>


                        {itemSeverity ===
                          "critical" && (

                          <div className="employee-return-critical-warning">

                            <FaExclamationTriangle />

                            <span>
                              Critical return
                              defect. The vehicle
                              will remain
                              unavailable pending
                              Admin review.
                            </span>

                          </div>

                        )}

                      </div>

                    )}

                  </div>

                );
              }
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
          title="Mandatory Return Photos"
          description="Take the same four exterior views captured before departure, plus a clear return odometer photo."
        >

          <div className="employee-return-photo-rule">
            <FaExclamationTriangle />

            <div>
              <strong>
                Return Photo Quality Rules
              </strong>

              <p>
                Recreate the same viewing angles used
                before departure. Stand far enough away
                to show the complete vehicle side, keep
                the full vehicle inside the frame, use
                good lighting, avoid blurry images, and
                make sure the registration plate is
                visible in the front and rear photos
                where possible.
              </p>
            </div>
          </div>


          <div className="employee-return-photo-guide">
            <article
              className={
                frontPhotoCount > 0
                  ? "employee-return-photo-guide-card complete"
                  : "employee-return-photo-guide-card"
              }
            >
              <span className="employee-return-photo-step">
                1 / 4
              </span>

              <div className="employee-return-photo-icon">
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
                  ? "employee-return-photo-guide-card complete"
                  : "employee-return-photo-guide-card"
              }
            >
              <span className="employee-return-photo-step">
                2 / 4
              </span>

              <div className="employee-return-photo-icon">
                REAR
              </div>

              <h3>
                Rear of Vehicle
              </h3>

              <p>
                Stand directly behind the vehicle.
                Capture the full rear, tail lights,
                rear window, bumper and registration
                plate.
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
                  ? "employee-return-photo-guide-card complete"
                  : "employee-return-photo-guide-card"
              }
            >
              <span className="employee-return-photo-step">
                3 / 4
              </span>

              <div className="employee-return-photo-icon">
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
                  ? "employee-return-photo-guide-card complete"
                  : "employee-return-photo-guide-card"
              }
            >
              <span className="employee-return-photo-step">
                4 / 4
              </span>

              <div className="employee-return-photo-icon">
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


          <div className="employee-return-photo-uploads">
            <div className="employee-return-photo-upload-slot">
              <div className="employee-return-photo-upload-heading">
                <span>
                  PHOTO 1 OF 4
                </span>

                <strong>
                  Front View
                </strong>

                <small>
                  Match the pre-trip front angle as
                  closely as possible.
                </small>
              </div>

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
                type="vehicle-front"
                title="Upload Front Return Photo"
                description="Take one clear photo showing the complete front of the vehicle after the trip."
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


            <div className="employee-return-photo-upload-slot">
              <div className="employee-return-photo-upload-heading">
                <span>
                  PHOTO 2 OF 4
                </span>

                <strong>
                  Rear View
                </strong>

                <small>
                  Match the pre-trip rear angle as
                  closely as possible.
                </small>
              </div>

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
                type="vehicle-rear"
                title="Upload Rear Return Photo"
                description="Take one clear photo showing the complete rear of the vehicle after the trip."
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


            <div className="employee-return-photo-upload-slot">
              <div className="employee-return-photo-upload-heading">
                <span>
                  PHOTO 3 OF 4
                </span>

                <strong>
                  Driver-Side View
                </strong>

                <small>
                  Match the pre-trip driver-side
                  angle as closely as possible.
                </small>
              </div>

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
                type="vehicle-driver-side"
                title="Upload Driver-Side Return Photo"
                description="Take one clear photo showing the full driver's side of the vehicle after the trip."
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


            <div className="employee-return-photo-upload-slot">
              <div className="employee-return-photo-upload-heading">
                <span>
                  PHOTO 4 OF 4
                </span>

                <strong>
                  Passenger-Side View
                </strong>

                <small>
                  Match the pre-trip passenger-side
                  angle as closely as possible.
                </small>
              </div>

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
                type="vehicle-passenger-side"
                title="Upload Passenger-Side Return Photo"
                description="Take one clear photo showing the full passenger side of the vehicle after the trip."
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


          <div className="employee-return-four-photo-status">
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


          <div className="employee-return-odometer-photo">
            <div className="employee-return-photo-upload-heading">
              <span>
                REQUIRED ODOMETER
              </span>

              <strong>
                Return Odometer Photo
              </strong>

              <small>
                Photograph the dashboard clearly
                so the ending odometer reading can
                be read without zooming.
              </small>
            </div>

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
              description="Photograph the dashboard clearly showing the ending odometer reading."
              required
              multiple={false}
              imagesOnly
              expectedVehicle={
                vehicle
              }
              expectedOdometer={
                formData.endOdometer
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
          </div>


          <div className="employee-return-photo-summary">
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
          </div>


          {formData
            .newDamage ===
            "yes" && (

            <div className="employee-return-new-damage-photo">
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
            </div>

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