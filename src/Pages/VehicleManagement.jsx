import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  FaArrowLeft,
  FaBarcode,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaGasPump,
  FaPlus,
  FaPowerOff,
  FaRoad,
  FaSave,
  FaShieldAlt,
  FaTimes,
  FaTruck,
  FaTrash,
  FaWeightHanging,
  FaWrench,
} from "react-icons/fa";

import "../Styles/VehicleManagement.css";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";



const emptyForm = {
  make: "",
  model: "",
  registration: "",
  vin: "",
  engine_number: "",
  chassis_number: "",
  vehicle_year: "",
  vehicle_type: "Passenger Vehicle",
  classification: "Pool Vehicle",
  fuel_type: "",
  ownership_type: "company-owned",
  load_capacity_kg: "",
  registered_keeper:
    "African Entrepreneurship Development Corporation",
  default_parking: "Office Basement",
  custodian: "Facilities Manager",
  current_odometer: "",
  service_interval_km: "",
  last_service_odometer: "",
  next_service_date: "",
  licence_expiry: "",
  insurance_expiry: "",
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
      vin: vehicleItem.vin || "",
      engine_number: vehicleItem.engine_number || "",
      chassis_number: vehicleItem.chassis_number || "",
      vehicle_year: vehicleItem.vehicle_year ?? "",
      vehicle_type:
        vehicleItem.vehicle_type || "Passenger Vehicle",
      classification:
        vehicleItem.classification || "Pool Vehicle",
      fuel_type: vehicleItem.fuel_type || "",
      ownership_type:
        vehicleItem.ownership_type || "company-owned",
      load_capacity_kg:
        vehicleItem.load_capacity_kg ?? "",
      registered_keeper:
        vehicleItem.registered_keeper ||
        "African Entrepreneurship Development Corporation",
      default_parking:
        vehicleItem.default_parking || "Office Basement",
      custodian:
        vehicleItem.custodian || "Facilities Manager",
      current_odometer:
        vehicleItem.current_odometer ?? "",
      service_interval_km:
        vehicleItem.service_interval_km ?? "",
      last_service_odometer:
        vehicleItem.last_service_odometer ?? "",
      next_service_date:
        vehicleItem.next_service_date || "",
      licence_expiry:
        vehicleItem.licence_expiry || "",
      insurance_expiry:
        vehicleItem.insurance_expiry || "",
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

      if (
        formData.vehicle_year !== "" &&
        (Number(formData.vehicle_year) < 1950 ||
          Number(formData.vehicle_year) > 2100)
      ) {
        throw new Error(
          "Please enter a valid vehicle year."
        );
      }

      if (
        formData.load_capacity_kg !== "" &&
        Number(formData.load_capacity_kg) < 0
      ) {
        throw new Error(
          "Load capacity cannot be negative."
        );
      }

      if (
        formData.service_interval_km !== "" &&
        Number(formData.service_interval_km) <= 0
      ) {
        throw new Error(
          "Service interval must be greater than zero."
        );
      }

      if (
        formData.last_service_odometer !== "" &&
        Number(formData.last_service_odometer) < 0
      ) {
        throw new Error(
          "Last service odometer cannot be negative."
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

        vin: formData.vin.trim().toUpperCase() || null,

        engine_number:
          formData.engine_number.trim().toUpperCase() || null,

        chassis_number:
          formData.chassis_number.trim().toUpperCase() || null,

        vehicle_year:
          formData.vehicle_year === ""
            ? null
            : Number(formData.vehicle_year),

        vehicle_type:
          formData.vehicle_type.trim() || "Passenger Vehicle",

        classification:
          formData.classification.trim() || "Pool Vehicle",

        fuel_type:
          formData.fuel_type.trim() || null,

        ownership_type:
          formData.ownership_type || "company-owned",

        load_capacity_kg:
          formData.load_capacity_kg === ""
            ? null
            : Number(formData.load_capacity_kg),

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

        service_interval_km:
          formData.service_interval_km === ""
            ? null
            : Number(formData.service_interval_km),

        last_service_odometer:
          formData.last_service_odometer === ""
            ? null
            : Number(formData.last_service_odometer),

        next_service_date:
          formData.next_service_date || null,

        licence_expiry:
          formData.licence_expiry || null,

        insurance_expiry:
          formData.insurance_expiry || null,

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

  function formatDateOnly(value) {
    if (!value) return "Not recorded";

    return new Intl.DateTimeFormat("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  }

  function daysUntil(value) {
    if (!value) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(`${value}T12:00:00`);
    target.setHours(0, 0, 0, 0);

    return Math.ceil(
      (target.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  function getDateAlert(value) {
    const remaining = daysUntil(value);

    if (remaining === null) {
      return {
        label: "Not recorded",
        className: "",
      };
    }

    if (remaining < 0) {
      return {
        label: `Expired ${Math.abs(remaining)} day${
          Math.abs(remaining) === 1 ? "" : "s"
        } ago`,
        className: "fleet-compliance-danger",
      };
    }

    if (remaining <= 30) {
      return {
        label: `${remaining} day${
          remaining === 1 ? "" : "s"
        } remaining`,
        className: "fleet-compliance-warning",
      };
    }

    return {
      label: formatDateOnly(value),
      className: "fleet-compliance-good",
    };
  }

  function getServiceRemainingKm(vehicleItem) {
    if (
      vehicleItem.service_interval_km == null ||
      vehicleItem.last_service_odometer == null
    ) {
      return null;
    }

    const nextServiceOdometer =
      Number(vehicleItem.last_service_odometer) +
      Number(vehicleItem.service_interval_km);

    return (
      nextServiceOdometer -
      Number(vehicleItem.current_odometer || 0)
    );
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

            <div className="fleet-header-title">

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
                  Enter vehicle identity, capacity,
                  service and compliance information.
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
                  <label htmlFor="vehicle_year">
                    Vehicle Year
                  </label>

                  <input
                    id="vehicle_year"
                    name="vehicle_year"
                    type="number"
                    min="1950"
                    max="2100"
                    value={formData.vehicle_year}
                    onChange={handleChange}
                    placeholder="e.g. 2024"
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="vehicle_type">
                    Vehicle Type
                  </label>

                  <select
                    id="vehicle_type"
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleChange}
                  >
                    <option value="Passenger Vehicle">
                      Passenger Vehicle
                    </option>
                    <option value="Bakkie">Bakkie</option>
                    <option value="Delivery Van">
                      Delivery Van
                    </option>
                    <option value="Light Truck">
                      Light Truck
                    </option>
                    <option value="Heavy Truck">
                      Heavy Truck
                    </option>
                    <option value="Tractor Unit">
                      Tractor Unit
                    </option>
                    <option value="Trailer">Trailer</option>
                    <option value="Bus">Bus</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="fleet-field">
                  <label htmlFor="fuel_type">
                    Fuel Type
                  </label>

                  <select
                    id="fuel_type"
                    name="fuel_type"
                    value={formData.fuel_type}
                    onChange={handleChange}
                  >
                    <option value="">Select fuel type</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="fleet-field">
                  <label htmlFor="ownership_type">
                    Ownership
                  </label>

                  <select
                    id="ownership_type"
                    name="ownership_type"
                    value={formData.ownership_type}
                    onChange={handleChange}
                  >
                    <option value="company-owned">
                      Company Owned
                    </option>
                    <option value="leased">Leased</option>
                    <option value="financed">Financed</option>
                    <option value="rented">Rented</option>
                    <option value="contractor">
                      Contractor Vehicle
                    </option>
                  </select>
                </div>

                <div className="fleet-field">
                  <label htmlFor="load_capacity_kg">
                    Load Capacity (kg)
                  </label>

                  <input
                    id="load_capacity_kg"
                    name="load_capacity_kg"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.load_capacity_kg}
                    onChange={handleChange}
                    placeholder="e.g. 1200"
                  />
                </div>

                <div className="fleet-field fleet-field-full">
                  <label htmlFor="vin">VIN</label>

                  <input
                    id="vin"
                    name="vin"
                    type="text"
                    value={formData.vin}
                    onChange={handleChange}
                    placeholder="17-character vehicle identification number"
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="engine_number">
                    Engine Number
                  </label>

                  <input
                    id="engine_number"
                    name="engine_number"
                    type="text"
                    value={formData.engine_number}
                    onChange={handleChange}
                    placeholder="Engine number"
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="chassis_number">
                    Chassis Number
                  </label>

                  <input
                    id="chassis_number"
                    name="chassis_number"
                    type="text"
                    value={formData.chassis_number}
                    onChange={handleChange}
                    placeholder="Chassis number"
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
                  <label htmlFor="service_interval_km">
                    Service Interval (km)
                  </label>

                  <input
                    id="service_interval_km"
                    name="service_interval_km"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.service_interval_km}
                    onChange={handleChange}
                    placeholder="e.g. 15000"
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="last_service_odometer">
                    Last Service Odometer (km)
                  </label>

                  <input
                    id="last_service_odometer"
                    name="last_service_odometer"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.last_service_odometer}
                    onChange={handleChange}
                    placeholder="e.g. 45000"
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="next_service_date">
                    Next Service Date
                  </label>

                  <input
                    id="next_service_date"
                    name="next_service_date"
                    type="date"
                    value={formData.next_service_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="licence_expiry">
                    Licence Expiry
                  </label>

                  <input
                    id="licence_expiry"
                    name="licence_expiry"
                    type="date"
                    value={formData.licence_expiry}
                    onChange={handleChange}
                  />
                </div>

                <div className="fleet-field">
                  <label htmlFor="insurance_expiry">
                    Insurance Expiry
                  </label>

                  <input
                    id="insurance_expiry"
                    name="insurance_expiry"
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={handleChange}
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
                    formatDateOnly={
                      formatDateOnly
                    }
                    getDateAlert={
                      getDateAlert
                    }
                    getServiceRemainingKm={
                      getServiceRemainingKm
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
                    formatDateOnly={
                      formatDateOnly
                    }
                    getDateAlert={
                      getDateAlert
                    }
                    getServiceRemainingKm={
                      getServiceRemainingKm
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
  formatDateOnly,
  getDateAlert,
  getServiceRemainingKm,
  onEdit,
  onToggle,
  onDelete,
}) {
  const licenceAlert = getDateAlert(
    vehicle.licence_expiry
  );

  const insuranceAlert = getDateAlert(
    vehicle.insurance_expiry
  );

  const serviceRemainingKm =
    getServiceRemainingKm(vehicle);
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

      <div className="fleet-logistics-meta">
        <span>
          <FaTruck />
          {vehicle.vehicle_type || "Vehicle"}
        </span>

        {vehicle.vehicle_year && (
          <span>
            <FaCalendarAlt />
            {vehicle.vehicle_year}
          </span>
        )}

        {vehicle.fuel_type && (
          <span>
            <FaGasPump />
            {vehicle.fuel_type}
          </span>
        )}

        {vehicle.load_capacity_kg != null && (
          <span>
            <FaWeightHanging />
            {Number(
              vehicle.load_capacity_kg
            ).toLocaleString("en-ZA")}{" "}
            kg
          </span>
        )}
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

        <div>
          <FaWrench />

          <span>Service</span>

          <strong>
            {serviceRemainingKm === null
              ? "Not configured"
              : serviceRemainingKm < 0
              ? `${Math.abs(
                  serviceRemainingKm
                ).toLocaleString("en-ZA")} km overdue`
              : `${serviceRemainingKm.toLocaleString(
                  "en-ZA"
                )} km remaining`}
          </strong>
        </div>

        <div>
          <FaBarcode />

          <span>VIN</span>

          <strong>
            {vehicle.vin || "Not recorded"}
          </strong>
        </div>
      </div>

      <div className="fleet-compliance-grid">
        <div className={licenceAlert.className}>
          <FaCalendarAlt />

          <span>Licence</span>

          <strong>
            {vehicle.licence_expiry
              ? formatDateOnly(
                  vehicle.licence_expiry
                )
              : "Not recorded"}
          </strong>

          {vehicle.licence_expiry && (
            <small>{licenceAlert.label}</small>
          )}
        </div>

        <div className={insuranceAlert.className}>
          <FaShieldAlt />

          <span>Insurance</span>

          <strong>
            {vehicle.insurance_expiry
              ? formatDateOnly(
                  vehicle.insurance_expiry
                )
              : "Not recorded"}
          </strong>

          {vehicle.insurance_expiry && (
            <small>{insuranceAlert.label}</small>
          )}
        </div>

        <div>
          <FaWrench />

          <span>Next Service</span>

          <strong>
            {vehicle.next_service_date
              ? formatDateOnly(
                  vehicle.next_service_date
                )
              : "Not recorded"}
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