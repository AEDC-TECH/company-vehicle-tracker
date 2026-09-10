import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  FaArrowLeft,
  FaBuilding,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaIdCard,
  FaMapMarkerAlt,
  FaRoute,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import { lookupVehicleEmployee } from "../lib/employeeLookup";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/EmployeeRequestVehicle.css";

function EmployeeRequestVehicle() {
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [department, setDepartment] = useState("");
  const [purpose, setPurpose] = useState("");
  const [destination, setDestination] = useState("");

  const [departureAt, setDepartureAt] = useState("");
  const [returnAt, setReturnAt] = useState("");

  const [outOfProvince, setOutOfProvince] = useState(false);
  const [itinerary, setItinerary] = useState("");
  const [overnightStay, setOvernightStay] = useState(false);
  const [overnightLocation, setOvernightLocation] = useState("");

  const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const savedEmployeeNumber =
      localStorage.getItem("aedc_employee_number") || "";

    const savedEmployeeName =
      localStorage.getItem("aedc_employee_name") || "";

    if (!savedEmployeeNumber) {
      navigate("/employee", {
        replace: true,
      });

      return;
    }

    setEmployeeNumber(savedEmployeeNumber);
    setEmployeeName(savedEmployeeName);

    loadEmployeeProfile(savedEmployeeNumber);
    loadVehicles();
  }, [navigate]);

  async function loadEmployeeProfile(number) {
    try {
      const driver =
        await lookupVehicleEmployee(
          number
        );

      if (!driver) {
        return;
      }

      if (driver.full_name) {
        setEmployeeName(driver.full_name);

        localStorage.setItem(
          "aedc_employee_name",
          driver.full_name
        );
      }

      if (driver.department) {
        setDepartment(driver.department);
      }
    } catch (error) {
      console.error(
        "Employee profile error:",
        error
      );
    }
  }

  async function loadVehicles() {
    try {
      setLoadingVehicles(true);
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq("active", true)
        .eq("roadworthy", true)
        .order("make", {
          ascending: true,
        })
        .order("model", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setVehicles(data || []);

      const availableVehicles = (data || []).filter(
        (vehicle) => vehicle.status === "available"
      );

      if (availableVehicles.length === 1) {
        setSelectedVehicleId(
          availableVehicles[0].id
        );
      }
    } catch (error) {
      console.error(
        "Vehicle loading error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load company vehicles."
      );
    } finally {
      setLoadingVehicles(false);
    }
  }

  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (vehicle) =>
          vehicle.id === selectedVehicleId
      ),
    [vehicles, selectedVehicleId]
  );

  const availableVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.status === "available"
      ),
    [vehicles]
  );

  function formatStatus(status) {
    if (!status) {
      return "UNKNOWN";
    }

    return status
      .replaceAll("-", " ")
      .toUpperCase();
  }

  function formatOdometer(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "Not recorded";
    }

    return `${number.toLocaleString("en-ZA")} km`;
  }

  function validateForm() {
    if (!employeeNumber.trim()) {
      return "Your employee number could not be identified.";
    }

    if (!employeeName.trim()) {
      return "Enter your full name.";
    }

    if (!department.trim()) {
      return "Enter your department.";
    }

    if (!selectedVehicleId) {
      return "Select the company vehicle you are requesting.";
    }

    if (!selectedVehicle) {
      return "The selected vehicle could not be found.";
    }

    if (!selectedVehicle.active) {
      return "The selected vehicle is not currently active.";
    }

    if (!selectedVehicle.roadworthy) {
      return "The selected vehicle is not currently marked as roadworthy.";
    }

    if (selectedVehicle.status !== "available") {
      return "The selected vehicle is not currently available.";
    }

    if (!purpose.trim()) {
      return "Enter the business purpose for this vehicle request.";
    }

    if (!destination.trim()) {
      return "Enter your destination.";
    }

    if (!departureAt) {
      return "Select the requested departure date and time.";
    }

    if (!returnAt) {
      return "Select the expected return date and time.";
    }

    const departureDate = new Date(departureAt);
    const returnDate = new Date(returnAt);

    if (
      Number.isNaN(departureDate.getTime()) ||
      Number.isNaN(returnDate.getTime())
    ) {
      return "Enter valid departure and return dates.";
    }

    if (returnDate <= departureDate) {
      return "Expected return must be after the departure time.";
    }

    if (outOfProvince && !itinerary.trim()) {
      return "Provide the itinerary for out-of-province travel.";
    }

    if (
      overnightStay &&
      !overnightLocation.trim()
    ) {
      return "Enter the proposed overnight parking location.";
    }

    if (!accuracyConfirmed) {
      return "Confirm that the request information is complete and accurate.";
    }

    return "";
  }

  async function checkSchedulingConflict() {
    const {
      data,
      error,
    } = await supabase
      .from("vehicle_requests")
      .select(
        `
          id,
          booking_reference,
          status,
          requested_departure_at,
          requested_return_at
        `
      )
      .eq("vehicle_id", selectedVehicleId)
      .in("status", [
        "pending",
        "approved",
      ])
      .lt("requested_departure_at", returnAt)
      .gt("requested_return_at", departureAt);

    if (error) {
      throw error;
    }

    return data || [];
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setSubmitting(true);

      /*
       * Check the vehicle again immediately before
       * creating the request.
       */
      const {
        data: currentVehicle,
        error: vehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", selectedVehicleId)
        .single();

      if (vehicleError) {
        throw vehicleError;
      }

      if (!currentVehicle.active) {
        throw new Error(
          "This vehicle has been deactivated and cannot be requested."
        );
      }

      if (!currentVehicle.roadworthy) {
        throw new Error(
          "This vehicle is not currently marked as roadworthy."
        );
      }

      if (
        currentVehicle.status !== "available"
      ) {
        throw new Error(
          "This vehicle is no longer available. Please select another vehicle."
        );
      }

      /*
       * Prevent obvious overlapping bookings.
       *
       * Pending requests are included so employees
       * can see that another booking is already being
       * considered for the same period.
       */
      const conflicts =
        await checkSchedulingConflict();

      if (conflicts.length > 0) {
        const conflict =
          conflicts[0];

        throw new Error(
          `This vehicle already has a ${conflict.status} request that overlaps with your requested dates${
            conflict.booking_reference
              ? ` (${conflict.booking_reference})`
              : ""
          }. Please choose another vehicle or different dates.`
        );
      }

      const {
        data: request,
        error: requestError,
      } = await supabase
        .from("vehicle_requests")
        .insert({
          vehicle_id:
            selectedVehicleId,

          requested_driver_name:
            employeeName.trim(),

          employee_number:
            employeeNumber.trim(),

          department:
            department.trim(),

          purpose:
            purpose.trim(),

          destination:
            destination.trim(),

          requested_departure_at:
            departureAt,

          requested_return_at:
            returnAt,

          out_of_province:
            outOfProvince,

          itinerary:
            outOfProvince
              ? itinerary.trim()
              : null,

          overnight_location:
            overnightStay
              ? overnightLocation.trim()
              : null,

          status: "pending",

          request_source:
            "employee",

          submitted_by_name:
            employeeName.trim(),

          submitted_by_role:
            "employee",

          submitted_on_behalf:
            false,
        })
        .select("*")
        .single();

      if (requestError) {
        throw requestError;
      }

      setSuccessMessage(
        request?.booking_reference
          ? `Request ${request.booking_reference} submitted successfully.`
          : "Vehicle request submitted successfully."
      );

      window.setTimeout(() => {
        navigate("/employee", {
          replace: true,
        });
      }, 1000);
    } catch (error) {
      console.error(
        "Employee vehicle request error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to submit your vehicle request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="employee-request-page">
      {/* ================================================
          HEADER
      ================================================ */}

      <header className="employee-request-header">
        <div className="employee-request-header-inner">
          <div className="employee-request-header-left">
            <Link
              to="/employee"
              className="employee-request-back"
              aria-label="Back to employee portal"
            >
              <FaArrowLeft />
            </Link>

            <AEDCLogo
              compact
              className="employee-request-logo"
            />

            <div>
              <span>
                AEDC VEHICLE MANAGEMENT
              </span>

              <h1>
                Request Company Vehicle
              </h1>

              <p>
                Employee Vehicle Portal
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="employee-request-content">
        {/* ================================================
            INTRO
        ================================================ */}

        <section className="employee-request-intro">
          <span>
            VEHICLE BOOKING REQUEST
          </span>

          <h2>
            Request a Company Vehicle
          </h2>

          <p>
            Complete the information below.
            Your request will be sent to the
            Facilities Manager for approval.
          </p>
        </section>

        {/* ================================================
            MESSAGES
        ================================================ */}

        {errorMessage && (
          <div className="employee-request-message employee-request-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="employee-request-message employee-request-success">
            <FaCheckCircle />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="employee-request-form"
        >
          {/* ==============================================
              EMPLOYEE
          ============================================== */}

          <section className="employee-request-card">
            <div className="employee-request-card-heading">
              <div className="employee-request-section-icon">
                <FaUser />
              </div>

              <div>
                <span>
                  SECTION 01
                </span>

                <h3>
                  Employee Details
                </h3>

                <p>
                  Details of the employee
                  requesting the vehicle.
                </p>
              </div>
            </div>

            <div className="employee-request-grid">
              <div className="employee-request-field">
                <label>
                  Full Name
                  <strong>*</strong>
                </label>

                <div className="employee-request-input-icon">
                  <FaUser />

                  <input
                    type="text"
                    value={employeeName}
                    onChange={(event) => {
                      setEmployeeName(
                        event.target.value
                      );

                      localStorage.setItem(
                        "aedc_employee_name",
                        event.target.value
                      );
                    }}
                    placeholder="Employee full name"
                    required
                  />
                </div>
              </div>

              <div className="employee-request-field">
                <label>
                  Employee Number
                </label>

                <div className="employee-request-input-icon employee-request-readonly">
                  <FaIdCard />

                  <input
                    type="text"
                    value={employeeNumber}
                    readOnly
                  />
                </div>
              </div>

              <div className="employee-request-field employee-request-field-full">
                <label>
                  Department
                  <strong>*</strong>
                </label>

                <div className="employee-request-input-icon">
                  <FaBuilding />

                  <input
                    type="text"
                    value={department}
                    onChange={(event) =>
                      setDepartment(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Research and Innovation"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ==============================================
              VEHICLE
          ============================================== */}

          <section className="employee-request-card">
            <div className="employee-request-card-heading">
              <div className="employee-request-section-icon">
                <FaCar />
              </div>

              <div>
                <span>
                  SECTION 02
                </span>

                <h3>
                  Select Vehicle
                </h3>

                <p>
                  Only active, roadworthy
                  vehicles are displayed.
                </p>
              </div>
            </div>

            {loadingVehicles ? (
              <div className="employee-request-loading">
                Loading available vehicles...
              </div>
            ) : availableVehicles.length === 0 ? (
              <div className="employee-request-no-vehicles">
                <FaExclamationTriangle />

                <div>
                  <strong>
                    No vehicles currently available
                  </strong>

                  <p>
                    There are no active,
                    roadworthy vehicles marked
                    as available at the moment.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="employee-request-field">
                  <label>
                    Company Vehicle
                    <strong>*</strong>
                  </label>

                  <select
                    value={selectedVehicleId}
                    onChange={(event) =>
                      setSelectedVehicleId(
                        event.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select a vehicle
                    </option>

                    {availableVehicles.map(
                      (vehicle) => (
                        <option
                          key={vehicle.id}
                          value={vehicle.id}
                        >
                          {vehicle.make}{" "}
                          {vehicle.model}
                          {vehicle.registration
                            ? ` — ${vehicle.registration}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {selectedVehicle && (
                  <div className="employee-selected-vehicle">
                    <div className="employee-selected-car-icon">
                      <FaCar />
                    </div>

                    <div className="employee-selected-vehicle-main">
                      <span>
                        SELECTED VEHICLE
                      </span>

                      <h4>
                        {selectedVehicle.make}{" "}
                        {selectedVehicle.model}
                      </h4>

                      <p>
                        {selectedVehicle.registration ||
                          "Registration not recorded"}
                      </p>
                    </div>

                    <div className="employee-selected-vehicle-info">
                      <div>
                        <span>
                          Status
                        </span>

                        <strong>
                          {formatStatus(
                            selectedVehicle.status
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Odometer
                        </span>

                        <strong>
                          {formatOdometer(
                            selectedVehicle.current_odometer
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Parking
                        </span>

                        <strong>
                          {selectedVehicle.default_parking ||
                            "Office Basement"}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ==============================================
              JOURNEY
          ============================================== */}

          <section className="employee-request-card">
            <div className="employee-request-card-heading">
              <div className="employee-request-section-icon">
                <FaRoute />
              </div>

              <div>
                <span>
                  SECTION 03
                </span>

                <h3>
                  Journey Details
                </h3>

                <p>
                  The approved journey must
                  match the actual company
                  vehicle use.
                </p>
              </div>
            </div>

            <div className="employee-request-grid">
              <div className="employee-request-field employee-request-field-full">
                <label>
                  Business Purpose
                  <strong>*</strong>
                </label>

                <textarea
                  value={purpose}
                  onChange={(event) =>
                    setPurpose(
                      event.target.value
                    )
                  }
                  placeholder="Explain the legitimate business purpose for using the vehicle..."
                  rows="4"
                  required
                />
              </div>

              <div className="employee-request-field employee-request-field-full">
                <label>
                  Destination
                  <strong>*</strong>
                </label>

                <div className="employee-request-input-icon">
                  <FaMapMarkerAlt />

                  <input
                    type="text"
                    value={destination}
                    onChange={(event) =>
                      setDestination(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Pretoria — Client Meeting"
                    required
                  />
                </div>
              </div>

              <div className="employee-request-field">
                <label>
                  Requested Departure
                  <strong>*</strong>
                </label>

                <div className="employee-request-input-icon">
                  <FaCalendarAlt />

                  <input
                    type="datetime-local"
                    value={departureAt}
                    onChange={(event) =>
                      setDepartureAt(
                        event.target.value
                      )
                    }
                    required
                  />
                </div>
              </div>

              <div className="employee-request-field">
                <label>
                  Expected Return
                  <strong>*</strong>
                </label>

                <div className="employee-request-input-icon">
                  <FaCalendarAlt />

                  <input
                    type="datetime-local"
                    value={returnAt}
                    onChange={(event) =>
                      setReturnAt(
                        event.target.value
                      )
                    }
                    min={departureAt || undefined}
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ==============================================
              OUT OF PROVINCE
          ============================================== */}

          <section className="employee-request-card">
            <div className="employee-request-card-heading">
              <div className="employee-request-section-icon">
                <FaMapMarkerAlt />
              </div>

              <div>
                <span>
                  SECTION 04
                </span>

                <h3>
                  Travel Requirements
                </h3>

                <p>
                  Additional information is
                  required for out-of-province
                  or overnight vehicle use.
                </p>
              </div>
            </div>

            <label className="employee-request-checkbox-row">
              <input
                type="checkbox"
                checked={outOfProvince}
                onChange={(event) => {
                  const checked =
                    event.target.checked;

                  setOutOfProvince(checked);

                  if (!checked) {
                    setItinerary("");
                    setOvernightStay(false);
                    setOvernightLocation("");
                  }
                }}
              />

              <div>
                <strong>
                  This trip will travel
                  outside Gauteng
                </strong>

                <span>
                  Out-of-province travel
                  requires prior approval.
                </span>
              </div>
            </label>

            {outOfProvince && (
              <div className="employee-request-conditional">
                <div className="employee-request-field">
                  <label>
                    Travel Itinerary
                    <strong>*</strong>
                  </label>

                  <textarea
                    value={itinerary}
                    onChange={(event) =>
                      setItinerary(
                        event.target.value
                      )
                    }
                    placeholder="Provide the planned route, destinations and travel schedule..."
                    rows="4"
                    required
                  />
                </div>

                <label className="employee-request-checkbox-row">
                  <input
                    type="checkbox"
                    checked={overnightStay}
                    onChange={(event) => {
                      const checked =
                        event.target.checked;

                      setOvernightStay(
                        checked
                      );

                      if (!checked) {
                        setOvernightLocation(
                          ""
                        );
                      }
                    }}
                  />

                  <div>
                    <strong>
                      Vehicle will be kept
                      overnight
                    </strong>

                    <span>
                      Overnight use requires
                      prior approval and secure
                      parking.
                    </span>
                  </div>
                </label>

                {overnightStay && (
                  <div className="employee-request-field">
                    <label>
                      Proposed Overnight Parking
                      Location
                      <strong>*</strong>
                    </label>

                    <input
                      type="text"
                      value={overnightLocation}
                      onChange={(event) =>
                        setOvernightLocation(
                          event.target.value
                        )
                      }
                      placeholder="Enter secure overnight parking location"
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ==============================================
              DECLARATION
          ============================================== */}

          <section className="employee-request-card">
            <div className="employee-request-card-heading">
              <div className="employee-request-section-icon">
                <FaCheckCircle />
              </div>

              <div>
                <span>
                  SECTION 05
                </span>

                <h3>
                  Request Declaration
                </h3>
              </div>
            </div>

            <div className="employee-request-policy-note">
              <FaExclamationTriangle />

              <p>
                Submission of this request
                does not authorize collection
                or use of the vehicle. The
                Facilities Manager must first
                approve the booking. A
                mandatory pre-use inspection
                must then be completed before
                the vehicle is taken.
              </p>
            </div>

            <label className="employee-request-declaration">
              <input
                type="checkbox"
                checked={accuracyConfirmed}
                onChange={(event) =>
                  setAccuracyConfirmed(
                    event.target.checked
                  )
                }
              />

              <span>
                I confirm that the information
                provided in this request is
                complete and accurate and that
                the vehicle will only be used
                for the approved business
                purpose.
              </span>
            </label>
          </section>

          {/* ==============================================
              SUBMIT
          ============================================== */}

          <div className="employee-request-form-actions">
            <Link
              to="/employee"
              className="employee-request-cancel"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="employee-request-submit"
              disabled={
                submitting ||
                loadingVehicles ||
                availableVehicles.length === 0
              }
            >
              <FaCheckCircle />

              {submitting
                ? "Submitting Request..."
                : "Submit Vehicle Request"}
            </button>
          </div>
        </form>
      </section>

      <footer className="employee-request-footer">
        AEDC Company Vehicle Management System
      </footer>
    </main>
  );
}

export default EmployeeRequestVehicle;