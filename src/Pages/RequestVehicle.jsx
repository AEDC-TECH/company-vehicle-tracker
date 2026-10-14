import { useEffect, useMemo, useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import "../Styles/VehicleForms.css";

function RequestVehicle() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    employeeLookupLoading,
    setEmployeeLookupLoading,
  ] = useState(false);

  const [
    employeeLookupMessage,
    setEmployeeLookupMessage,
  ] = useState("");

  const [
    employeeFound,
    setEmployeeFound,
  ] = useState(false);


  const [formData, setFormData] = useState({
    driverName: "",
    employeeNumber: "",
    department: "",
    purpose: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    outOfProvince: "no",
    itinerary: "",
    overnightLocation: "",
    confirmation: false,
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("active", true)
        .order("make", {
          ascending: true,
        })
        .order("model", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      const vehicleList = data || [];

      setVehicles(vehicleList);

      /*
       * Automatically select the first
       * available and roadworthy vehicle.
       *
       * If none are available, Admin can
       * still see the fleet and choose an
       * appropriate vehicle once its status
       * changes.
       */
      const preferredVehicle =
        vehicleList.find(
          (vehicle) =>
            vehicle.status === "available" &&
            vehicle.roadworthy !== false
        );

      if (preferredVehicle) {
        setSelectedVehicleId(
          preferredVehicle.id
        );
      } else if (vehicleList.length === 1) {
        setSelectedVehicleId(
          vehicleList[0].id
        );
      }
    } catch (error) {
      console.error(
        "Vehicle loading error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load AEDC vehicles."
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (vehicle) =>
          vehicle.id === selectedVehicleId
      ) || null,
    [vehicles, selectedVehicleId]
  );

  const availableVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.status === "available" &&
          vehicle.roadworthy !== false
      ),
    [vehicles]
  );

  function vehicleName(vehicle) {
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
  }

  function vehicleRegistration(vehicle) {
    return (
      vehicle?.registration ||
      vehicle?.registration_number ||
      "Not recorded"
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

  /*
   * =========================================================
   * ADMIN EMPLOYEE LOOKUP
   *
   * Admin enters the employee/work number.
   * The employee register becomes the source of truth for:
   *
   * - full name
   * - department
   * - active status
   *
   * A 500ms debounce prevents unnecessary database calls
   * while the admin is still typing.
   * =========================================================
   */

  useEffect(() => {
    const rawEmployeeNumber =
      formData.employeeNumber.trim();

    let cancelled = false;


    /*
     * No employee number entered.
     */

    if (!rawEmployeeNumber) {
      setEmployeeLookupLoading(false);

      setEmployeeLookupMessage("");

      setEmployeeFound(false);


      setFormData(
        (current) => ({
          ...current,

          driverName: "",

          department: "",
        })
      );


      return undefined;
    }


    /*
     * The work number changed.
     *
     * Immediately clear details belonging
     * to the previously selected employee.
     */

    setEmployeeFound(false);

    setEmployeeLookupMessage("");


    setFormData(
      (current) => ({
        ...current,

        driverName: "",

        department: "",
      })
    );


    const timer =
      window.setTimeout(
        async () => {
          const normalizedEmployeeNumber =
            rawEmployeeNumber
              .toUpperCase();


          try {
            setEmployeeLookupLoading(
              true
            );


            const {
              data: employee,
              error,
            } =
              await supabase
                .from("drivers")
                .select(
                  `
                    id,
                    full_name,
                    employee_number,
                    department,
                    job_title,
                    employment_type,
                    active
                  `
                )
                .eq(
                  "employee_number",
                  normalizedEmployeeNumber
                )
                .maybeSingle();


            if (cancelled) {
              return;
            }


            if (error) {
              throw error;
            }


            /*
             * =============================================
             * NOT FOUND
             * =============================================
             */

            if (!employee) {
              setEmployeeFound(
                false
              );


              setEmployeeLookupMessage(
                `Employee ${normalizedEmployeeNumber} was not found in the AEDC employee register.`
              );


              return;
            }


            /*
             * =============================================
             * INACTIVE
             * =============================================
             */

            if (
              employee.active ===
              false
            ) {
              setEmployeeFound(
                false
              );


              setFormData(
                (current) => ({
                  ...current,

                  employeeNumber:
                    employee.employee_number ||
                    normalizedEmployeeNumber,

                  driverName:
                    employee.full_name ||
                    "",

                  department:
                    employee.department ||
                    "",
                })
              );


              setEmployeeLookupMessage(
                `${
                  employee.full_name ||
                  normalizedEmployeeNumber
                } is registered but the employee account is inactive.`
              );


              return;
            }


            /*
             * =============================================
             * REGISTER DATA QUALITY
             * =============================================
             */

            if (
              !employee.full_name
            ) {
              setEmployeeFound(
                false
              );


              setEmployeeLookupMessage(
                `Employee ${normalizedEmployeeNumber} exists, but their full name is missing from the Employee Register.`
              );


              return;
            }


            if (
              !employee.department
            ) {
              setEmployeeFound(
                false
              );


              setFormData(
                (current) => ({
                  ...current,

                  employeeNumber:
                    employee.employee_number ||
                    normalizedEmployeeNumber,

                  driverName:
                    employee.full_name,

                  department: "",
                })
              );


              setEmployeeLookupMessage(
                `${employee.full_name} was found, but their department is missing. Update the Employee Register first.`
              );


              return;
            }


            /*
             * =============================================
             * EMPLOYEE FOUND
             * =============================================
             */

            setFormData(
              (current) => ({
                ...current,

                employeeNumber:
                  employee.employee_number ||
                  normalizedEmployeeNumber,

                driverName:
                  employee.full_name,

                department:
                  employee.department,
              })
            );


            setEmployeeFound(
              true
            );


            setEmployeeLookupMessage(
              `${employee.full_name} found in the AEDC Employee Register.`
            );

          } catch (error) {
            if (cancelled) {
              return;
            }


            console.error(
              "Employee lookup error:",
              error
            );


            setEmployeeFound(
              false
            );


            setEmployeeLookupMessage(
              error.message ||
              "Unable to look up the employee."
            );

          } finally {
            if (
              !cancelled
            ) {
              setEmployeeLookupLoading(
                false
              );
            }
          }
        },
        500
      );


    return () => {
      cancelled = true;

      window.clearTimeout(
        timer
      );
    };

  }, [
    formData.employeeNumber,
  ]);


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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedVehicle) {
      alert(
        "Please select a vehicle before submitting the request."
      );

      return;
    }

    if (
      selectedVehicle.active === false
    ) {
      alert(
        "The selected vehicle is inactive and cannot be requested."
      );

      return;
    }

    if (
      selectedVehicle.roadworthy === false
    ) {
      alert(
        `${vehicleName(
          selectedVehicle
        )} is currently marked as not roadworthy and cannot be requested.`
      );

      return;
    }

    if (
      selectedVehicle.status !==
      "available"
    ) {
      alert(
        `${vehicleName(
          selectedVehicle
        )} is currently ${formatStatus(
          selectedVehicle.status
        )} and cannot be requested at this time.`
      );

      return;
    }

    if (!formData.driverName.trim()) {
      alert(
        "Please enter the intended driver's full name."
      );

      return;
    }

    if (
      !formData.employeeNumber.trim()
    ) {
      alert(
        "Please enter the employee or contractor number."
      );

      return;
    }

    if (!formData.department.trim()) {
      alert(
        "Please enter the driver's department or unit."
      );

      return;
    }

    if (!formData.destination.trim()) {
      alert(
        "Please enter the destination."
      );

      return;
    }

    if (!formData.purpose.trim()) {
      alert(
        "Please enter the business purpose of the trip."
      );

      return;
    }

    if (!formData.confirmation) {
      alert(
        "Please confirm that the request information is accurate."
      );

      return;
    }

    const departureAt = new Date(
      `${formData.departureDate}T${formData.departureTime}`
    );

    const returnAt = new Date(
      `${formData.returnDate}T${formData.returnTime}`
    );

    if (
      Number.isNaN(
        departureAt.getTime()
      ) ||
      Number.isNaN(returnAt.getTime())
    ) {
      alert(
        "Please provide valid departure and return dates and times."
      );

      return;
    }

    if (returnAt <= departureAt) {
      alert(
        "The expected return must be after the departure time."
      );

      return;
    }

    if (
      formData.outOfProvince ===
        "yes" &&
      !formData.itinerary.trim()
    ) {
      alert(
        "Please provide the out-of-province itinerary."
      );

      return;
    }

    if (
      formData.outOfProvince ===
        "yes" &&
      !formData.overnightLocation.trim()
    ) {
      alert(
        "Please provide the planned overnight parking location."
      );

      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      /*
       * Re-read the selected vehicle before
       * saving. Its availability may have
       * changed while Admin was filling in
       * the form.
       */
      const {
        data: latestVehicle,
        error: latestVehicleError,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq(
          "id",
          selectedVehicle.id
        )
        .single();

      if (latestVehicleError) {
        throw latestVehicleError;
      }

      if (latestVehicle.active === false) {
        throw new Error(
          "The selected vehicle has been deactivated and can no longer be requested."
        );
      }

      if (
        latestVehicle.roadworthy === false
      ) {
        throw new Error(
          `${vehicleName(
            latestVehicle
          )} is no longer marked as roadworthy.`
        );
      }

      if (
        latestVehicle.status !==
        "available"
      ) {
        throw new Error(
          `${vehicleName(
            latestVehicle
          )} is no longer available. Its current status is ${formatStatus(
            latestVehicle.status
          )}.`
        );
      }

      /*
       * Check for an overlapping approved or
       * pending booking for this vehicle.
       */
      const {
        data: overlappingRequests,
        error: overlapError,
      } = await supabase
        .from("vehicle_requests")
        .select(
          "id, booking_reference, requested_departure_at, requested_return_at, status"
        )
        .eq(
          "vehicle_id",
          latestVehicle.id
        )
        .in("status", [
          "pending",
          "approved",
        ])
        .lt(
          "requested_departure_at",
          returnAt.toISOString()
        )
        .gt(
          "requested_return_at",
          departureAt.toISOString()
        );

      if (overlapError) {
        throw overlapError;
      }

      if (
        overlappingRequests &&
        overlappingRequests.length > 0
      ) {
        const conflict =
          overlappingRequests[0];

        throw new Error(
          `${vehicleName(
            latestVehicle
          )} already has a ${conflict.status.toUpperCase()} request that overlaps with the requested time. Please select another vehicle or change the schedule.`
        );
      }

      const normalizedEmployeeNumber =
        formData.employeeNumber
          .trim()
          .toUpperCase();

      const {
        data: employee,
        error: employeeError,
      } = await supabase
        .from("drivers")
        .select(
          "id, full_name, employee_number, department, active"
        )
        .eq(
          "employee_number",
          normalizedEmployeeNumber
        )
        .maybeSingle();

      if (employeeError) {
        throw employeeError;
      }

      /*
       * Admin may create a request on behalf
       * of an employee, but the employee must
       * exist in the AEDC employee register.
       */
      if (!employee) {
        throw new Error(
          `Employee number ${normalizedEmployeeNumber} is not registered. Please add the employee under Manage Employees first.`
        );
      }

      if (employee.active === false) {
        throw new Error(
          `${employee.full_name} is currently inactive in the AEDC employee register.`
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("vehicle_requests")
        .insert({
          vehicle_id:
            latestVehicle.id,

          requested_driver_name:
            formData.driverName.trim(),

          employee_number:
            normalizedEmployeeNumber,

          department:
            formData.department.trim(),

          purpose:
            formData.purpose.trim(),

          destination:
            formData.destination.trim(),

          requested_departure_at:
            departureAt.toISOString(),

          requested_return_at:
            returnAt.toISOString(),

          out_of_province:
            formData.outOfProvince ===
            "yes",

          itinerary:
            formData.outOfProvince ===
            "yes"
              ? formData.itinerary.trim()
              : null,

          overnight_location:
            formData.outOfProvince ===
            "yes"
              ? formData.overnightLocation.trim()
              : null,

          status: "pending",

          request_source: "admin",

          submitted_by_name:
            "Admin / Facilities Manager",

          submitted_by_role:
            "Admin / Facilities Manager",

          submitted_on_behalf: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      alert(
        `Vehicle request submitted successfully.\n\nVehicle: ${vehicleName(
          latestVehicle
        )}\nBooking Reference: ${
          data.booking_reference
        }`
      );

      navigate("/requests");
    } catch (error) {
      console.error(
        "Request creation error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to submit the vehicle request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="vehicle-form-page">
        <div className="page-loading">
          Loading AEDC fleet...
        </div>
      </main>
    );
  }

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

            <span>

            </span>
          </div>
        </div>
      </header>

      <section className="form-hero">
        <div className="form-hero-inner">
          <span>
            VEHICLE BOOKING REQUEST
          </span>

          <h1>
            Request a Company Vehicle
          </h1>

          <p>
            Select an AEDC pool vehicle and
            submit the business trip for
            approval before the vehicle is
            released.
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
                Unable to submit request
              </strong>

              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {vehicles.length === 0 && (
          <section className="form-card">
            <div className="damage-warning">
              <FaExclamationTriangle />

              <div>
                <strong>
                  No active vehicles
                </strong>

                <p>
                  There are currently no active
                  AEDC vehicles available in
                  the fleet. Add or reactivate
                  a vehicle under Manage
                  Vehicles.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="form-card">
          <div className="form-section-heading">
            <span>01</span>

            <div>
              <h2>
                Select Vehicle
              </h2>

              <p>
                Choose the AEDC pool vehicle
                required for this trip.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>
                Company Vehicle *
              </label>

              <select
                required
                value={
                  selectedVehicleId
                }
                onChange={(event) =>
                  setSelectedVehicleId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select a vehicle
                </option>

                {vehicles.map(
                  (vehicle) => {
                    const available =
                      vehicle.status ===
                        "available" &&
                      vehicle.roadworthy !==
                        false;

                    return (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                        disabled={!available}
                      >
                        {vehicleName(
                          vehicle
                        )}{" "}
                        —{" "}
                        {vehicleRegistration(
                          vehicle
                        )}{" "}
                        —{" "}
                        {formatStatus(
                          vehicle.status
                        )}
                        {vehicle.roadworthy ===
                        false
                          ? " — NOT ROADWORTHY"
                          : ""}
                      </option>
                    );
                  }
                )}
              </select>
            </div>
          </div>

          {selectedVehicle && (
            <div className="vehicle-summary-form-card">
              <div className="vehicle-summary-icon">
                <FaCar />
              </div>

              <div>
                <span>
                  SELECTED AEDC VEHICLE
                </span>

                <h2>
                  {vehicleName(
                    selectedVehicle
                  )}
                </h2>

                <p>
                  Registration:{" "}
                  {vehicleRegistration(
                    selectedVehicle
                  )}
                </p>

                <p>
                  Status:{" "}
                  {formatStatus(
                    selectedVehicle.status
                  )}
                </p>

                <p>
                  Current Odometer:{" "}
                  {Number(
                    selectedVehicle.current_odometer ||
                      0
                  ).toLocaleString(
                    "en-ZA"
                  )}{" "}
                  km
                </p>
              </div>
            </div>
          )}

          {vehicles.length > 0 &&
            availableVehicles.length ===
              0 && (
              <div className="damage-warning">
                <FaExclamationTriangle />

                <div>
                  <strong>
                    No vehicle currently available
                  </strong>

                  <p>
                    The fleet contains active
                    vehicles, but none are
                    currently available and
                    roadworthy for a new
                    request.
                  </p>
                </div>
              </div>
            )}
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>02</span>

            <div>
              <h2>
                Intended Driver
              </h2>

              <p>
                Identify who will be
                responsible for driving the
                selected vehicle.
              </p>
            </div>
          </div>

          <div className="form-grid two-columns">
            <div className="input-group">
              <label>
                Driver Full Name *
              </label>

              <div className="input-with-icon">
                <FaUser />

                <input
                readOnly
                  required
                  type="text"
                  name="driverName"
                  value={
                    formData.driverName
                  }
                  onChange={handleChange}
                  placeholder="Auto-filled from employee number"
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                Employee / Work Number *
              </label>

              <input
                required
                type="text"
                name="employeeNumber"
                value={
                  formData.employeeNumber
                }
                onChange={handleChange}
                placeholder="Employee number"
              />

              {employeeLookupLoading && (
                <small className="employee-lookup-status loading">
                  Looking up employee...
                </small>
              )}


              {!employeeLookupLoading &&
                employeeLookupMessage && (
                  <small
                    className={`employee-lookup-status ${
                      employeeFound
                        ? "found"
                        : "not-found"
                    }`}
                  >
                    {employeeLookupMessage}
                  </small>
                )}
            </div>

            <div className="input-group full-width">
              <label>
                Department / Unit *
              </label>

              <input
                readOnly
                required
                type="text"
                name="department"
                value={
                  formData.department
                }
                onChange={handleChange}
                placeholder="Auto-filled from Employee Register"
              />
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>03</span>

            <div>
              <h2>
                Business Trip
              </h2>

              <p>
                AEDC vehicles may only be
                requested for an authorised
                work-related purpose.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>
                Destination(s) *
              </label>

              <div className="input-with-icon">
                <FaMapMarkerAlt />

                <input
                  required
                  type="text"
                  name="destination"
                  value={
                    formData.destination
                  }
                  onChange={handleChange}
                  placeholder="Where are you going?"
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                Purpose of Trip *
              </label>

              <textarea
                required
                rows="4"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="Explain the business reason for using the vehicle"
              />
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>04</span>

            <div>
              <h2>
                Requested Schedule
              </h2>

              <p>
                Provide the estimated
                departure and return.
              </p>
            </div>
          </div>

          <div className="form-grid two-columns">
            <div className="input-group">
              <label>
                Departure Date *
              </label>

              <input
                required
                type="date"
                name="departureDate"
                value={
                  formData.departureDate
                }
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>
                Departure Time *
              </label>

              <input
                required
                type="time"
                name="departureTime"
                value={
                  formData.departureTime
                }
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>
                Expected Return Date *
              </label>

              <input
                required
                type="date"
                name="returnDate"
                value={
                  formData.returnDate
                }
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>
                Expected Return Time *
              </label>

              <input
                required
                type="time"
                name="returnTime"
                value={
                  formData.returnTime
                }
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>05</span>

            <div>
              <h2>
                Travel Area
              </h2>

              <p>
                Out-of-province travel
                requires additional approval
                and secure parking
                information.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>
                Will the Vehicle Travel
                Outside the Province? *
              </label>

              <select
                name="outOfProvince"
                value={
                  formData.outOfProvince
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

            {formData.outOfProvince ===
              "yes" && (
              <>
                <div className="input-group">
                  <label>
                    Planned Itinerary *
                  </label>

                  <textarea
                    required
                    rows="4"
                    name="itinerary"
                    value={
                      formData.itinerary
                    }
                    onChange={handleChange}
                    placeholder="List the planned route, dates and stops"
                  />
                </div>

                <div className="input-group">
                  <label>
                    Overnight Parking Location *
                  </label>

                  <textarea
                    required
                    rows="3"
                    name="overnightLocation"
                    value={
                      formData.overnightLocation
                    }
                    onChange={handleChange}
                    placeholder="Hotel secure parking or another approved secure location"
                  />
                </div>
              </>
            )}
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
              I confirm that the information
              in this request is accurate,
              that the selected vehicle will
              be used for the stated AEDC
              business purpose only, and that
              this request is being recorded
              on behalf of the intended
              driver.
            </span>
          </label>
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
            disabled={
              submitting ||
              !selectedVehicle ||
              availableVehicles.length ===
                0
            }
            className="submit-button"
          >
            <FaCalendarAlt />

            {submitting
              ? "Submitting..."
              : "Submit Vehicle Request"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default RequestVehicle;