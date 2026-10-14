import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaGasPump,
  FaMoneyBillWave,
  FaPlus,
  FaReceipt,
  FaSearch,
  FaTachometerAlt,
  FaTimes,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/FuelManagement.css";


const emptyForm = {
  vehicle_id: "",
  trip_id: "",
  employee_number: "",
  driver_name: "",
  purchase_date: "",
  odometer: "",
  litres: "",
  total_cost: "",
  fuel_type: "",
  station: "",
  receipt_reference: "",
  payment_method: "fuel-card",
  full_tank: true,
  notes: "",
  created_by: "Fleet Admin",
};


function formatDateTime(value) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}


function money(value) {
  return new Intl.NumberFormat(
    "en-ZA",
    {
      style: "currency",
      currency: "ZAR",
    }
  ).format(Number(value || 0));
}


function formatLabel(value) {
  if (!value) {
    return "Not recorded";
  }

  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function FuelManagement() {
  const [
    logs,
    setLogs,
  ] = useState([]);

  const [
    vehicles,
    setVehicles,
  ] = useState([]);

  const [
    trips,
    setTrips,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("month");

  const [
    formData,
    setFormData,
  ] = useState(emptyForm);


  useEffect(() => {
    loadData();
  }, []);


  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        fuelResult,
        vehicleResult,
        tripResult,
      ] = await Promise.all([
        supabase
          .from("fleet_fuel_logs")
          .select(`
            *,
            vehicles (
              id,
              make,
              model,
              registration,
              fuel_type,
              current_odometer
            ),
            vehicle_trips (
              id,
              driver_name,
              employee_number,
              destination,
              status
            )
          `)
          .order(
            "purchase_date",
            {
              ascending: false,
            }
          ),

        supabase
          .from("vehicles")
          .select("*")
          .eq("active", true)
          .order(
            "make",
            {
              ascending: true,
            }
          ),

        supabase
          .from("vehicle_trips")
          .select(`
            id,
            vehicle_id,
            driver_name,
            employee_number,
            destination,
            status,
            departure_at,
            returned_at
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(250),
      ]);

      if (fuelResult.error) {
        throw fuelResult.error;
      }

      if (vehicleResult.error) {
        throw vehicleResult.error;
      }

      if (tripResult.error) {
        throw tripResult.error;
      }

      setLogs(
        fuelResult.data || []
      );

      setVehicles(
        vehicleResult.data || []
      );

      setTrips(
        tripResult.data || []
      );
    } catch (error) {
      console.error(
        "Fuel management load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load fuel records."
      );
    } finally {
      setLoading(false);
    }
  }


  function openForm() {
    setFormData({
      ...emptyForm,
      purchase_date:
        new Date()
          .toISOString()
          .slice(0, 16),
    });

    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }


  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setFormData(emptyForm);
  }


  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    if (
      name === "vehicle_id"
    ) {
      const vehicle =
        vehicles.find(
          (item) =>
            item.id === value
        );

      setFormData(
        (current) => ({
          ...current,
          vehicle_id: value,
          trip_id: "",
          fuel_type:
            vehicle?.fuel_type ||
            current.fuel_type,
          odometer:
            vehicle?.current_odometer !=
            null
              ? String(
                  vehicle.current_odometer
                )
              : current.odometer,
          driver_name: "",
          employee_number: "",
        })
      );

      return;
    }


    if (name === "trip_id") {
      const trip =
        trips.find(
          (item) =>
            item.id === value
        );

      setFormData(
        (current) => ({
          ...current,
          trip_id: value,
          driver_name:
            trip?.driver_name ||
            current.driver_name,
          employee_number:
            trip?.employee_number ||
            current.employee_number,
        })
      );

      return;
    }


    setFormData(
      (current) => ({
        ...current,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  }


  async function submitFuel(
    event
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (
        !formData.vehicle_id
      ) {
        throw new Error(
          "Select a vehicle."
        );
      }

      if (
        formData.odometer ===
          "" ||
        Number(
          formData.odometer
        ) < 0
      ) {
        throw new Error(
          "Enter a valid odometer reading."
        );
      }

      if (
        formData.litres ===
          "" ||
        Number(
          formData.litres
        ) <= 0
      ) {
        throw new Error(
          "Enter litres purchased."
        );
      }

      if (
        formData.total_cost ===
          "" ||
        Number(
          formData.total_cost
        ) < 0
      ) {
        throw new Error(
          "Enter the total fuel cost."
        );
      }

      const purchaseDate =
        formData.purchase_date
          ? new Date(
              formData.purchase_date
            ).toISOString()
          : new Date().toISOString();

      const {
        error,
      } = await supabase.rpc(
        "admin_create_fleet_fuel_log",
        {
          p_vehicle_id:
            formData.vehicle_id,

          p_trip_id:
            formData.trip_id ||
            null,

          p_employee_number:
            formData
              .employee_number ||
            null,

          p_driver_name:
            formData.driver_name ||
            null,

          p_purchase_date:
            purchaseDate,

          p_odometer:
            Number(
              formData.odometer
            ),

          p_litres:
            Number(
              formData.litres
            ),

          p_total_cost:
            Number(
              formData.total_cost
            ),

          p_fuel_type:
            formData.fuel_type ||
            null,

          p_station:
            formData.station
              .trim() || null,

          p_receipt_reference:
            formData
              .receipt_reference
              .trim() || null,

          p_payment_method:
            formData
              .payment_method ||
            null,

          p_full_tank:
            formData.full_tank,

          p_notes:
            formData.notes
              .trim() || null,

          p_created_by:
            formData.created_by
              .trim() ||
            "Fleet Admin",
        }
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Fuel purchase recorded successfully."
      );

      closeForm();

      await loadData();
    } catch (error) {
      console.error(
        "Fuel save error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to record fuel purchase."
      );
    } finally {
      setSaving(false);
    }
  }


  const stats = useMemo(() => {
    const now =
      new Date();

    const monthLogs =
      logs.filter(
        (log) => {
          const date =
            new Date(
              log.purchase_date
            );

          return (
            date.getFullYear() ===
              now.getFullYear() &&
            date.getMonth() ===
              now.getMonth()
          );
        }
      );

    const monthCost =
      monthLogs.reduce(
        (total, log) =>
          total +
          Number(
            log.total_cost || 0
          ),
        0
      );

    const monthLitres =
      monthLogs.reduce(
        (total, log) =>
          total +
          Number(
            log.litres || 0
          ),
        0
      );

    const averageCost =
      monthLitres > 0
        ? monthCost /
          monthLitres
        : 0;

    return {
      entries:
        monthLogs.length,
      monthCost,
      monthLitres,
      averageCost,
    };
  }, [logs]);


  const visibleLogs =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const now =
        new Date();

      return logs.filter(
        (log) => {
          if (
            filter === "month"
          ) {
            const date =
              new Date(
                log.purchase_date
              );

            if (
              date.getFullYear() !==
                now.getFullYear() ||
              date.getMonth() !==
                now.getMonth()
            ) {
              return false;
            }
          }

          if (!search) {
            return true;
          }

          const vehicle =
            log.vehicles || {};

          return [
            vehicle.make,
            vehicle.model,
            vehicle.registration,
            log.driver_name,
            log.employee_number,
            log.station,
            log.receipt_reference,
            log.fuel_type,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(search)
            );
        }
      );
    }, [
      logs,
      filter,
      searchTerm,
    ]);


  const selectedTrips =
    trips.filter(
      (trip) =>
        trip.vehicle_id ===
        formData.vehicle_id
    );


  const liveCostPerLitre =
    Number(
      formData.litres
    ) > 0
      ? Number(
          formData.total_cost || 0
        ) /
        Number(
          formData.litres
        )
      : 0;


  return (
    <main className="fuel-page">
      <header className="fuel-header">
        <div className="fuel-header-inner">
          <div className="fuel-header-left">
            <Link
              to="/"
              className="fuel-back"
            >
              <FaArrowLeft />
            </Link>

          </div>

          <button
            type="button"
            className="fuel-add-button"
            onClick={openForm}
          >
            <FaPlus />
            Add Fuel Entry
          </button>
        </div>
      </header>


      <section className="fuel-content">
        {errorMessage && (
          <div className="fuel-message fuel-error">
            <FaGasPump />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="fuel-message fuel-success">
            <FaCheckCircle />

            <span>
              {successMessage}
            </span>
          </div>
        )}


        <section className="fuel-summary">
          <article>
            <FaReceipt />
            <div>
              <span>
                Entries This Month
              </span>
              <strong>
                {stats.entries}
              </strong>
            </div>
          </article>

          <article>
            <FaGasPump />
            <div>
              <span>
                Litres This Month
              </span>
              <strong>
                {stats.monthLitres.toLocaleString(
                  "en-ZA",
                  {
                    maximumFractionDigits:
                      2,
                  }
                )}{" "}
                L
              </strong>
            </div>
          </article>

          <article>
            <FaMoneyBillWave />
            <div>
              <span>
                Fuel Spend
              </span>
              <strong>
                {money(
                  stats.monthCost
                )}
              </strong>
            </div>
          </article>

          <article>
            <FaGasPump />
            <div>
              <span>
                Avg Cost / Litre
              </span>
              <strong>
                {money(
                  stats.averageCost
                )}
              </strong>
            </div>
          </article>
        </section>


        <section className="fuel-toolbar">
          <div className="fuel-search">
            <FaSearch />

            <input
              type="search"
              value={searchTerm}
              onChange={
                (event) =>
                  setSearchTerm(
                    event.target.value
                  )
              }
              placeholder="Search vehicle, driver, station or receipt..."
            />
          </div>

          <div className="fuel-tabs">
            <button
              type="button"
              className={
                filter === "month"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("month")
              }
            >
              This Month
            </button>

            <button
              type="button"
              className={
                filter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("all")
              }
            >
              All Records
            </button>
          </div>
        </section>


        {loading ? (
          <section className="fuel-empty">
            <FaGasPump />
            <h2>
              Loading fuel records...
            </h2>
          </section>
        ) : visibleLogs.length ===
          0 ? (
          <section className="fuel-empty">
            <FaReceipt />
            <h2>
              No fuel records
            </h2>
            <p>
              Record the first fuel purchase
              to begin tracking fleet fuel
              costs.
            </p>
          </section>
        ) : (
          <section className="fuel-grid">
            {visibleLogs.map(
              (log) => {
                const vehicle =
                  log.vehicles || {};

                const trip =
                  log.vehicle_trips ||
                  null;

                const costPerLitre =
                  Number(
                    log.litres || 0
                  ) > 0
                    ? Number(
                        log.total_cost ||
                          0
                      ) /
                      Number(
                        log.litres
                      )
                    : 0;

                return (
                  <article
                    key={log.id}
                    className="fuel-card"
                  >
                    <div className="fuel-card-top">
                      <span>
                        {vehicle.registration ||
                          "VEHICLE"}
                      </span>

                      {log.full_tank && (
                        <em>
                          FULL TANK
                        </em>
                      )}
                    </div>

                    <div className="fuel-card-title">
                      <h2>
                        {vehicle.make ||
                          "Vehicle"}{" "}
                        {vehicle.model ||
                          ""}
                      </h2>

                      <p>
                        {formatDateTime(
                          log.purchase_date
                        )}
                      </p>
                    </div>

                    <div className="fuel-metrics">
                      <div>
                        <FaGasPump />
                        <span>
                          Litres
                        </span>
                        <strong>
                          {Number(
                            log.litres
                          ).toLocaleString(
                            "en-ZA",
                            {
                              maximumFractionDigits:
                                2,
                            }
                          )}{" "}
                          L
                        </strong>
                      </div>

                      <div>
                        <FaMoneyBillWave />
                        <span>
                          Total
                        </span>
                        <strong>
                          {money(
                            log.total_cost
                          )}
                        </strong>
                      </div>

                      <div>
                        <FaGasPump />
                        <span>
                          Cost / L
                        </span>
                        <strong>
                          {money(
                            costPerLitre
                          )}
                        </strong>
                      </div>

                      <div>
                        <FaTachometerAlt />
                        <span>
                          Odometer
                        </span>
                        <strong>
                          {Number(
                            log.odometer
                          ).toLocaleString(
                            "en-ZA"
                          )}{" "}
                          km
                        </strong>
                      </div>
                    </div>

                    <div className="fuel-info">
                      <div>
                        <span>
                          Station
                        </span>
                        <strong>
                          {log.station ||
                            "Not recorded"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Fuel
                        </span>
                        <strong>
                          {log.fuel_type ||
                            vehicle.fuel_type ||
                            "Not recorded"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Driver
                        </span>
                        <strong>
                          {log.driver_name ||
                            trip?.driver_name ||
                            "Not linked"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Payment
                        </span>
                        <strong>
                          {formatLabel(
                            log.payment_method
                          )}
                        </strong>
                      </div>
                    </div>

                    {trip && (
                      <div className="fuel-trip-link">
                        <FaCar />

                        <span>
                          Linked trip
                          {trip.destination
                            ? ` · ${trip.destination}`
                            : ""}
                        </span>
                      </div>
                    )}

                    {log.receipt_reference && (
                      <div className="fuel-receipt">
                        <FaReceipt />

                        <span>
                          Receipt:{" "}
                          {
                            log.receipt_reference
                          }
                        </span>
                      </div>
                    )}

                    {log.notes && (
                      <p className="fuel-notes">
                        {log.notes}
                      </p>
                    )}
                  </article>
                );
              }
            )}
          </section>
        )}
      </section>


      {showForm && (
        <div className="fuel-modal-backdrop">
          <section className="fuel-modal">
            <div className="fuel-modal-heading">
              <div>
                <span>
                  FUEL PURCHASE
                </span>

                <h2>
                  Add Fuel Entry
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
              >
                <FaTimes />
              </button>
            </div>

            <form
              className="fuel-form"
              onSubmit={submitFuel}
            >
              <label>
                Vehicle *
                <select
                  name="vehicle_id"
                  value={
                    formData.vehicle_id
                  }
                  onChange={
                    handleChange
                  }
                  required
                >
                  <option value="">
                    Select vehicle
                  </option>

                  {vehicles.map(
                    (vehicle) => (
                      <option
                        key={
                          vehicle.id
                        }
                        value={
                          vehicle.id
                        }
                      >
                        {vehicle.make}{" "}
                        {vehicle.model} —{" "}
                        {
                          vehicle.registration
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Linked Trip
                <select
                  name="trip_id"
                  value={
                    formData.trip_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    !formData.vehicle_id
                  }
                >
                  <option value="">
                    No linked trip
                  </option>

                  {selectedTrips.map(
                    (trip) => (
                      <option
                        key={
                          trip.id
                        }
                        value={
                          trip.id
                        }
                      >
                        {trip.driver_name ||
                          "Driver"}{" "}
                        —{" "}
                        {trip.destination ||
                          "Trip"}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Purchase Date / Time
                <input
                  name="purchase_date"
                  type="datetime-local"
                  value={
                    formData
                      .purchase_date
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label>
                Odometer (km) *
                <input
                  name="odometer"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    formData.odometer
                  }
                  onChange={
                    handleChange
                  }
                  required
                />
              </label>

              <label>
                Litres *
                <input
                  name="litres"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    formData.litres
                  }
                  onChange={
                    handleChange
                  }
                  required
                />
              </label>

              <label>
                Total Cost (R) *
                <input
                  name="total_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formData
                      .total_cost
                  }
                  onChange={
                    handleChange
                  }
                  required
                />
              </label>

              <label>
                Cost per Litre
                <input
                  type="text"
                  value={
                    liveCostPerLitre >
                    0
                      ? money(
                          liveCostPerLitre
                        )
                      : ""
                  }
                  placeholder="Calculated automatically"
                  readOnly
                />
              </label>

              <label>
                Fuel Type
                <select
                  name="fuel_type"
                  value={
                    formData.fuel_type
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="">
                    Select fuel
                  </option>
                  <option value="Diesel">
                    Diesel
                  </option>
                  <option value="Petrol">
                    Petrol
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </label>

              <label>
                Filling Station
                <input
                  name="station"
                  type="text"
                  value={
                    formData.station
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Engen Midrand"
                />
              </label>

              <label>
                Payment Method
                <select
                  name="payment_method"
                  value={
                    formData
                      .payment_method
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
              </label>

              <label>
                Receipt Reference
                <input
                  name="receipt_reference"
                  type="text"
                  value={
                    formData
                      .receipt_reference
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label>
                Driver Name
                <input
                  name="driver_name"
                  type="text"
                  value={
                    formData
                      .driver_name
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label>
                Employee Number
                <input
                  name="employee_number"
                  type="text"
                  value={
                    formData
                      .employee_number
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label className="fuel-full-tank-option fuel-form-full">
                <input
                  name="full_tank"
                  type="checkbox"
                  checked={
                    formData.full_tank
                  }
                  onChange={
                    handleChange
                  }
                />

                <span>
                  <strong>
                    Full Tank
                  </strong>
                  <small>
                    Mark this when the vehicle
                    was filled to full capacity.
                  </small>
                </span>
              </label>

              <label className="fuel-form-full">
                Notes
                <textarea
                  name="notes"
                  rows="3"
                  value={
                    formData.notes
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <div className="fuel-modal-actions">
                <button
                  type="button"
                  className="fuel-cancel"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="fuel-save"
                  disabled={saving}
                >
                  <FaGasPump />

                  {saving
                    ? "Saving..."
                    : "Record Fuel Purchase"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


export default FuelManagement;
