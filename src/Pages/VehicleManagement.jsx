import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  FaArrowLeft,
  FaCar,
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaPlus,
  FaPowerOff,
  FaRoad,
  FaSave,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import "../Styles/VehicleManagement.css";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";



const emptyForm = {
  make: "",
  model: "",
  registration: "",
  classification: "Pool Vehicle",
  registered_keeper:
    "African Entrepreneurship Development Corporation",
  default_parking: "Office Basement",
  custodian: "Facilities Manager",
  current_odometer: "",
  status: "available",
  roadworthy: true,
  notes: "",
};

function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [tripCounts, setTripCounts] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data: vehicleData, error: vehicleError } =
        await supabase
          .from("vehicles")
          .select("*")
          .order("created_at", {
            ascending: true,
          });

      if (vehicleError) {
        throw vehicleError;
      }

      const vehicleList = vehicleData || [];

      setVehicles(vehicleList);

      const counts = {};

      for (const vehicleItem of vehicleList) {
        const { count, error: countError } =
          await supabase
            .from("vehicle_trips")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("vehicle_id", vehicleItem.id);

        if (countError) {
          console.error(
            `Could not count trips for ${vehicleItem.make} ${vehicleItem.model}`,
            countError
          );

          counts[vehicleItem.id] = 0;
        } else {
          counts[vehicleItem.id] = count || 0;
        }
      }

      setTripCounts(counts);
    } catch (error) {
      console.error("Load vehicles error:", error);

      setErrorMessage(
        error.message || "Unable to load company vehicles."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function openAddVehicle() {
    setEditingVehicle(null);
    setFormData(emptyForm);

    setErrorMessage("");
    setSuccessMessage("");

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditVehicle(vehicleItem) {
    setEditingVehicle(vehicleItem);

    setFormData({
      make: vehicleItem.make || "",
      model: vehicleItem.model || "",
      registration: vehicleItem.registration || "",
      classification:
        vehicleItem.classification || "Pool Vehicle",
      registered_keeper:
        vehicleItem.registered_keeper ||
        "African Entrepreneurship Development Corporation",
      default_parking:
        vehicleItem.default_parking || "Office Basement",
      custodian:
        vehicleItem.custodian || "Facilities Manager",
      current_odometer:
        vehicleItem.current_odometer ?? "",
      status: vehicleItem.status || "available",
      roadworthy: vehicleItem.roadworthy ?? true,
      notes: vehicleItem.notes || "",
    });

    setErrorMessage("");
    setSuccessMessage("");

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingVehicle(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!formData.make.trim()) {
        throw new Error("Please enter the vehicle make.");
      }

      if (!formData.model.trim()) {
        throw new Error("Please enter the vehicle model.");
      }

      if (!formData.registration.trim()) {
        throw new Error(
          "Please enter the vehicle registration number."
        );
      }

      if (
        formData.current_odometer === "" ||
        Number(formData.current_odometer) < 0
      ) {
        throw new Error(
          "Please enter a valid odometer reading."
        );
      }

      let duplicateQuery = supabase
        .from("vehicles")
        .select("id")
        .ilike(
          "registration",
          formData.registration.trim()
        );

      if (editingVehicle) {
        duplicateQuery = duplicateQuery.neq(
          "id",
          editingVehicle.id
        );
      }

      const {
        data: duplicateVehicle,
        error: duplicateError,
      } = await duplicateQuery.limit(1).maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateVehicle) {
        throw new Error(
          "A vehicle with this registration number already exists."
        );
      }

      const payload = {
        make: formData.make.trim(),
        model: formData.model.trim(),
        registration: formData.registration
          .trim()
          .toUpperCase(),

        classification:
          formData.classification.trim() || "Pool Vehicle",

        registered_keeper:
          formData.registered_keeper.trim() ||
          "African Entrepreneurship Development Corporation",

        default_parking:
          formData.default_parking.trim() ||
          "Office Basement",

        custodian:
          formData.custodian.trim() ||
          "Facilities Manager",

        current_odometer: Number(
          formData.current_odometer
        ),

        status: formData.status,

        roadworthy: formData.roadworthy,

        notes: formData.notes.trim() || null,
      };

      if (editingVehicle) {
        const { error: updateError } = await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", editingVehicle.id);

        if (updateError) {
          throw updateError;
        }

        setSuccessMessage(
          `${payload.make} ${payload.model} was updated successfully.`
        );
      } else {
        const { error: insertError } = await supabase
          .from("vehicles")
          .insert({
            ...payload,
            active: true,
          });

        if (insertError) {
          throw insertError;
        }

        setSuccessMessage(
          `${payload.make} ${payload.model} was added successfully.`
        );
      }

      setShowForm(false);
      setEditingVehicle(null);
      setFormData(emptyForm);

      await loadVehicles();
    } catch (error) {
      console.error("Save vehicle error:", error);

      setErrorMessage(
        error.message || "Unable to save the vehicle."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleVehicleActive(vehicleItem) {
    const newActiveStatus = !vehicleItem.active;

    if (
      newActiveStatus === false &&
      vehicleItem.status === "in-use"
    ) {
      window.alert(
        "This vehicle is currently in use. Complete the return before deactivating it."
      );

      return;
    }

    const action = newActiveStatus
      ? "reactivate"
      : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${vehicleItem.make} ${vehicleItem.model} (${vehicleItem.registration})?`
    );

    if (!confirmed) return;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const { error } = await supabase
        .from("vehicles")
        .update({
          active: newActiveStatus,
        })
        .eq("id", vehicleItem.id);

      if (error) {
        throw error;
      }

      setSuccessMessage(
        `${vehicleItem.make} ${vehicleItem.model} has been ${
          newActiveStatus ? "reactivated" : "deactivated"
        }.`
      );

      await loadVehicles();
    } catch (error) {
      console.error("Vehicle status error:", error);

      setErrorMessage(
        error.message ||
          "Unable to change the vehicle status."
      );
    }
  }

  async function deleteVehicle(vehicleItem) {
    const knownTripCount =
      tripCounts[vehicleItem.id] || 0;

    if (knownTripCount > 0) {
      window.alert(
        `This vehicle cannot be permanently deleted because it already has ${knownTripCount} trip record${
          knownTripCount === 1 ? "" : "s"
        }. Deactivate it instead.`
      );

      return;
    }

    if (vehicleItem.status === "in-use") {
      window.alert(
        "A vehicle currently in use cannot be deleted."
      );

      return;
    }

    const confirmed = window.confirm(
      `Delete ${vehicleItem.make} ${vehicleItem.model} (${vehicleItem.registration}) permanently?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const { count, error: countError } =
        await supabase
          .from("vehicle_trips")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("vehicle_id", vehicleItem.id);

      if (countError) {
        throw countError;
      }

      if ((count || 0) > 0) {
        throw new Error(
          "This vehicle has trip history and cannot be permanently deleted. Deactivate it instead."
        );
      }

      const { error: deleteError } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleItem.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccessMessage(
        `${vehicleItem.make} ${vehicleItem.model} was permanently deleted.`
      );

      await loadVehicles();
    } catch (error) {
      console.error("Delete vehicle error:", error);

      setErrorMessage(
        error.message ||
          "Unable to delete the vehicle."
      );
    }
  }

  function formatStatus(status) {
    if (!status) return "UNKNOWN";

    return status
      .replaceAll("-", " ")
      .toUpperCase();
  }

  function getStatusClass(status) {
    switch (status) {
      case "available":
        return "fleet-status-available";

      case "in-use":
        return "fleet-status-in-use";

      case "reserved":
        return "fleet-status-reserved";

      case "maintenance":
      case "unavailable":
        return "fleet-status-unavailable";

      default:
        return "";
    }
  }

  const activeVehicles = vehicles.filter(
    (vehicleItem) =>
      vehicleItem.active !== false
  );

  const inactiveVehicles = vehicles.filter(
    (vehicleItem) =>
      vehicleItem.active === false
  );

  return (
    <main className="vehicle-management-page">
      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="fleet-header">
        <div className="fleet-header-inner">
          <div className="fleet-header-left">
            <Link
              to="/"
              className="fleet-back-button"
            >
              <FaArrowLeft />
            </Link>

            <AEDCLogo
              compact
              className="fleet-logo"
            />

            <div className="fleet-header-title">
              <span>
                AEDC VEHICLE MANAGEMENT
              </span>

              <h1>
                Company Vehicles
              </h1>

              <p>
                Manage AEDC pool vehicles and
                fleet availability.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="fleet-add-button"
            onClick={openAddVehicle}
          >
            <FaPlus />

            Add Vehicle
          </button>
        </div>
      </header>

      <section className="fleet-content">
        {/* ==========================================
            MESSAGES
        ========================================== */}

        {errorMessage && (
          <div className="fleet-message fleet-message-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="fleet-message fleet-message-success">
            <FaCheckCircle />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        {/* ==========================================
            ADD / EDIT FORM
        ========================================== */}

        {showForm && (
          <section className="fleet-form-card">
            <div className="fleet-form-heading">
              <div>
                <span>
                  {editingVehicle
                    ? "EDIT VEHICLE"
                    : "NEW VEHICLE"}
                </span>

                <h2>
                  {editingVehicle
                    ? `${editingVehicle.make} ${editingVehicle.model}`
                    : "Add Company Vehicle"}
                </h2>

                <p>
                  Enter the official vehicle
                  information below.
                </p>
              </div>

              <button
                type="button"
                className="fleet-close-button"
                onClick={closeForm}
                aria-label="Close vehicle form"
              >
                <FaTimes />
              </button>
            </div>

            <form
              className="fleet-form"
              onSubmit={handleSubmit}
            >
              <div className="fleet-form-grid">
                <div className="fleet-field">
                  <label htmlFor="make">
                    Make *
                  </label>

                  <input
                    id="make"
                    name="make"
                    type="text"
                    value={formData.make}
                    onChange={handleChange}
                    placeholder="e.g. Volkswagen"
                    required
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="model">
                    Model *
                  </label>

                  <input
                    id="model"
                    name="model"
                    type="text"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="e.g. Polo TSI"
                    required
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="registration">
                    Registration Number *
                  </label>

                  <input
                    id="registration"
                    name="registration"
                    type="text"
                    value={formData.registration}
                    onChange={handleChange}
                    placeholder="e.g. AB 12 CD GP"
                    required
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="classification">
                    Classification
                  </label>

                  <input
                    id="classification"
                    name="classification"
                    type="text"
                    value={formData.classification}
                    onChange={handleChange}
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="current_odometer">
                    Current Odometer (km) *
                  </label>

                  <input
                    id="current_odometer"
                    name="current_odometer"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.current_odometer}
                    onChange={handleChange}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="status">
                    Vehicle Status
                  </label>

                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="available">
                      Available
                    </option>

                    <option value="reserved">
                      Reserved
                    </option>

                    <option value="maintenance">
                      Maintenance
                    </option>

                    <option value="unavailable">
                      Unavailable
                    </option>
                  </select>
                </div>

                <div className="fleet-field">
                  <label htmlFor="default_parking">
                    Default Parking
                  </label>

                  <input
                    id="default_parking"
                    name="default_parking"
                    type="text"
                    value={formData.default_parking}
                    onChange={handleChange}
                    placeholder="Office Basement"
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="custodian">
                    Vehicle Custodian
                  </label>

                  <input
                    id="custodian"
                    name="custodian"
                    type="text"
                    value={formData.custodian}
                    onChange={handleChange}
                    placeholder="Facilities Manager"
                  />
                </div>

                <div className="fleet-field fleet-field-full">
                  <label htmlFor="registered_keeper">
                    Registered Keeper
                  </label>

                  <input
                    id="registered_keeper"
                    name="registered_keeper"
                    type="text"
                    value={
                      formData.registered_keeper
                    }
                    onChange={handleChange}
                  />
                </div>

                <div className="fleet-field fleet-field-full">
                  <label htmlFor="notes">
                    Notes
                  </label>

                  <textarea
                    id="notes"
                    name="notes"
                    rows="4"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Optional vehicle notes..."
                  />
                </div>
              </div>

              <label className="fleet-checkbox">
                <input
                  name="roadworthy"
                  type="checkbox"
                  checked={formData.roadworthy}
                  onChange={handleChange}
                />

                <span>
                  Vehicle is currently roadworthy
                </span>
              </label>

              <div className="fleet-form-actions">
                <button
                  type="button"
                  className="fleet-cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="fleet-save-button"
                  disabled={saving}
                >
                  <FaSave />

                  {saving
                    ? "Saving..."
                    : editingVehicle
                    ? "Save Changes"
                    : "Add Vehicle"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ==========================================
            SUMMARY
        ========================================== */}

        <div className="fleet-summary-grid">
          <article>
            <FaCar />

            <div>
              <span>Total Vehicles</span>

              <strong>
                {vehicles.length}
              </strong>
            </div>
          </article>

          <article>
            <FaCheckCircle />

            <div>
              <span>Active Vehicles</span>

              <strong>
                {activeVehicles.length}
              </strong>
            </div>
          </article>

          <article>
            <FaPowerOff />

            <div>
              <span>Inactive Vehicles</span>

              <strong>
                {inactiveVehicles.length}
              </strong>
            </div>
          </article>
        </div>

        {/* ==========================================
            ACTIVE VEHICLES
        ========================================== */}

        <section className="fleet-section">
          <div className="fleet-section-heading">
            <span>
              ACTIVE FLEET
            </span>

            <h2>
              Company Vehicles
            </h2>

            <p>
              Vehicles currently enabled for AEDC
              fleet operations.
            </p>
          </div>

          {loading ? (
            <div className="fleet-empty">
              Loading vehicles...
            </div>
          ) : activeVehicles.length === 0 ? (
            <div className="fleet-empty">
              <FaCar />

              <h3>
                No active vehicles
              </h3>

              <p>
                Add a company vehicle to begin.
              </p>

              <button
                type="button"
                onClick={openAddVehicle}
              >
                <FaPlus />
                Add Vehicle
              </button>
            </div>
          ) : (
            <div className="fleet-grid">
              {activeVehicles.map(
                (vehicleItem) => (
                  <VehicleCard
                    key={vehicleItem.id}
                    vehicle={vehicleItem}
                    tripCount={
                      tripCounts[
                        vehicleItem.id
                      ] || 0
                    }
                    getStatusClass={
                      getStatusClass
                    }
                    formatStatus={
                      formatStatus
                    }
                    onEdit={
                      openEditVehicle
                    }
                    onToggle={
                      toggleVehicleActive
                    }
                    onDelete={
                      deleteVehicle
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* ==========================================
            INACTIVE VEHICLES
        ========================================== */}

        {inactiveVehicles.length > 0 && (
          <section className="fleet-section">
            <div className="fleet-section-heading">
              <span>
                ARCHIVED FLEET
              </span>

              <h2>
                Inactive Vehicles
              </h2>

              <p>
                These vehicles cannot be used for
                new bookings, but their historical
                records remain available.
              </p>
            </div>

            <div className="fleet-grid">
              {inactiveVehicles.map(
                (vehicleItem) => (
                  <VehicleCard
                    key={vehicleItem.id}
                    vehicle={vehicleItem}
                    tripCount={
                      tripCounts[
                        vehicleItem.id
                      ] || 0
                    }
                    getStatusClass={
                      getStatusClass
                    }
                    formatStatus={
                      formatStatus
                    }
                    onEdit={
                      openEditVehicle
                    }
                    onToggle={
                      toggleVehicleActive
                    }
                    onDelete={
                      deleteVehicle
                    }
                  />
                )
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

/* =========================================================
   VEHICLE CARD
========================================================= */

function VehicleCard({
  vehicle,
  tripCount,
  getStatusClass,
  formatStatus,
  onEdit,
  onToggle,
  onDelete,
}) {
  return (
    <article
      className={`fleet-vehicle-card ${
        vehicle.active === false
          ? "fleet-vehicle-inactive"
          : ""
      }`}
    >
      <div className="fleet-vehicle-top">
        <div className="fleet-car-icon">
          <FaCar />
        </div>

        <div
          className={`fleet-status ${getStatusClass(
            vehicle.status
          )}`}
        >
          {formatStatus(vehicle.status)}
        </div>
      </div>

      <div className="fleet-vehicle-title">
        <span>{vehicle.make}</span>

        <h3>{vehicle.model}</h3>

        <p>
          {vehicle.registration ||
            "Registration not recorded"}
        </p>
      </div>

      <div className="fleet-vehicle-details">
        <div>
          <FaRoad />

          <span>Odometer</span>

          <strong>
            {Number(
              vehicle.current_odometer || 0
            ).toLocaleString("en-ZA")}{" "}
            km
          </strong>
        </div>

        <div>
          <FaCheckCircle />

          <span>Roadworthy</span>

          <strong>
            {vehicle.roadworthy
              ? "Yes"
              : "No"}
          </strong>
        </div>

        <div>
          <FaCar />

          <span>Trips</span>

          <strong>
            {tripCount}
          </strong>
        </div>
      </div>

      {vehicle.active === false && (
        <div className="fleet-inactive-warning">
          <FaPowerOff />

          <span>
            This vehicle is inactive and cannot be
            selected for new bookings.
          </span>
        </div>
      )}

      <div className="fleet-card-actions fleet-card-actions-four">
        <Link
          to={`/vehicles/${vehicle.id}`}
          className="fleet-view-action"
        >
          <FaCar />
          View
        </Link>

        <button
          type="button"
          className="fleet-edit-action"
          onClick={() =>
            onEdit(vehicle)
          }
        >
          <FaEdit />
          Edit
        </button>

        <button
          type="button"
          className="fleet-toggle-action"
          onClick={() =>
            onToggle(vehicle)
          }
        >
          <FaPowerOff />

          {vehicle.active === false
            ? "Reactivate"
            : "Deactivate"}
        </button>

        <button
          type="button"
          className="fleet-delete-action"
          onClick={() =>
            onDelete(vehicle)
          }
        >
          <FaTrash />
          Delete
        </button>
      </div>
    </article>
  );
}

export default VehicleManagement;