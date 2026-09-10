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
  FaUserShield,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import VehicleEvidenceUpload from "../Components/VehicleEvidenceUpload";

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

const severity = {
  good: 0,
  attention: 1,
  damaged: 2,
};

function VehicleReturn() {
  const { usageId } = useParams();

  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);

  const [vehicle, setVehicle] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    conditionAfter,
    setConditionAfter,
  ] = useState({});

  const [
    damageEvidenceCount,
    setDamageEvidenceCount,
  ] = useState(0);

  const [formData, setFormData] =
    useState({
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

      alternativeParkingApproved: "no",

      alternativeParkingReason: "",

      vehicleLocked: false,

      windowsClosed: false,

      personalBelongingsRemoved: false,

      companyPropertyRemoved: false,

      keysReturned: false,

      keysReturnedTo: "",

      completedBy: "",

      returnConditionConfirmed: false,

      vehicleSecuredConfirmed: false,

      informationAccuracyConfirmed: false,
    });

  useEffect(() => {
    loadTrip();
  }, [usageId]);

  async function loadTrip() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: tripData,
        error: tripError,
      } = await supabase
        .from("vehicle_trips")
        .select("*")
        .eq("id", usageId)
        .single();

      if (tripError) {
        throw tripError;
      }

      /*
       * A returned_at value means the
       * post-use logbook has already been
       * completed, even if status happens
       * to remain incident-open.
       */
      if (tripData.returned_at) {
        throw new Error(
          "This vehicle trip has already been returned and the post-use logbook has been completed."
        );
      }

      if (
        tripData.status !== "in-use" &&
        tripData.status !== "incident-open"
      ) {
        throw new Error(
          "This vehicle trip is no longer active."
        );
      }

      setTrip(tripData);

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

      setVehicle(vehicleData);

      const before =
        tripData.condition_before || {};

      setConditionAfter({
        bodywork:
          before.bodywork || "good",

        tyres:
          before.tyres || "good",

        windscreen:
          before.windscreen || "good",

        lights:
          before.lights || "good",
      });

      setFormData((previous) => ({
        ...previous,

        endOdometer: String(
          tripData.start_odometer || 0
        ),

        fuelAfter:
          tripData.fuel_before || "full",

        returnParkingLocation:
          tripData.out_of_province
            ? tripData.approved_overnight_location ||
              vehicleData.default_parking ||
              "AEDC Office Basement Parking"
            : vehicleData.default_parking ||
              "AEDC Office Basement Parking",
      }));

      const {
        data: evidenceData,
        error: evidenceError,
      } = await supabase
        .from("vehicle_evidence")
        .select("id, evidence_type")
        .eq("trip_id", usageId)
        .eq(
          "evidence_stage",
          "post-use"
        );

      if (evidenceError) {
        throw evidenceError;
      }

      setDamageEvidenceCount(
        (evidenceData || []).filter(
          (item) =>
            item.evidence_type ===
            "new-damage"
        ).length
      );
    } catch (error) {
      console.error(
        "Return load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load active vehicle trip."
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

    setFormData((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  function handleConditionChange(
    key,
    value
  ) {
    setConditionAfter((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  const vehicleName = useMemo(() => {
    if (!vehicle) {
      return "Company Vehicle";
    }

    const make =
      vehicle.make?.trim() || "";

    const model =
      vehicle.model?.trim() || "";

    const name = `${make} ${model}`.trim();

    return name || "Company Vehicle";
  }, [vehicle]);

  const conditionChanges =
    useMemo(() => {
      if (!trip) {
        return [];
      }

      const before =
        trip.condition_before || {};

      return inspectionItems
        .filter((item) => {
          const beforeValue =
            before[item.key] || "good";

          const afterValue =
            conditionAfter[item.key] ||
            "good";

          return (
            severity[afterValue] >
            severity[beforeValue]
          );
        })
        .map((item) => ({
          key: item.key,

          label: item.label,

          before:
            before[item.key] ||
            "good",

          after:
            conditionAfter[item.key] ||
            "good",
        }));
    }, [
      trip,
      conditionAfter,
    ]);

  function fuelScore(value) {
    const levels = {
      "almost-empty": 0,
      quarter: 1,
      half: 2,
      "three-quarter": 3,
      full: 4,
    };

    return levels[value] ?? 0;
  }

  const fuelLowerThanDeparture =
    trip
      ? fuelScore(
          formData.fuelAfter
        ) <
        fuelScore(
          trip.fuel_before
        )
      : false;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!trip || !vehicle) {
      return;
    }

    const endOdometer =
      Number(
        formData.endOdometer
      );

    if (
      !Number.isFinite(endOdometer)
    ) {
      alert(
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
      alert(
        "Ending odometer cannot be lower than the starting odometer."
      );

      return;
    }

    if (
      fuelLowerThanDeparture &&
      formData.fuelPurchased !==
        "yes"
    ) {
      const continueReturn =
        window.confirm(
          "The vehicle is being returned with less fuel than it had at departure. Do you still want to continue?"
        );

      if (!continueReturn) {
        return;
      }
    }

    if (
      formData.fuelPurchased ===
        "yes" &&
      Number(
        formData.fuelAmount
      ) <= 0
    ) {
      alert(
        "Please enter the fuel purchase amount."
      );

      return;
    }

    if (
      formData.fuelReceiptSubmitted ===
        "yes" &&
      !formData.fuelReceiptReference.trim()
    ) {
      alert(
        "Please enter the fuel receipt reference."
      );

      return;
    }

    if (
      formData.newDamage ===
        "yes" &&
      !formData.newDamageDescription.trim()
    ) {
      alert(
        "Please describe the new damage."
      );

      return;
    }

    if (
      formData.newDamage ===
        "yes" &&
      damageEvidenceCount === 0
    ) {
      alert(
        "Please upload at least one photograph of the new damage."
      );

      return;
    }

    if (
      formData.warningLightReported ===
        "yes" &&
      !formData.warningLightDescription.trim()
    ) {
      alert(
        "Please describe the warning light."
      );

      return;
    }

    if (
      formData.mechanicalIssueReported ===
        "yes" &&
      !formData.mechanicalIssueDescription.trim()
    ) {
      alert(
        "Please describe the mechanical issue."
      );

      return;
    }

    if (
      formData.returnedToDesignatedBay ===
        "no" &&
      !formData.returnParkingLocation.trim()
    ) {
      alert(
        "Please record where the vehicle was parked."
      );

      return;
    }

    if (
      formData.returnedToDesignatedBay ===
        "no" &&
      !formData.alternativeParkingReason.trim()
    ) {
      alert(
        `Please explain why the ${vehicleName} was not returned to the designated AEDC parking bay.`
      );

      return;
    }

    if (
      formData.returnedToDesignatedBay ===
        "no" &&
      formData.alternativeParkingApproved ===
        "yes" &&
      !formData.alternativeParkingReason.trim()
    ) {
      alert(
        "Please record the reason for the approved alternative parking location."
      );

      return;
    }

    if (!formData.keysReturned) {
      alert(
        "The key return confirmation is required."
      );

      return;
    }

    if (
      !formData.keysReturnedTo.trim()
    ) {
      alert(
        "Please state who received or secured the keys."
      );

      return;
    }

    if (
      !formData.completedBy.trim()
    ) {
      alert(
        "Please enter the name of the Admin or Facilities Manager completing this return."
      );

      return;
    }

    const declarationsComplete =
      formData.returnConditionConfirmed &&
      formData.vehicleSecuredConfirmed &&
      formData.informationAccuracyConfirmed;

    if (!declarationsComplete) {
      alert(
        "Please complete all return declarations."
      );

      return;
    }

    const securityComplete =
      formData.vehicleLocked &&
      formData.windowsClosed &&
      formData.personalBelongingsRemoved &&
      formData.companyPropertyRemoved;

    if (!securityComplete) {
      alert(
        "Please complete all vehicle security confirmations."
      );

      return;
    }

    const conditionIndicatesDamage =
      conditionChanges.length > 0;

    if (
      conditionIndicatesDamage &&
      formData.newDamage === "no"
    ) {
      const continueReturn =
        window.confirm(
          "The post-use inspection shows that one or more conditions worsened, but New Damage is set to No. Continue anyway?"
        );

      if (!continueReturn) {
        return;
      }
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      /*
       * Re-read the trip immediately before
       * updating it. This prevents the same
       * return from being submitted twice
       * from two tabs/devices.
       */
      const {
        data: latestTrip,
        error: latestTripError,
      } = await supabase
        .from("vehicle_trips")
        .select(
          "id, status, returned_at"
        )
        .eq("id", trip.id)
        .single();

      if (latestTripError) {
        throw latestTripError;
      }

      if (latestTrip.returned_at) {
        throw new Error(
          "This trip has already been returned. No second return record was created."
        );
      }

      if (
        latestTrip.status !== "in-use" &&
        latestTrip.status !==
          "incident-open"
      ) {
        throw new Error(
          "This trip is no longer active."
        );
      }

      const now =
        new Date().toISOString();

      const hasIncident =
        formData.newDamage === "yes" ||
        formData.warningLightReported ===
          "yes" ||
        formData.mechanicalIssueReported ===
          "yes";

      const tripUpdate = {
        returned_at: now,

        end_odometer:
          endOdometer,

        fuel_after:
          formData.fuelAfter,

        fuel_purchased:
          formData.fuelPurchased ===
          "yes",

        fuel_amount:
          formData.fuelPurchased ===
          "yes"
            ? Number(
                formData.fuelAmount ||
                  0
              )
            : 0,

        fuel_receipt_submitted:
          formData.fuelReceiptSubmitted ===
          "yes",

        fuel_receipt_reference:
          formData.fuelReceiptSubmitted ===
          "yes"
            ? formData.fuelReceiptReference.trim() ||
              null
            : null,

        condition_after:
          conditionAfter,

        condition_changes:
          conditionChanges,

        new_damage:
          formData.newDamage ===
          "yes",

        new_damage_description:
          formData.newDamage ===
          "yes"
            ? formData.newDamageDescription.trim()
            : null,

        warning_light_reported:
          formData.warningLightReported ===
          "yes",

        warning_light_description:
          formData.warningLightReported ===
          "yes"
            ? formData.warningLightDescription.trim()
            : null,

        mechanical_issue_reported:
          formData.mechanicalIssueReported ===
          "yes",

        mechanical_issue_description:
          formData.mechanicalIssueReported ===
          "yes"
            ? formData.mechanicalIssueDescription.trim()
            : null,

        post_use_notes:
          formData.postUseNotes.trim() ||
          null,

        return_parking_location:
          formData.returnParkingLocation.trim(),

        returned_to_designated_bay:
          formData.returnedToDesignatedBay ===
          "yes",

        alternative_parking_approved:
          formData.returnedToDesignatedBay ===
            "no" &&
          formData.alternativeParkingApproved ===
            "yes",

        alternative_parking_reason:
          formData.returnedToDesignatedBay ===
          "no"
            ? formData.alternativeParkingReason.trim()
            : null,

        vehicle_locked:
          formData.vehicleLocked,

        windows_closed:
          formData.windowsClosed,

        personal_belongings_removed:
          formData.personalBelongingsRemoved,

        company_property_removed:
          formData.companyPropertyRemoved,

        keys_returned:
          formData.keysReturned,

        keys_returned_to:
          formData.keysReturnedTo.trim(),

        return_condition_confirmed:
          formData.returnConditionConfirmed,

        vehicle_secured_confirmed:
          formData.vehicleSecuredConfirmed,

        information_accuracy_confirmed:
          formData.informationAccuracyConfirmed,

        post_inspection_completed_by:
          formData.completedBy.trim(),

        post_inspection_completed_by_role:
          "Admin / Facilities Manager",

        post_inspection_on_behalf:
          true,

        post_inspection_completed_at:
          now,

        status:
          hasIncident
            ? "incident-open"
            : "returned",
      };

      const {
        error: tripError,
      } = await supabase
        .from("vehicle_trips")
        .update(tripUpdate)
        .eq("id", trip.id)
        .is("returned_at", null);

      if (tripError) {
        throw tripError;
      }

      const {
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .update({
          current_odometer:
            endOdometer,

          status:
            hasIncident
              ? "unavailable"
              : "available",
        })
        .eq(
          "id",
          vehicle.id
        );

      if (vehicleError) {
        throw vehicleError;
      }

      if (trip.request_id) {
        const {
          error: requestError,
        } = await supabase
          .from("vehicle_requests")
          .update({
            status: "completed",
          })
          .eq(
            "id",
            trip.request_id
          );

        if (requestError) {
          throw requestError;
        }
      }

      if (hasIncident) {
        alert(
          `Vehicle return recorded successfully. An issue was reported, so the ${vehicleName} has been marked UNAVAILABLE pending review.`
        );
      } else {
        alert(
          `Vehicle return completed successfully. The ${vehicleName} is now AVAILABLE.`
        );
      }

      navigate("/history");
    } catch (error) {
      console.error(
        "Return error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to complete the return logbook."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="vehicle-form-page">
        <div className="page-loading">
          Loading active trip...
        </div>
      </main>
    );
  }

  if (
    !trip ||
    !vehicle ||
    errorMessage
  ) {
    return (
      <main className="vehicle-form-page">
        <div className="page-loading">
          <div>
            <h2>
              Return Logbook Unavailable
            </h2>

            <p>{errorMessage}</p>

            <Link
              to="/"
              className="submit-button button-link"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const distance =
    Math.max(
      0,
      Number(
        formData.endOdometer || 0
      ) -
        Number(
          trip.start_odometer || 0
        )
    );

  return (
    <main className="vehicle-form-page">
      <header className="form-header">
        <div className="form-header-inner">
          <Link
            to="/"
            className="back-button"
          >
            <FaArrowLeft />
            Dashboard
          </Link>

          <div className="form-brand">
            <FaCar />

            <span>
              AEDC Digital Logbook
            </span>
          </div>
        </div>
      </header>

      <section className="form-hero return-hero">
        <div className="form-hero-inner">
          <span>
            POST-USE DIGITAL LOGBOOK
          </span>

          <h1>
            Return the {vehicleName}
          </h1>

          <p>
            Complete the mandatory vehicle
            return inspection before handing
            back the keys.
          </p>
        </div>
      </section>

      <form
        className="vehicle-form"
        onSubmit={handleSubmit}
      >
        <section className="form-card">
          <span className="booking-reference">
            {trip.booking_reference ||
              "ACTIVE TRIP"}
          </span>

          <h2>
            Current Trip
          </h2>

          <div className="request-info-grid">
            <div>
              <span>Vehicle</span>

              <strong>
                {vehicleName}
              </strong>
            </div>

            <div>
              <span>Registration</span>

              <strong>
                {vehicle.registration ||
                  "Not recorded"}
              </strong>
            </div>

            <div>
              <span>Driver</span>

              <strong>
                {trip.driver_name}
              </strong>
            </div>

            <div>
              <span>Employee Number</span>

              <strong>
                {trip.employee_number ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>Destination</span>

              <strong>
                {trip.destination}
              </strong>
            </div>

            <div>
              <span>Purpose</span>

              <strong>
                {trip.purpose}
              </strong>
            </div>

            <div>
              <span>Starting Odometer</span>

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

        <section className="form-card">
          <div className="form-section-heading">
            <span>01</span>

            <div>
              <h2>
                Odometer & Distance
              </h2>

              <p>
                Record the vehicle mileage
                immediately after returning.
              </p>
            </div>
          </div>

          <div className="form-grid two-columns">
            <div className="input-group">
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

            <div className="input-group">
              <label>
                Ending Odometer (km) *
              </label>

              <input
                required
                type="number"
                min={trip.start_odometer}
                name="endOdometer"
                value={
                  formData.endOdometer
                }
                onChange={handleChange}
              />
            </div>

            <div className="input-group full-width">
              <label>
                Distance Travelled
              </label>

              <div className="return-calculated-value">
                <FaRoad />

                <strong>
                  {distance.toLocaleString(
                    "en-ZA"
                  )}{" "}
                  km
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>02</span>

            <div>
              <h2>
                Fuel & Expenses
              </h2>

              <p>
                Record fuel level and any fuel
                purchased during the trip.
              </p>
            </div>
          </div>

          <div className="fuel-comparison-box">
            <FaGasPump />

            <div>
              <span>
                Fuel at Departure
              </span>

              <strong>
                {trip.fuel_before
                  ?.replaceAll("-", " ")
                  .toUpperCase()}
              </strong>
            </div>

            <div>
              <span>
                Fuel on Return
              </span>

              <strong>
                {formData.fuelAfter
                  .replaceAll("-", " ")
                  .toUpperCase()}
              </strong>
            </div>
          </div>

          {fuelLowerThanDeparture && (
            <div className="damage-warning">
              <FaExclamationTriangle />

              <div>
                <strong>
                  Fuel level is lower
                </strong>

                <p>
                  The {vehicleName} is being
                  returned with less fuel than
                  it had at departure.
                </p>
              </div>
            </div>
          )}

          <div className="form-grid two-columns">
            <div className="input-group">
              <label>
                Fuel Level on Return *
              </label>

              <select
                required
                name="fuelAfter"
                value={
                  formData.fuelAfter
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

            <div className="input-group">
              <label>
                Fuel Purchased?
              </label>

              <select
                name="fuelPurchased"
                value={
                  formData.fuelPurchased
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

            {formData.fuelPurchased ===
              "yes" && (
              <>
                <div className="input-group">
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
                      formData.fuelAmount
                    }
                    onChange={handleChange}
                  />
                </div>

                <div className="input-group">
                  <label>
                    Receipt Submitted?
                  </label>

                  <select
                    name="fuelReceiptSubmitted"
                    value={
                      formData.fuelReceiptSubmitted
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

                {formData.fuelReceiptSubmitted ===
                  "yes" && (
                  <div className="input-group full-width">
                    <label>
                      Fuel Receipt Reference *
                    </label>

                    <input
                      required
                      type="text"
                      name="fuelReceiptReference"
                      placeholder="Receipt number or reference"
                      value={
                        formData.fuelReceiptReference
                      }
                      onChange={handleChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>03</span>

            <div>
              <h2>
                Post-Use Vehicle Inspection
              </h2>

              <p>
                Inspect the same areas checked
                before departure.
              </p>
            </div>
          </div>

          <div className="inspection-grid">
            {inspectionItems.map(
              (item) => (
                <div
                  key={item.key}
                  className="inspection-item"
                >
                  <strong>
                    {item.label}
                  </strong>

                  <div className="condition-buttons">
                    <button
                      type="button"
                      className={
                        conditionAfter[
                          item.key
                        ] === "good"
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
                        conditionAfter[
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
                        conditionAfter[
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

        <section className="form-card">
          <div className="form-section-heading">
            <span>04</span>

            <div>
              <h2>
                Return Photographs
              </h2>

              <p>
                Add photographic evidence of
                the vehicle condition at return.
              </p>
            </div>
          </div>

          <VehicleEvidenceUpload
            vehicleId={vehicle.id}
            tripId={trip.id}
            requestId={trip.request_id}
            stage="post-use"
            type="vehicle-condition"
            title="Post-Use Vehicle Photos"
            description={`Photograph the exterior condition of the ${vehicleName} after use.`}
          />

          <VehicleEvidenceUpload
            vehicleId={vehicle.id}
            tripId={trip.id}
            requestId={trip.request_id}
            stage="post-use"
            type="odometer"
            title="Ending Odometer Photo"
            description="Photograph the dashboard showing the ending odometer."
            multiple={false}
          />

          {formData.newDamage ===
            "yes" && (
            <VehicleEvidenceUpload
              vehicleId={vehicle.id}
              tripId={trip.id}
              requestId={trip.request_id}
              stage="post-use"
              type="new-damage"
              title="New Damage Photos"
              description="Photograph every area of newly reported damage clearly."
              required
              onUploaded={(files) =>
                setDamageEvidenceCount(
                  (current) =>
                    current +
                    files.length
                )
              }
            />
          )}
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>05</span>

            <div>
              <h2>
                Damage, Warning Lights & Faults
              </h2>

              <p>
                Every issue, however minor,
                must be recorded.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>
                New Damage?
              </label>

              <select
                name="newDamage"
                value={
                  formData.newDamage
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

            {formData.newDamage ===
              "yes" && (
              <div className="input-group">
                <label>
                  New Damage Description *
                </label>

                <textarea
                  required
                  rows="4"
                  name="newDamageDescription"
                  value={
                    formData.newDamageDescription
                  }
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="input-group">
              <label>
                Warning Light Reported?
              </label>

              <select
                name="warningLightReported"
                value={
                  formData.warningLightReported
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

            {formData.warningLightReported ===
              "yes" && (
              <div className="input-group">
                <label>
                  Warning Light Description *
                </label>

                <textarea
                  required
                  rows="3"
                  name="warningLightDescription"
                  value={
                    formData.warningLightDescription
                  }
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="input-group">
              <label>
                Mechanical Issue?
              </label>

              <select
                name="mechanicalIssueReported"
                value={
                  formData.mechanicalIssueReported
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

            {formData.mechanicalIssueReported ===
              "yes" && (
              <div className="input-group">
                <label>
                  Mechanical Issue Description *
                </label>

                <textarea
                  required
                  rows="3"
                  name="mechanicalIssueDescription"
                  value={
                    formData.mechanicalIssueDescription
                  }
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="input-group full-width">
              <label>
                Post-Use Notes
              </label>

              <textarea
                rows="4"
                name="postUseNotes"
                placeholder="Add any other information about the vehicle or trip."
                value={
                  formData.postUseNotes
                }
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>06</span>

            <div>
              <h2>
                Parking & Security
              </h2>

              <p>
                Confirm where the vehicle was
                parked and secured.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>
                Returned to AEDC Designated Bay?
              </label>

              <select
                name="returnedToDesignatedBay"
                value={
                  formData.returnedToDesignatedBay
                }
                onChange={handleChange}
              >
                <option value="yes">
                  Yes
                </option>

                <option value="no">
                  No
                </option>
              </select>
            </div>

            <div className="input-group">
              <label>
                Parking Location *
              </label>

              <div className="input-with-icon">
                <FaMapMarkerAlt />

                <input
                  required
                  type="text"
                  name="returnParkingLocation"
                  value={
                    formData.returnParkingLocation
                  }
                  onChange={handleChange}
                />
              </div>
            </div>

            {formData.returnedToDesignatedBay ===
              "no" && (
              <>
                <div className="input-group">
                  <label>
                    Alternative Parking Approved?
                  </label>

                  <select
                    name="alternativeParkingApproved"
                    value={
                      formData.alternativeParkingApproved
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

                <div className="input-group full-width">
                  <label>
                    Reason for Alternative Parking *
                  </label>

                  <textarea
                    required
                    rows="3"
                    name="alternativeParkingReason"
                    placeholder="Explain why the vehicle was not returned to the designated AEDC parking bay."
                    value={
                      formData.alternativeParkingReason
                    }
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>

          <div className="security-checklist">
            <label className="confirmation-check">
              <input
                type="checkbox"
                name="vehicleLocked"
                checked={
                  formData.vehicleLocked
                }
                onChange={handleChange}
              />

              <span>
                Vehicle is locked and secured.
              </span>
            </label>

            <label className="confirmation-check">
              <input
                type="checkbox"
                name="windowsClosed"
                checked={
                  formData.windowsClosed
                }
                onChange={handleChange}
              />

              <span>
                All windows are fully closed.
              </span>
            </label>

            <label className="confirmation-check">
              <input
                type="checkbox"
                name="personalBelongingsRemoved"
                checked={
                  formData.personalBelongingsRemoved
                }
                onChange={handleChange}
              />

              <span>
                Personal belongings removed.
              </span>
            </label>

            <label className="confirmation-check">
              <input
                type="checkbox"
                name="companyPropertyRemoved"
                checked={
                  formData.companyPropertyRemoved
                }
                onChange={handleChange}
              />

              <span>
                Company property removed or
                secured.
              </span>
            </label>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>07</span>

            <div>
              <h2>
                Key Handover
              </h2>
            </div>
          </div>

          <div className="key-return-box">
            <FaKey />

            <div className="form-grid">
              <label className="confirmation-check">
                <input
                  type="checkbox"
                  name="keysReturned"
                  checked={
                    formData.keysReturned
                  }
                  onChange={handleChange}
                />

                <span>
                  Vehicle keys have been
                  returned or secured.
                </span>
              </label>

              <div className="input-group">
                <label>
                  Keys Returned To *
                </label>

                <input
                  required
                  type="text"
                  name="keysReturnedTo"
                  placeholder="Name of person receiving or securing the keys"
                  value={
                    formData.keysReturnedTo
                  }
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>08</span>

            <div>
              <h2>
                Admin / Facilities Manager Record
              </h2>

              <p>
                Record who is completing this
                post-use logbook on behalf of
                the driver.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>
                Completed By *
              </label>

              <div className="input-with-icon">
                <FaUserShield />

                <input
                  required
                  type="text"
                  name="completedBy"
                  placeholder="Admin / Facilities Manager name"
                  value={
                    formData.completedBy
                  }
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="declaration-list">
            <label className="confirmation-check">
              <input
                type="checkbox"
                name="returnConditionConfirmed"
                checked={
                  formData.returnConditionConfirmed
                }
                onChange={handleChange}
              />

              <span>
                I confirm that the post-use
                condition inspection has been
                completed.
              </span>
            </label>

            <label className="confirmation-check">
              <input
                type="checkbox"
                name="vehicleSecuredConfirmed"
                checked={
                  formData.vehicleSecuredConfirmed
                }
                onChange={handleChange}
              />

              <span>
                The vehicle has been parked and
                secured.
              </span>
            </label>

            <label className="confirmation-check">
              <input
                type="checkbox"
                name="informationAccuracyConfirmed"
                checked={
                  formData.informationAccuracyConfirmed
                }
                onChange={handleChange}
              />

              <span>
                This return record is complete
                and accurate.
              </span>
            </label>
          </div>
        </section>

        <div className="form-actions">
          <Link
            to="/"
            className="cancel-button"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="submit-button"
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

export default VehicleReturn;