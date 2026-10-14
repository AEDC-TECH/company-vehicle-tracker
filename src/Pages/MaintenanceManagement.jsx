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
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTools,
  FaWrench,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/MaintenanceManagement.css";


const emptyJob = {
  vehicle_id: "",
  defect_id: "",
  maintenance_type: "scheduled-service",
  scheduled_date: "",
  description: "",
  service_provider: "",
  estimated_cost: "",
  created_by: "Fleet Admin",
};


function formatDate(value) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(`${value}T12:00:00`)
  );
}


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


function MaintenanceManagement() {
  const [
    jobs,
    setJobs,
  ] = useState([]);

  const [
    vehicles,
    setVehicles,
  ] = useState([]);

  const [
    defects,
    setDefects,
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
    actionLoading,
    setActionLoading,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("active");

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);

  const [
    formData,
    setFormData,
  ] = useState(emptyJob);

  const [
    completingJob,
    setCompletingJob,
  ] = useState(null);

  const [
    completion,
    setCompletion,
  ] = useState({
    odometer: "",
    actual_cost: "",
    invoice_reference: "",
    repair_notes: "",
    completed_by: "Fleet Admin",
    next_service_date: "",
    update_service_schedule: false,
    resolve_linked_defect: true,
    return_vehicle_to_service: true,
  });


  useEffect(() => {
    loadData();
  }, []);


  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        jobResult,
        vehicleResult,
        defectResult,
      ] = await Promise.all([
        supabase
          .from("fleet_maintenance")
          .select(`
            *,
            vehicles (
              id,
              make,
              model,
              registration,
              status,
              roadworthy,
              active,
              current_odometer,
              service_interval_km,
              last_service_odometer,
              next_service_date
            ),
            fleet_defects (
              id,
              title,
              severity,
              status,
              vehicle_grounded
            )
          `)
          .order(
            "created_at",
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
          .from("fleet_defects")
          .select(`
            id,
            vehicle_id,
            title,
            severity,
            status,
            vehicle_grounded
          `)
          .neq(
            "status",
            "resolved"
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),
      ]);

      if (jobResult.error) {
        throw jobResult.error;
      }

      if (vehicleResult.error) {
        throw vehicleResult.error;
      }

      if (defectResult.error) {
        throw defectResult.error;
      }

      setJobs(
        jobResult.data || []
      );

      setVehicles(
        vehicleResult.data || []
      );

      setDefects(
        defectResult.data || []
      );
    } catch (error) {
      console.error(
        "Maintenance load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load maintenance data."
      );
    } finally {
      setLoading(false);
    }
  }


  function handleCreateChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          value,
        ...(name === "vehicle_id"
          ? {
              defect_id: "",
            }
          : {}),
      })
    );

    setErrorMessage("");
    setSuccessMessage("");
  }


  async function createJob(
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
        !formData.description
          .trim()
      ) {
        throw new Error(
          "Describe the maintenance work required."
        );
      }

      const payload = {
        vehicle_id:
          formData.vehicle_id,

        defect_id:
          formData.defect_id ||
          null,

        maintenance_type:
          formData
            .maintenance_type,

        scheduled_date:
          formData.scheduled_date ||
          null,

        description:
          formData.description
            .trim(),

        service_provider:
          formData
            .service_provider
            .trim() || null,

        estimated_cost:
          formData.estimated_cost ===
          ""
            ? null
            : Number(
                formData
                  .estimated_cost
              ),

        created_by:
          formData.created_by
            .trim() ||
          "Fleet Admin",

        status:
          "scheduled",
      };

      const {
        error,
      } = await supabase
        .from("fleet_maintenance")
        .insert(payload);

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Maintenance job created."
      );

      setShowCreate(false);

      setFormData({
        ...emptyJob,
      });

      await loadData();
    } catch (error) {
      console.error(
        "Create maintenance error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to create maintenance job."
      );
    } finally {
      setSaving(false);
    }
  }


  async function changeStatus(
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
        "admin_set_fleet_maintenance_status",
        {
          p_maintenance_id:
            job.id,
          p_status:
            status,
        }
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        status === "in-progress"
          ? "Maintenance work started. Vehicle moved to MAINTENANCE."
          : "Maintenance job updated."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Maintenance status error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update maintenance job."
      );
    } finally {
      setActionLoading("");
    }
  }


  function openComplete(job) {
    const vehicle =
      job.vehicles || {};

    setCompletingJob(job);

    setCompletion({
      odometer:
        vehicle.current_odometer ??
        "",
      actual_cost:
        job.actual_cost ?? "",
      invoice_reference:
        job.invoice_reference ||
        "",
      repair_notes:
        job.repair_notes || "",
      completed_by:
        "Fleet Admin",
      next_service_date:
        job.next_service_date ||
        vehicle.next_service_date ||
        "",
      update_service_schedule:
        job.maintenance_type ===
          "scheduled-service",
      resolve_linked_defect:
        Boolean(job.defect_id),
      return_vehicle_to_service:
        true,
    });

    setErrorMessage("");
    setSuccessMessage("");
  }


  function closeComplete() {
    if (actionLoading) {
      return;
    }

    setCompletingJob(null);
  }


  function handleCompletionChange(
    event
  ) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setCompletion(
      (current) => ({
        ...current,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  }


  async function completeJob(
    event
  ) {
    event.preventDefault();

    if (!completingJob) {
      return;
    }

    try {
      setActionLoading(
        completingJob.id
      );

      setErrorMessage("");
      setSuccessMessage("");

      if (
        completion.odometer ===
          "" ||
        Number(
          completion.odometer
        ) < 0
      ) {
        throw new Error(
          "Enter a valid odometer reading."
        );
      }

      if (
        !completion.repair_notes
          .trim()
      ) {
        throw new Error(
          "Enter service or repair notes."
        );
      }

      const {
        error,
      } = await supabase.rpc(
        "admin_complete_fleet_maintenance",
        {
          p_maintenance_id:
            completingJob.id,

          p_odometer:
            Number(
              completion.odometer
            ),

          p_actual_cost:
            completion.actual_cost ===
            ""
              ? null
              : Number(
                  completion
                    .actual_cost
                ),

          p_invoice_reference:
            completion
              .invoice_reference ||
            null,

          p_repair_notes:
            completion.repair_notes,

          p_completed_by:
            completion.completed_by,

          p_next_service_date:
            completion
              .next_service_date ||
            null,

          p_update_service_schedule:
            completion
              .update_service_schedule,

          p_resolve_linked_defect:
            completion
              .resolve_linked_defect,

          p_return_vehicle_to_service:
            completion
              .return_vehicle_to_service,
        }
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        completion
          .return_vehicle_to_service
          ? "Maintenance completed and vehicle returned to service."
          : "Maintenance completed."
      );

      setCompletingJob(null);

      await loadData();
    } catch (error) {
      console.error(
        "Complete maintenance error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to complete maintenance."
      );
    } finally {
      setActionLoading("");
    }
  }


  const stats = useMemo(() => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      now.getMonth();

    const monthSpend =
      jobs
        .filter(
          (job) => {
            if (
              job.status !==
                "completed" ||
              !job.completed_at
            ) {
              return false;
            }

            const date =
              new Date(
                job.completed_at
              );

            return (
              date.getFullYear() ===
                year &&
              date.getMonth() ===
                month
            );
          }
        )
        .reduce(
          (total, job) =>
            total +
            Number(
              job.actual_cost || 0
            ),
          0
        );

    return {
      scheduled:
        jobs.filter(
          (job) =>
            job.status ===
            "scheduled"
        ).length,

      progress:
        jobs.filter(
          (job) =>
            job.status ===
            "in-progress"
        ).length,

      completed:
        jobs.filter(
          (job) =>
            job.status ===
            "completed"
        ).length,

      monthSpend,
    };
  }, [jobs]);


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
              "scheduled",
              "in-progress",
            ].includes(
              job.status
            )
          ) {
            return false;
          }

          if (
            filter === "scheduled" &&
            job.status !==
              "scheduled"
          ) {
            return false;
          }

          if (
            filter === "in-progress" &&
            job.status !==
              "in-progress"
          ) {
            return false;
          }

          if (
            filter === "completed" &&
            job.status !==
              "completed"
          ) {
            return false;
          }

          const vehicle =
            job.vehicles || {};

          const defect =
            job.fleet_defects || {};

          if (!search) {
            return true;
          }

          return [
            vehicle.make,
            vehicle.model,
            vehicle.registration,
            job.maintenance_type,
            job.description,
            job.service_provider,
            job.status,
            defect.title,
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
      searchTerm,
      filter,
    ]);


  const selectedVehicleDefects =
    defects.filter(
      (defect) =>
        defect.vehicle_id ===
        formData.vehicle_id
    );


  return (
    <main className="maintenance-page">
      <header className="maintenance-header">
        <div className="maintenance-header-inner">
          <div className="maintenance-header-left">
            <Link
              to="/"
              className="maintenance-back"
            >
              <FaArrowLeft />
            </Link>

           
          </div>

          <button
            type="button"
            className="maintenance-create-button"
            onClick={() =>
              setShowCreate(true)
            }
          >
            <FaPlus />
            New Maintenance Job
          </button>
        </div>
      </header>


      <section className="maintenance-content">
        {errorMessage && (
          <div className="maintenance-message maintenance-error">
            <FaExclamationTriangle />
            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="maintenance-message maintenance-success">
            <FaCheckCircle />
            <span>
              {successMessage}
            </span>
          </div>
        )}


        <section className="maintenance-summary">
          <article>
            <FaCalendarAlt />
            <div>
              <span>
                Scheduled
              </span>
              <strong>
                {stats.scheduled}
              </strong>
            </div>
          </article>

          <article>
            <FaTools />
            <div>
              <span>
                In Progress
              </span>
              <strong>
                {stats.progress}
              </strong>
            </div>
          </article>

          <article>
            <FaCheckCircle />
            <div>
              <span>
                Completed
              </span>
              <strong>
                {stats.completed}
              </strong>
            </div>
          </article>

          <article>
            <FaMoneyBillWave />
            <div>
              <span>
                Spend This Month
              </span>
              <strong>
                {money(
                  stats.monthSpend
                )}
              </strong>
            </div>
          </article>
        </section>


        <section className="maintenance-toolbar">
          <div className="maintenance-search">
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
              placeholder="Search vehicle, provider, type or repair..."
            />
          </div>

          <div className="maintenance-tabs">
            {[
              ["active", "Active"],
              ["scheduled", "Scheduled"],
              ["in-progress", "In Progress"],
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
          <section className="maintenance-empty">
            <FaWrench />
            <h2>
              Loading maintenance...
            </h2>
          </section>
        ) : visibleJobs.length ===
          0 ? (
          <section className="maintenance-empty">
            <FaTools />
            <h2>
              No maintenance jobs
            </h2>
            <p>
              Create a service or repair job
              when work is required.
            </p>
          </section>
        ) : (
          <section className="maintenance-grid">
            {visibleJobs.map(
              (job) => {
                const vehicle =
                  job.vehicles || {};

                const defect =
                  job.fleet_defects ||
                  null;

                return (
                  <article
                    className="maintenance-card"
                    key={job.id}
                  >
                    <div className="maintenance-card-top">
                      <span
                        className={`maintenance-status maintenance-status-${job.status}`}
                      >
                        {formatLabel(
                          job.status
                        )}
                      </span>

                      <span className="maintenance-type">
                        {formatLabel(
                          job.maintenance_type
                        )}
                      </span>
                    </div>

                    <div className="maintenance-card-title">
                      <span>
                        {vehicle.registration ||
                          "VEHICLE"}
                      </span>

                      <h2>
                        {vehicle.make ||
                          "Vehicle"}{" "}
                        {vehicle.model ||
                          ""}
                      </h2>

                      <p>
                        {job.description}
                      </p>
                    </div>

                    {defect && (
                      <div className="maintenance-linked-defect">
                        <FaExclamationTriangle />

                        <div>
                          <span>
                            LINKED DEFECT
                          </span>

                          <strong>
                            {defect.title}
                          </strong>

                          <small>
                            {formatLabel(
                              defect.severity
                            )}{" "}
                            ·{" "}
                            {formatLabel(
                              defect.status
                            )}
                          </small>
                        </div>
                      </div>
                    )}

                    <div className="maintenance-details">
                      <div>
                        <FaCalendarAlt />
                        <span>
                          Scheduled
                        </span>
                        <strong>
                          {formatDate(
                            job.scheduled_date
                          )}
                        </strong>
                      </div>

                      <div>
                        <FaTools />
                        <span>
                          Provider
                        </span>
                        <strong>
                          {job.service_provider ||
                            "Not assigned"}
                        </strong>
                      </div>

                      <div>
                        <FaMoneyBillWave />
                        <span>
                          Cost
                        </span>
                        <strong>
                          {job.status ===
                          "completed"
                            ? money(
                                job.actual_cost
                              )
                            : money(
                                job.estimated_cost
                              )}
                        </strong>
                      </div>
                    </div>

                    {job.status ===
                      "completed" && (
                      <div className="maintenance-completed-box">
                        <strong>
                          Completed{" "}
                          {formatDateTime(
                            job.completed_at
                          )}
                        </strong>

                        <p>
                          {job.repair_notes ||
                            "No completion notes."}
                        </p>

                        {job.invoice_reference && (
                          <small>
                            Invoice:{" "}
                            {
                              job.invoice_reference
                            }
                          </small>
                        )}
                      </div>
                    )}

                    {job.status !==
                      "completed" &&
                      job.status !==
                        "cancelled" && (
                        <div className="maintenance-actions">
                          {job.status ===
                            "scheduled" && (
                            <button
                              type="button"
                              className="maintenance-start"
                              disabled={
                                actionLoading ===
                                job.id
                              }
                              onClick={() =>
                                changeStatus(
                                  job,
                                  "in-progress"
                                )
                              }
                            >
                              <FaTools />
                              Start Work
                            </button>
                          )}

                          <button
                            type="button"
                            className="maintenance-complete"
                            disabled={
                              actionLoading ===
                              job.id
                            }
                            onClick={() =>
                              openComplete(
                                job
                              )
                            }
                          >
                            <FaCheckCircle />
                            Complete
                          </button>
                        </div>
                      )}
                  </article>
                );
              }
            )}
          </section>
        )}
      </section>


      {showCreate && (
        <div className="maintenance-modal-backdrop">
          <section className="maintenance-modal">
            <div className="maintenance-modal-heading">
              <div>
                <span>
                  NEW WORK ORDER
                </span>
                <h2>
                  Create Maintenance Job
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                disabled={saving}
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={createJob}
              className="maintenance-form"
            >
              <label>
                Vehicle *
                <select
                  name="vehicle_id"
                  value={
                    formData.vehicle_id
                  }
                  onChange={
                    handleCreateChange
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
                Maintenance Type *
                <select
                  name="maintenance_type"
                  value={
                    formData
                      .maintenance_type
                  }
                  onChange={
                    handleCreateChange
                  }
                >
                  <option value="scheduled-service">
                    Scheduled Service
                  </option>
                  <option value="repair">
                    Repair
                  </option>
                  <option value="tyres">
                    Tyres
                  </option>
                  <option value="brakes">
                    Brakes
                  </option>
                  <option value="inspection">
                    Inspection
                  </option>
                  <option value="breakdown">
                    Breakdown
                  </option>
                  <option value="other">
                    Other
                  </option>
                </select>
              </label>

              <label>
                Linked Defect
                <select
                  name="defect_id"
                  value={
                    formData.defect_id
                  }
                  onChange={
                    handleCreateChange
                  }
                  disabled={
                    !formData.vehicle_id
                  }
                >
                  <option value="">
                    No linked defect
                  </option>

                  {selectedVehicleDefects.map(
                    (defect) => (
                      <option
                        key={
                          defect.id
                        }
                        value={
                          defect.id
                        }
                      >
                        {defect.title} —{" "}
                        {formatLabel(
                          defect.severity
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Scheduled Date
                <input
                  name="scheduled_date"
                  type="date"
                  value={
                    formData
                      .scheduled_date
                  }
                  onChange={
                    handleCreateChange
                  }
                />
              </label>

              <label>
                Service Provider
                <input
                  name="service_provider"
                  type="text"
                  value={
                    formData
                      .service_provider
                  }
                  onChange={
                    handleCreateChange
                  }
                  placeholder="Workshop / supplier"
                />
              </label>

              <label>
                Estimated Cost (R)
                <input
                  name="estimated_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formData
                      .estimated_cost
                  }
                  onChange={
                    handleCreateChange
                  }
                  placeholder="0.00"
                />
              </label>

              <label className="maintenance-full-field">
                Work Required *
                <textarea
                  name="description"
                  rows="4"
                  value={
                    formData.description
                  }
                  onChange={
                    handleCreateChange
                  }
                  placeholder="Describe the service, repair or inspection required..."
                  required
                />
              </label>

              <div className="maintenance-modal-actions">
                <button
                  type="button"
                  className="maintenance-cancel"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="maintenance-save"
                  disabled={saving}
                >
                  <FaPlus />
                  {saving
                    ? "Creating..."
                    : "Create Work Order"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}


      {completingJob && (
        <div className="maintenance-modal-backdrop">
          <section className="maintenance-modal">
            <div className="maintenance-modal-heading">
              <div>
                <span>
                  COMPLETE WORK ORDER
                </span>
                <h2>
                  {
                    completingJob
                      .vehicles?.make
                  }{" "}
                  {
                    completingJob
                      .vehicles?.model
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={closeComplete}
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={
                completeJob
              }
              className="maintenance-form"
            >
              <label>
                Odometer (km) *
                <input
                  name="odometer"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    completion.odometer
                  }
                  onChange={
                    handleCompletionChange
                  }
                  required
                />
              </label>

              <label>
                Actual Cost (R)
                <input
                  name="actual_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    completion
                      .actual_cost
                  }
                  onChange={
                    handleCompletionChange
                  }
                />
              </label>

              <label>
                Invoice Reference
                <input
                  name="invoice_reference"
                  type="text"
                  value={
                    completion
                      .invoice_reference
                  }
                  onChange={
                    handleCompletionChange
                  }
                />
              </label>

              <label>
                Completed By
                <input
                  name="completed_by"
                  type="text"
                  value={
                    completion
                      .completed_by
                  }
                  onChange={
                    handleCompletionChange
                  }
                />
              </label>

              <label>
                Next Service Date
                <input
                  name="next_service_date"
                  type="date"
                  value={
                    completion
                      .next_service_date
                  }
                  onChange={
                    handleCompletionChange
                  }
                />
              </label>

              <label className="maintenance-full-field">
                Service / Repair Notes *
                <textarea
                  name="repair_notes"
                  rows="4"
                  value={
                    completion
                      .repair_notes
                  }
                  onChange={
                    handleCompletionChange
                  }
                  required
                />
              </label>

              <div className="maintenance-check-options maintenance-full-field">
                <label>
                  <input
                    name="update_service_schedule"
                    type="checkbox"
                    checked={
                      completion
                        .update_service_schedule
                    }
                    onChange={
                      handleCompletionChange
                    }
                  />
                  <span>
                    Update vehicle service
                    history and next service
                    date
                  </span>
                </label>

                {completingJob.defect_id && (
                  <label>
                    <input
                      name="resolve_linked_defect"
                      type="checkbox"
                      checked={
                        completion
                          .resolve_linked_defect
                      }
                      onChange={
                        handleCompletionChange
                      }
                    />
                    <span>
                      Resolve linked defect
                    </span>
                  </label>
                )}

                <label>
                  <input
                    name="return_vehicle_to_service"
                    type="checkbox"
                    checked={
                      completion
                        .return_vehicle_to_service
                    }
                    onChange={
                      handleCompletionChange
                    }
                  />
                  <span>
                    Return vehicle to service
                    if all safety checks pass
                  </span>
                </label>
              </div>

              <div className="maintenance-modal-actions">
                <button
                  type="button"
                  className="maintenance-cancel"
                  onClick={closeComplete}
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="maintenance-save"
                  disabled={
                    Boolean(
                      actionLoading
                    )
                  }
                >
                  <FaCheckCircle />
                  {actionLoading
                    ? "Completing..."
                    : "Complete Maintenance"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


export default MaintenanceManagement;
