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
  FaBox,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTruck,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import "../Styles/TransportJobs.css";


const emptyForm = {
  customer_id: "",
  customer_reference: "",
  status: "draft",
  pickup_address: "",
  delivery_address: "",
  pickup_contact_name: "",
  pickup_contact_phone: "",
  delivery_contact_name: "",
  delivery_contact_phone: "",
  cargo_description: "",
  load_weight_kg: "",
  load_units: "",
  special_instructions: "",
  planned_pickup_at: "",
  planned_delivery_at: "",
  vehicle_id: "",
  driver_id: "",
  quoted_amount: "",
  actual_revenue: "",
  notes: "",
  created_by: "Fleet Admin",
};


function formatDateTime(value) {
  if (!value) {
    return "Not scheduled";
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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not recorded";
  }

  return new Intl.NumberFormat(
    "en-ZA",
    {
      style: "currency",
      currency: "ZAR",
    }
  ).format(Number(value));
}


function formatLabel(value) {
  if (!value) {
    return "Not recorded";
  }

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function TransportJobs() {
  const [jobs, setJobs] =
    useState([]);

  const [customers, setCustomers] =
    useState([]);

  const [vehicles, setVehicles] =
    useState([]);

  const [drivers, setDrivers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filter, setFilter] =
    useState("active");

  const [showForm, setShowForm] =
    useState(false);

  const [editingJob, setEditingJob] =
    useState(null);

  const [formData, setFormData] =
    useState(emptyForm);


  useEffect(() => {
    loadData();
  }, []);


  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        jobResult,
        customerResult,
        vehicleResult,
        driverResult,
      ] = await Promise.all([
        supabase
          .from("transport_jobs")
          .select(`
            *,
            fleet_customers (
              id,
              company_name,
              customer_code
            ),
            vehicles (
              id,
              make,
              model,
              registration,
              status
            ),
            drivers (
              id,
              full_name,
              employee_number,
              driver_status
            )
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("fleet_customers")
          .select("*")
          .eq("active", true)
          .order(
            "company_name",
            {
              ascending: true,
            }
          ),

        supabase
          .from("vehicles")
          .select("*")
          .eq("active", true)
          .eq("roadworthy", true)
          .in(
            "status",
            [
              "available",
              "reserved",
            ]
          )
          .order(
            "make",
            {
              ascending: true,
            }
          ),

        supabase
          .from("drivers")
          .select("*")
          .eq("active", true)
          .eq("is_driver", true)
          .eq(
            "authorized_to_drive",
            true
          )
          .order(
            "full_name",
            {
              ascending: true,
            }
          ),
      ]);

      if (jobResult.error) {
        throw jobResult.error;
      }

      if (customerResult.error) {
        throw customerResult.error;
      }

      if (vehicleResult.error) {
        throw vehicleResult.error;
      }

      if (driverResult.error) {
        throw driverResult.error;
      }

      setJobs(
        jobResult.data || []
      );

      setCustomers(
        customerResult.data || []
      );

      setVehicles(
        vehicleResult.data || []
      );

      setDrivers(
        driverResult.data || []
      );
    } catch (error) {
      console.error(
        "Transport jobs load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load transport jobs."
      );
    } finally {
      setLoading(false);
    }
  }


  function openCreate() {
    setEditingJob(null);

    setFormData({
      ...emptyForm,
    });

    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }


  function openEdit(job) {
    setEditingJob(job);

    setFormData({
      customer_id:
        job.customer_id || "",
      customer_reference:
        job.customer_reference || "",
      status:
        job.status || "draft",
      pickup_address:
        job.pickup_address || "",
      delivery_address:
        job.delivery_address || "",
      pickup_contact_name:
        job.pickup_contact_name || "",
      pickup_contact_phone:
        job.pickup_contact_phone || "",
      delivery_contact_name:
        job.delivery_contact_name || "",
      delivery_contact_phone:
        job.delivery_contact_phone || "",
      cargo_description:
        job.cargo_description || "",
      load_weight_kg:
        job.load_weight_kg ?? "",
      load_units:
        job.load_units ?? "",
      special_instructions:
        job.special_instructions || "",
      planned_pickup_at:
        job.planned_pickup_at
          ? new Date(
              job.planned_pickup_at
            )
              .toISOString()
              .slice(0, 16)
          : "",
      planned_delivery_at:
        job.planned_delivery_at
          ? new Date(
              job.planned_delivery_at
            )
              .toISOString()
              .slice(0, 16)
          : "",
      vehicle_id:
        job.vehicle_id || "",
      driver_id:
        job.driver_id || "",
      quoted_amount:
        job.quoted_amount ?? "",
      actual_revenue:
        job.actual_revenue ?? "",
      notes:
        job.notes || "",
      created_by:
        job.created_by ||
        "Fleet Admin",
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
    setEditingJob(null);
    setFormData({
      ...emptyForm,
    });
  }


  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }


  async function saveJob(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!formData.customer_id) {
        throw new Error(
          "Select a customer."
        );
      }

      if (
        !formData.pickup_address
          .trim()
      ) {
        throw new Error(
          "Pickup address is required."
        );
      }

      if (
        !formData.delivery_address
          .trim()
      ) {
        throw new Error(
          "Delivery address is required."
        );
      }

      const payload = {
        customer_id:
          formData.customer_id,

        customer_reference:
          formData.customer_reference
            .trim() || null,

        status:
          formData.status,

        pickup_address:
          formData.pickup_address
            .trim(),

        delivery_address:
          formData.delivery_address
            .trim(),

        pickup_contact_name:
          formData.pickup_contact_name
            .trim() || null,

        pickup_contact_phone:
          formData.pickup_contact_phone
            .trim() || null,

        delivery_contact_name:
          formData.delivery_contact_name
            .trim() || null,

        delivery_contact_phone:
          formData.delivery_contact_phone
            .trim() || null,

        cargo_description:
          formData.cargo_description
            .trim() || null,

        load_weight_kg:
          formData.load_weight_kg ===
          ""
            ? null
            : Number(
                formData
                  .load_weight_kg
              ),

        load_units:
          formData.load_units === ""
            ? null
            : Number(
                formData.load_units
              ),

        special_instructions:
          formData.special_instructions
            .trim() || null,

        planned_pickup_at:
          formData.planned_pickup_at
            ? new Date(
                formData
                  .planned_pickup_at
              ).toISOString()
            : null,

        planned_delivery_at:
          formData.planned_delivery_at
            ? new Date(
                formData
                  .planned_delivery_at
              ).toISOString()
            : null,

        vehicle_id:
          formData.vehicle_id ||
          null,

        driver_id:
          formData.driver_id ||
          null,

        quoted_amount:
          formData.quoted_amount ===
          ""
            ? null
            : Number(
                formData
                  .quoted_amount
              ),

        actual_revenue:
          formData.actual_revenue ===
          ""
            ? null
            : Number(
                formData
                  .actual_revenue
              ),

        notes:
          formData.notes
            .trim() || null,

        created_by:
          formData.created_by
            .trim() ||
          "Fleet Admin",
      };


      let query;

      if (editingJob) {
        query = supabase
          .from("transport_jobs")
          .update(payload)
          .eq(
            "id",
            editingJob.id
          );
      } else {
        query = supabase
          .from("transport_jobs")
          .insert(payload);
      }


      const {
        error,
      } = await query;

      if (error) {
        throw error;
      }

      setSuccessMessage(
        editingJob
          ? "Transport job updated."
          : "Transport job created."
      );

      closeForm();

      await loadData();
    } catch (error) {
      console.error(
        "Save transport job error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to save transport job."
      );
    } finally {
      setSaving(false);
    }
  }


  async function updateStatus(
    job,
    status
  ) {
    try {
      setActionLoading(
        job.id
      );

      setErrorMessage("");
      setSuccessMessage("");

      const {
        error,
      } = await supabase.rpc(
        "admin_update_transport_job",
        {
          p_job_id:
            job.id,

          p_status:
            status,

          p_vehicle_id:
            job.vehicle_id ||
            null,

          p_driver_id:
            job.driver_id ||
            null,
        }
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        `${job.job_reference} moved to ${formatLabel(
          status
        )}.`
      );

      await loadData();
    } catch (error) {
      console.error(
        "Job status error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update transport job."
      );
    } finally {
      setActionLoading("");
    }
  }


  const stats = useMemo(() => ({
    draft:
      jobs.filter(
        (job) =>
          job.status === "draft"
      ).length,

    scheduled:
      jobs.filter(
        (job) =>
          [
            "scheduled",
            "assigned",
          ].includes(
            job.status
          )
      ).length,

    active:
      jobs.filter(
        (job) =>
          job.status ===
          "in_progress"
      ).length,

    completed:
      jobs.filter(
        (job) =>
          [
            "delivered",
            "completed",
          ].includes(
            job.status
          )
      ).length,
  }), [jobs]);


  const visibleJobs =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return jobs.filter(
        (job) => {
          if (
            filter === "active" &&
            ![
              "draft",
              "scheduled",
              "assigned",
              "in_progress",
              "delivered",
            ].includes(
              job.status
            )
          ) {
            return false;
          }

          if (
            filter !== "active" &&
            filter !== "all" &&
            job.status !== filter
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          return [
            job.job_reference,
            job.customer_reference,
            job.fleet_customers
              ?.company_name,
            job.pickup_address,
            job.delivery_address,
            job.cargo_description,
            job.vehicles
              ?.registration,
            job.drivers
              ?.full_name,
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
      jobs,
      filter,
      searchTerm,
    ]);


  return (
    <main className="jobs-page">
      <header className="jobs-header">
        <div className="jobs-header-inner">
          <div className="jobs-header-left">
            <Link
              to="/"
              className="jobs-back"
            >
              <FaArrowLeft />
            </Link>

          </div>

          <button
            type="button"
            className="jobs-create-button"
            onClick={openCreate}
          >
            <FaPlus />
            New Transport Job
          </button>
        </div>
      </header>


      <section className="jobs-content">
        {errorMessage && (
          <div className="jobs-message jobs-error">
            <FaTruck />
            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="jobs-message jobs-success">
            <FaCheckCircle />
            <span>
              {successMessage}
            </span>
          </div>
        )}


        <section className="jobs-summary">
          <article>
            <span>
              Draft
            </span>
            <strong>
              {stats.draft}
            </strong>
          </article>

          <article>
            <span>
              Scheduled / Assigned
            </span>
            <strong>
              {stats.scheduled}
            </strong>
          </article>

          <article>
            <span>
              In Progress
            </span>
            <strong>
              {stats.active}
            </strong>
          </article>

          <article>
            <span>
              Delivered / Completed
            </span>
            <strong>
              {stats.completed}
            </strong>
          </article>
        </section>


        <section className="jobs-toolbar">
          <div className="jobs-search">
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
              placeholder="Search job, customer, address, vehicle or driver..."
            />
          </div>

          <div className="jobs-tabs">
            {[
              ["active", "Active"],
              ["draft", "Draft"],
              ["scheduled", "Scheduled"],
              ["assigned", "Assigned"],
              ["in_progress", "In Progress"],
              ["completed", "Completed"],
              ["all", "All"],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    filter === value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(value)
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        </section>


        {loading ? (
          <section className="jobs-empty">
            <FaTruck />
            <h2>
              Loading jobs...
            </h2>
          </section>
        ) : visibleJobs.length ===
          0 ? (
          <section className="jobs-empty">
            <FaBox />
            <h2>
              No transport jobs
            </h2>
            <p>
              Create the first customer job
              to begin scheduling deliveries.
            </p>
          </section>
        ) : (
          <section className="jobs-grid">
            {visibleJobs.map(
              (job) => {
                const customer =
                  job.fleet_customers ||
                  {};

                const vehicle =
                  job.vehicles ||
                  {};

                const driver =
                  job.drivers ||
                  {};

                return (
                  <article
                    key={job.id}
                    className="job-card"
                  >
                    <div className="job-card-top">
                      <div>
                        <span>
                          {
                            job.job_reference
                          }
                        </span>
                        <strong>
                          {customer.company_name ||
                            "Customer"}
                        </strong>
                      </div>

                      <span
                        className={`job-status job-status-${job.status}`}
                      >
                        {formatLabel(
                          job.status
                        )}
                      </span>
                    </div>


                    <div className="job-route">
                      <div>
                        <FaMapMarkerAlt />
                        <span>
                          PICKUP
                        </span>
                        <strong>
                          {
                            job.pickup_address
                          }
                        </strong>
                      </div>

                      <div className="job-route-line" />

                      <div>
                        <FaMapMarkerAlt />
                        <span>
                          DELIVERY
                        </span>
                        <strong>
                          {
                            job.delivery_address
                          }
                        </strong>
                      </div>
                    </div>


                    <div className="job-details">
                      <div>
                        <FaCalendarAlt />
                        <span>
                          Pickup
                        </span>
                        <strong>
                          {formatDateTime(
                            job.planned_pickup_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <FaBox />
                        <span>
                          Cargo
                        </span>
                        <strong>
                          {job.cargo_description ||
                            "Not recorded"}
                        </strong>
                      </div>

                      <div>
                        <FaCar />
                        <span>
                          Vehicle
                        </span>
                        <strong>
                          {vehicle.registration ||
                            "Not assigned"}
                        </strong>
                      </div>

                      <div>
                        <FaUser />
                        <span>
                          Driver
                        </span>
                        <strong>
                          {driver.full_name ||
                            "Not assigned"}
                        </strong>
                      </div>
                    </div>


                    <div className="job-commercial">
                      <div>
                        <span>
                          Customer Ref
                        </span>
                        <strong>
                          {job.customer_reference ||
                            "Not recorded"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Quote
                        </span>
                        <strong>
                          {money(
                            job.quoted_amount
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Load
                        </span>
                        <strong>
                          {job.load_weight_kg !=
                          null
                            ? `${Number(
                                job.load_weight_kg
                              ).toLocaleString(
                                "en-ZA"
                              )} kg`
                            : "Not recorded"}
                        </strong>
                      </div>
                    </div>


                    <div className="job-actions">
                      <button
                        type="button"
                        onClick={() =>
                          openEdit(job)
                        }
                      >
                        Edit / Assign
                      </button>

                      {job.status ===
                        "draft" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              job,
                              "scheduled"
                            )
                          }
                          disabled={
                            actionLoading ===
                            job.id
                          }
                        >
                          Schedule
                        </button>
                      )}

                      {job.status ===
                        "scheduled" &&
                        job.vehicle_id &&
                        job.driver_id && (
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              job,
                              "assigned"
                            )
                          }
                          disabled={
                            actionLoading ===
                            job.id
                          }
                        >
                          Confirm Assignment
                        </button>
                      )}

                      {job.status ===
                        "assigned" && (
                        <Link
                          to="/dispatch"
                          className="job-dispatch-link"
                        >
                          Open Dispatch
                        </Link>
                      )}

                      {job.status ===
                        "in_progress" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              job,
                              "delivered"
                            )
                          }
                          disabled={
                            actionLoading ===
                            job.id
                          }
                        >
                          Mark Delivered
                        </button>
                      )}

                      {job.status ===
                        "delivered" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus(
                              job,
                              "completed"
                            )
                          }
                          disabled={
                            actionLoading ===
                            job.id
                          }
                        >
                          Complete Job
                        </button>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </section>
        )}
      </section>


      {showForm && (
        <div className="jobs-modal-backdrop">
          <section className="jobs-modal">
            <div className="jobs-modal-heading">
              <div>
                <span>
                  {editingJob
                    ? editingJob.job_reference
                    : "NEW TRANSPORT JOB"}
                </span>

                <h2>
                  {editingJob
                    ? "Edit Transport Job"
                    : "Create Transport Job"}
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
              className="jobs-form"
              onSubmit={saveJob}
            >
              <label>
                Customer *
                <select
                  name="customer_id"
                  value={
                    formData.customer_id
                  }
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {
                          customer.company_name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Customer Reference
                <input
                  name="customer_reference"
                  value={
                    formData
                      .customer_reference
                  }
                  onChange={handleChange}
                  placeholder="PO / delivery reference"
                />
              </label>

              <label className="jobs-form-full">
                Pickup Address *
                <textarea
                  name="pickup_address"
                  rows="2"
                  value={
                    formData
                      .pickup_address
                  }
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="jobs-form-full">
                Delivery Address *
                <textarea
                  name="delivery_address"
                  rows="2"
                  value={
                    formData
                      .delivery_address
                  }
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Pickup Contact
                <input
                  name="pickup_contact_name"
                  value={
                    formData
                      .pickup_contact_name
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Pickup Phone
                <input
                  name="pickup_contact_phone"
                  value={
                    formData
                      .pickup_contact_phone
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Delivery Contact
                <input
                  name="delivery_contact_name"
                  value={
                    formData
                      .delivery_contact_name
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Delivery Phone
                <input
                  name="delivery_contact_phone"
                  value={
                    formData
                      .delivery_contact_phone
                  }
                  onChange={handleChange}
                />
              </label>

              <label className="jobs-form-full">
                Cargo Description
                <textarea
                  name="cargo_description"
                  rows="3"
                  value={
                    formData
                      .cargo_description
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Load Weight (kg)
                <input
                  name="load_weight_kg"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formData
                      .load_weight_kg
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Load Units
                <input
                  name="load_units"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    formData.load_units
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Planned Pickup
                <input
                  name="planned_pickup_at"
                  type="datetime-local"
                  value={
                    formData
                      .planned_pickup_at
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Planned Delivery
                <input
                  name="planned_delivery_at"
                  type="datetime-local"
                  value={
                    formData
                      .planned_delivery_at
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Vehicle
                <select
                  name="vehicle_id"
                  value={
                    formData.vehicle_id
                  }
                  onChange={handleChange}
                >
                  <option value="">
                    Not assigned
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
                Driver
                <select
                  name="driver_id"
                  value={
                    formData.driver_id
                  }
                  onChange={handleChange}
                >
                  <option value="">
                    Not assigned
                  </option>

                  {drivers.map(
                    (driver) => (
                      <option
                        key={
                          driver.id
                        }
                        value={
                          driver.id
                        }
                      >
                        {driver.full_name} —{" "}
                        {
                          driver.employee_number
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Quoted Amount (R)
                <input
                  name="quoted_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formData
                      .quoted_amount
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Actual Revenue (R)
                <input
                  name="actual_revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formData
                      .actual_revenue
                  }
                  onChange={handleChange}
                />
              </label>

              <label className="jobs-form-full">
                Special Instructions
                <textarea
                  name="special_instructions"
                  rows="3"
                  value={
                    formData
                      .special_instructions
                  }
                  onChange={handleChange}
                />
              </label>

              <label className="jobs-form-full">
                Notes
                <textarea
                  name="notes"
                  rows="3"
                  value={
                    formData.notes
                  }
                  onChange={handleChange}
                />
              </label>

              <div className="jobs-modal-actions">
                <button
                  type="button"
                  className="jobs-cancel"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="jobs-save"
                  disabled={saving}
                >
                  <FaCheckCircle />

                  {saving
                    ? "Saving..."
                    : editingJob
                    ? "Save Job"
                    : "Create Job"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


export default TransportJobs;
