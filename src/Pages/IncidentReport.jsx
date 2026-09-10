import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaCamera,
  FaCar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import VehicleEvidenceUpload from "../Components/VehicleEvidenceUpload";

import "../Styles/VehicleForms.css";

function IncidentReport() {
  const { tripId } = useParams();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const openedFromAdmin =
    searchParams.get("from") === "admin";

  const historyRoute = openedFromAdmin
    ? "/history"
    : "/employee/my-history";

  const dashboardRoute = openedFromAdmin
    ? "/"
    : "/employee";

  const [trip, setTrip] =
    useState(null);

  const [vehicle, setVehicle] =
    useState(null);

  const [
    existingIncident,
    setExistingIncident,
  ] = useState(null);

  const [
    createdIncident,
    setCreatedIncident,
  ] = useState(null);

  const [
    evidenceCount,
    setEvidenceCount,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [
    finishingEvidence,
    setFinishingEvidence,
  ] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [formData, setFormData] =
    useState({
      incidentType: "damage",

      incidentDate: "",

      incidentTime: "",

      location: "",

      description: "",

      injuriesReported: "no",

      emergencyServicesContacted:
        "no",

      facilitiesManagerNotified:
        "no",

      managerNotificationDate: "",

      managerNotificationTime: "",

      policeReported: "no",

      policeStation: "",

      policeCaseNumber: "",

      thirdPartyDetails: "",

      witnessDetails: "",

      thirdPartyInsuranceDetails: "",

      confirmation: false,
    });

  useEffect(() => {
    loadIncidentContext();
  }, [tripId]);

  async function loadIncidentContext() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: tripData,
        error: tripError,
      } = await supabase
        .from("vehicle_trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (tripError) {
        throw tripError;
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

      const {
        data: incidentData,
        error: incidentError,
      } = await supabase
        .from("vehicle_incidents")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (incidentError) {
        throw incidentError;
      }

      setExistingIncident(
        incidentData
      );

      if (incidentData) {
        await loadEvidenceCount(
          incidentData.id
        );

        return;
      }

      const now = new Date();

      const date =
        now.toISOString().split("T")[0];

      const time =
        now
          .toTimeString()
          .slice(0, 5);

      let suggestedType = "damage";

      if (
        tripData.mechanical_issue_reported
      ) {
        suggestedType =
          "mechanical-fault";
      } else if (
        tripData.warning_light_reported
      ) {
        suggestedType =
          "warning-light";
      } else if (
        tripData.new_damage
      ) {
        suggestedType = "damage";
      }

      let suggestedDescription = "";

      if (
        tripData.new_damage_description
      ) {
        suggestedDescription +=
          `Damage: ${tripData.new_damage_description}`;
      }

      if (
        tripData.warning_light_description
      ) {
        suggestedDescription += `${
          suggestedDescription
            ? "\n\n"
            : ""
        }Warning light: ${tripData.warning_light_description}`;
      }

      if (
        tripData.mechanical_issue_description
      ) {
        suggestedDescription += `${
          suggestedDescription
            ? "\n\n"
            : ""
        }Mechanical issue: ${tripData.mechanical_issue_description}`;
      }

      setFormData((previous) => ({
        ...previous,

        incidentType:
          suggestedType,

        incidentDate:
          date,

        incidentTime:
          time,

        location:
          tripData.return_parking_location ||
          "",

        description:
          suggestedDescription,
      }));
    } catch (error) {
      console.error(
        "Incident context error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load incident information."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadEvidenceCount(
    incidentId
  ) {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("vehicle_evidence")
        .select("id")
        .eq(
          "incident_id",
          incidentId
        );

      if (error) {
        throw error;
      }

      setEvidenceCount(
        (data || []).length
      );
    } catch (error) {
      console.error(
        "Incident evidence count error:",
        error
      );
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

  const vehicleName = useMemo(() => {
    if (!vehicle) {
      return "Company Vehicle";
    }

    const make =
      vehicle.make?.trim() || "";

    const model =
      vehicle.model?.trim() || "";

    return (
      `${make} ${model}`.trim() ||
      "Company Vehicle"
    );
  }, [vehicle]);

  function formatDate(value) {
    if (!value) {
      return "Not recorded";
    }

    return new Date(
      value
    ).toLocaleString(
      "en-ZA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function formatStatus(value) {
    if (!value) {
      return "NOT RECORDED";
    }

    return value
      .replaceAll("-", " ")
      .toUpperCase();
  }

  function incidentNeedsEvidence(
    type
  ) {
    return [
      "accident",
      "collision",
      "damage",
      "theft",
      "break-in",
    ].includes(type);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!trip || !vehicle) {
      return;
    }

    if (
      !formData.description.trim()
    ) {
      alert(
        "Please provide a full description of the incident."
      );

      return;
    }

    if (!formData.confirmation) {
      alert(
        "Please confirm that the incident report is complete and accurate."
      );

      return;
    }

    const incidentAt =
      new Date(
        `${formData.incidentDate}T${formData.incidentTime}`
      );

    if (
      Number.isNaN(
        incidentAt.getTime()
      )
    ) {
      alert(
        "Please enter a valid incident date and time."
      );

      return;
    }

    if (
      incidentAt.getTime() >
      Date.now()
    ) {
      alert(
        "The incident date and time cannot be in the future."
      );

      return;
    }

    let managerNotifiedAt = null;

    if (
      formData.facilitiesManagerNotified ===
      "yes"
    ) {
      if (
        !formData.managerNotificationDate ||
        !formData.managerNotificationTime
      ) {
        alert(
          "Please record when the Facilities Manager was notified."
        );

        return;
      }

      const notificationDateTime =
        new Date(
          `${formData.managerNotificationDate}T${formData.managerNotificationTime}`
        );

      if (
        Number.isNaN(
          notificationDateTime.getTime()
        )
      ) {
        alert(
          "Please provide a valid Facilities Manager notification date and time."
        );

        return;
      }

      managerNotifiedAt =
        notificationDateTime.toISOString();
    }

    if (
      formData.policeReported ===
        "yes" &&
      !formData.policeCaseNumber.trim()
    ) {
      const continueSubmit =
        window.confirm(
          "Reported to SAPS is set to Yes but no case/reference number has been entered. Continue?"
        );

      if (!continueSubmit) {
        return;
      }
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      /*
       * Check again immediately before
       * inserting so that a second incident
       * cannot accidentally be created from
       * another browser tab.
       */
      const {
        data: duplicateIncident,
        error: duplicateError,
      } = await supabase
        .from("vehicle_incidents")
        .select("id")
        .eq("trip_id", trip.id)
        .limit(1)
        .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateIncident) {
        throw new Error(
          "An incident report already exists for this trip."
        );
      }

      const {
        data: incident,
        error: incidentError,
      } = await supabase
        .from("vehicle_incidents")
        .insert({
          trip_id:
            trip.id,

          vehicle_id:
            vehicle.id,

          driver_id:
            trip.driver_id || null,

          /*
           * Confirmed against the actual
           * vehicle_incidents table.
           */
          incident_type:
            formData.incidentType,

          incident_at:
            incidentAt.toISOString(),

          location:
            formData.location.trim() ||
            null,

          description:
            formData.description.trim(),

          injuries_reported:
            formData.injuriesReported ===
            "yes",

          emergency_services_contacted:
            formData.emergencyServicesContacted ===
            "yes",

          facilities_manager_notified:
            formData.facilitiesManagerNotified ===
            "yes",

          facilities_manager_notified_at:
            managerNotifiedAt,

          police_reported:
            formData.policeReported ===
            "yes",

          police_station:
            formData.policeReported ===
            "yes"
              ? formData.policeStation.trim() ||
                null
              : null,

          police_case_number:
            formData.policeReported ===
            "yes"
              ? formData.policeCaseNumber.trim() ||
                null
              : null,

          third_party_details:
            formData.thirdPartyDetails.trim() ||
            null,

          witness_details:
            formData.witnessDetails.trim() ||
            null,

          third_party_insurance_details:
            formData.thirdPartyInsuranceDetails.trim() ||
            null,

          investigation_status:
            "pending",

          resolved: false,
        })
        .select()
        .single();

      if (incidentError) {
        throw incidentError;
      }

      const {
        error: tripUpdateError,
      } = await supabase
        .from("vehicle_trips")
        .update({
          status:
            "incident-open",
        })
        .eq("id", trip.id);

      if (tripUpdateError) {
        throw tripUpdateError;
      }

      const {
        error: vehicleUpdateError,
      } = await supabase
        .from("vehicles")
        .update({
          status:
            "unavailable",
        })
        .eq(
          "id",
          vehicle.id
        );

      if (vehicleUpdateError) {
        throw vehicleUpdateError;
      }

      setCreatedIncident(
        incident
      );

      setExistingIncident(
        incident
      );

      await loadEvidenceCount(
        incident.id
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Incident submit error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to submit incident report."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleEvidenceUploaded(
    files
  ) {
    setEvidenceCount(
      (current) =>
        current + files.length
    );
  }

  async function finishIncidentReport() {
    const incident =
      createdIncident ||
      existingIncident;

    if (!incident) {
      return;
    }

    if (
      incidentNeedsEvidence(
        incident.incident_type
      ) &&
      evidenceCount === 0
    ) {
      alert(
        "Please upload at least one incident photograph before completing this incident report."
      );

      return;
    }

    try {
      setFinishingEvidence(true);

      alert(
        `Incident report completed successfully.\n\nVehicle: ${vehicleName}\n\nThe vehicle remains UNAVAILABLE pending Facilities Management review.`
      );

      navigate(dashboardRoute);
    } finally {
      setFinishingEvidence(false);
    }
  }

  if (loading) {
    return (
      <main className="vehicle-form-page">
        <div className="page-loading">
          Loading incident report...
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
              Incident Report Unavailable
            </h2>

            <p>{errorMessage}</p>

            <Link
              to={historyRoute}
              className="submit-button button-link"
            >
              Usage History
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Once the incident exists we move to the
   * evidence stage instead of allowing the
   * incident form to be submitted twice.
   */
  if (existingIncident) {
    const currentIncident =
      createdIncident ||
      existingIncident;

    const evidenceRequired =
      incidentNeedsEvidence(
        currentIncident.incident_type
      );

    return (
      <main className="vehicle-form-page">
        <header className="form-header">
          <div className="form-header-inner">
            <Link
              to={historyRoute}
              className="back-button"
            >
              <FaArrowLeft />
              History
            </Link>

            <div className="form-brand">
              <FaExclamationTriangle />

              <span>
                AEDC Incident Record
              </span>
            </div>
          </div>
        </header>

        <section className="form-hero incident-hero">
          <div className="form-hero-inner">
            <span>
              INCIDENT RECORDED
            </span>

            <h1>
              Incident Evidence
            </h1>

            <p>
              The incident has been recorded.
              Add the required photographs or
              supporting evidence before
              finishing.
            </p>
          </div>
        </section>

        <div className="vehicle-form">
          <section className="form-card">
            <span className="booking-reference">
              {trip.booking_reference ||
                "INCIDENT RECORD"}
            </span>

            <h2>
              {vehicleName}
            </h2>

            <div className="request-info-grid">
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
                  Incident Type
                </span>

                <strong>
                  {formatStatus(
                    currentIncident.incident_type
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Incident Date
                </span>

                <strong>
                  {formatDate(
                    currentIncident.incident_at
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Vehicle Status
                </span>

                <strong>
                  {formatStatus(
                    vehicle.status
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Investigation
                </span>

                <strong>
                  {formatStatus(
                    currentIncident.investigation_status
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Resolved
                </span>

                <strong>
                  {currentIncident.resolved
                    ? "YES"
                    : "NO"}
                </strong>
              </div>
            </div>

            <div className="logbook-note">
              <strong>
                Incident Description
              </strong>

              <p>
                {
                  currentIncident.description
                }
              </p>
            </div>
          </section>

          <section className="form-card">
            <div className="form-section-heading">
              <span>
                <FaCamera />
              </span>

              <div>
                <h2>
                  Incident Evidence
                </h2>

                <p>
                  Upload photographs or
                  supporting evidence relating
                  to this incident.
                </p>
              </div>
            </div>

            {evidenceRequired && (
              <div className="damage-warning">
                <FaExclamationTriangle />

                <div>
                  <strong>
                    Photograph required
                  </strong>

                  <p>
                    At least one photograph is
                    required for this type of
                    incident.
                  </p>
                </div>
              </div>
            )}

            <VehicleEvidenceUpload
              vehicleId={vehicle.id}
              tripId={trip.id}
              requestId={
                trip.request_id ||
                null
              }
              incidentId={
                currentIncident.id
              }
              stage="incident"
              type="incident-photo"
              title="Incident Photographs"
              description="Upload clear photographs showing the incident, damage, vehicle condition, scene or other relevant evidence."
              onUploaded={
                handleEvidenceUploaded
              }
            />

            <VehicleEvidenceUpload
              vehicleId={vehicle.id}
              tripId={trip.id}
              requestId={
                trip.request_id ||
                null
              }
              incidentId={
                currentIncident.id
              }
              stage="incident"
              type="incident-document"
              title="Supporting Documents"
              description="Upload any supporting image or PDF evidence such as a SAPS reference, third-party document or other incident record."
              onUploaded={
                handleEvidenceUploaded
              }
            />

            <div className="logbook-note">
              <strong>
                Evidence Recorded
              </strong>

              <p>
                {evidenceCount}{" "}
                {evidenceCount === 1
                  ? "file"
                  : "files"}{" "}
                currently linked to this
                incident.
              </p>
            </div>
          </section>

          <div className="form-actions">
            <Link
              to={historyRoute}
              className="cancel-button"
            >
              History
            </Link>

            <button
              type="button"
              disabled={
                finishingEvidence
              }
              className="submit-button"
              onClick={
                finishIncidentReport
              }
            >
              <FaCheckCircle />

              {finishingEvidence
                ? "Finishing..."
                : "Finish Incident Report"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="vehicle-form-page">
      <header className="form-header">
        <div className="form-header-inner">
          <Link
            to={historyRoute}
            className="back-button"
          >
            <FaArrowLeft />
            History
          </Link>

          <div className="form-brand">
            <FaExclamationTriangle />

            <span>
              AEDC Incident Report
            </span>
          </div>
        </div>
      </header>

      <section className="form-hero incident-hero">
        <div className="form-hero-inner">
          <span>
            VEHICLE INCIDENT
          </span>

          <h1>
            Report an Incident
          </h1>

          <p>
            Record the incident fully and
            accurately for Facilities
            Management review.
          </p>
        </div>
      </section>

      <form
        className="vehicle-form"
        onSubmit={handleSubmit}
      >
        {errorMessage && (
          <div className="damage-warning">
            <FaExclamationTriangle />

            <div>
              <strong>
                Unable to submit incident
              </strong>

              <p>
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        <section className="form-card incident-trip-summary">
          <span className="booking-reference">
            {trip.booking_reference ||
              "ACTIVE TRIP"}
          </span>

          <h2>
            {vehicleName}
          </h2>

          <div className="request-info-grid">
            <div>
              <span>
                Registration
              </span>

              <strong>
                {vehicle.registration ||
                  vehicle.registration_number ||
                  "Not recorded"}
              </strong>
            </div>

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
                Destination
              </span>

              <strong>
                {trip.destination}
              </strong>
            </div>

            <div>
              <span>
                Return
              </span>

              <strong>
                {formatDate(
                  trip.returned_at
                )}
              </strong>
            </div>

            <div>
              <span>
                Vehicle Status
              </span>

              <strong>
                {formatStatus(
                  vehicle.status
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>01</span>

            <div>
              <h2>
                Incident Details
              </h2>

              <p>
                Identify what happened, when
                and where.
              </p>
            </div>
          </div>

          <div className="form-grid two-columns">
            <div className="input-group">
              <label>
                Incident Type *
              </label>

              <select
                required
                name="incidentType"
                value={
                  formData.incidentType
                }
                onChange={handleChange}
              >
                <option value="accident">
                  Accident
                </option>

                <option value="collision">
                  Collision
                </option>

                <option value="damage">
                  Vehicle Damage
                </option>

                <option value="theft">
                  Theft
                </option>

                <option value="break-in">
                  Break-In
                </option>

                <option value="mechanical-fault">
                  Mechanical Fault
                </option>

                <option value="warning-light">
                  Warning Light
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div className="input-group">
              <label>
                Location
              </label>

              <div className="input-with-icon">
                <FaMapMarkerAlt />

                <input
                  type="text"
                  name="location"
                  value={
                    formData.location
                  }
                  onChange={handleChange}
                  placeholder="Where did the incident occur?"
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                Incident Date *
              </label>

              <input
                required
                type="date"
                name="incidentDate"
                value={
                  formData.incidentDate
                }
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>
                Incident Time *
              </label>

              <input
                required
                type="time"
                name="incidentTime"
                value={
                  formData.incidentTime
                }
                onChange={handleChange}
              />
            </div>

            <div className="input-group full-width">
              <label>
                Full Incident Description *
              </label>

              <textarea
                required
                rows="6"
                name="description"
                value={
                  formData.description
                }
                onChange={handleChange}
                placeholder="Explain exactly what happened, including the sequence of events and damage or faults observed."
              />
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>02</span>

            <div>
              <h2>
                Safety Response
              </h2>

              <p>
                Record injuries and emergency
                response where applicable.
              </p>
            </div>
          </div>

          <div className="form-grid two-columns">
            <div className="input-group">
              <label>
                Injuries Reported?
              </label>

              <select
                name="injuriesReported"
                value={
                  formData.injuriesReported
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

            <div className="input-group">
              <label>
                Emergency Services Contacted?
              </label>

              <select
                name="emergencyServicesContacted"
                value={
                  formData.emergencyServicesContacted
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
          </div>

          {formData.injuriesReported ===
            "yes" && (
            <div className="incident-critical-warning">
              <FaExclamationTriangle />

              <div>
                <strong>
                  Injury Recorded
                </strong>

                <p>
                  Ensure all required
                  emergency, company and
                  insurance reporting
                  procedures have been
                  followed.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>03</span>

            <div>
              <h2>
                Facilities Manager Notification
              </h2>

              <p>
                Record whether Facilities
                Management has been notified.
              </p>
            </div>
          </div>

          <div className="form-grid two-columns">
            <div className="input-group">
              <label>
                Facilities Manager Notified? *
              </label>

              <select
                name="facilitiesManagerNotified"
                value={
                  formData.facilitiesManagerNotified
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

            {formData.facilitiesManagerNotified ===
              "yes" && (
              <>
                <div className="input-group">
                  <label>
                    Notification Date *
                  </label>

                  <input
                    required
                    type="date"
                    name="managerNotificationDate"
                    value={
                      formData.managerNotificationDate
                    }
                    onChange={handleChange}
                  />
                </div>

                <div className="input-group">
                  <label>
                    Notification Time *
                  </label>

                  <input
                    required
                    type="time"
                    name="managerNotificationTime"
                    value={
                      formData.managerNotificationTime
                    }
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>04</span>

            <div>
              <h2>
                Police / SAPS Details
              </h2>

              <p>
                Complete this where police
                reporting is applicable.
              </p>
            </div>
          </div>

          <div className="form-grid two-columns">
            <div className="input-group">
              <label>
                Reported to SAPS / Police?
              </label>

              <select
                name="policeReported"
                value={
                  formData.policeReported
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

            {formData.policeReported ===
              "yes" && (
              <>
                <div className="input-group">
                  <label>
                    Police Station
                  </label>

                  <input
                    type="text"
                    name="policeStation"
                    value={
                      formData.policeStation
                    }
                    onChange={handleChange}
                    placeholder="Police station"
                  />
                </div>

                <div className="input-group full-width">
                  <label>
                    SAPS Case / Reference Number
                  </label>

                  <input
                    type="text"
                    name="policeCaseNumber"
                    value={
                      formData.policeCaseNumber
                    }
                    onChange={handleChange}
                    placeholder="Case or reference number"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>05</span>

            <div>
              <h2>
                Third Parties & Witnesses
              </h2>

              <p>
                Record relevant parties where
                another vehicle or person was
                involved.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>
                Third-Party Details
              </label>

              <textarea
                rows="4"
                name="thirdPartyDetails"
                value={
                  formData.thirdPartyDetails
                }
                onChange={handleChange}
                placeholder="Names, contact numbers, vehicle registrations and other relevant details"
              />
            </div>

            <div className="input-group">
              <label>
                Third-Party Insurance Details
              </label>

              <textarea
                rows="3"
                name="thirdPartyInsuranceDetails"
                value={
                  formData.thirdPartyInsuranceDetails
                }
                onChange={handleChange}
                placeholder="Insurer, policy information or other available details"
              />
            </div>

            <div className="input-group">
              <label>
                Witness Details
              </label>

              <textarea
                rows="3"
                name="witnessDetails"
                value={
                  formData.witnessDetails
                }
                onChange={handleChange}
                placeholder="Witness names and contact information"
              />
            </div>
          </div>
        </section>

        <section className="confirmation-card">
          <div className="confirmation-icon">
            <FaCheckCircle />
          </div>

          <label className="confirmation-check">
            <input
              type="checkbox"
              name="confirmation"
              checked={
                formData.confirmation
              }
              onChange={handleChange}
            />

            <span>
              I confirm that this incident
              report is complete, honest and
              accurate to the best of my
              knowledge.
            </span>
          </label>
        </section>

        <div className="form-actions">
          <Link
            to={historyRoute}
            className="cancel-button"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="submit-button"
          >
            <FaExclamationTriangle />

            {submitting
              ? "Recording Incident..."
              : "Record Incident & Continue"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default IncidentReport;