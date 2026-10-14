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
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaIdCard,
  FaPhoneAlt,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaTimes,
  FaTruck,
  FaUser,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/DriverManagement.css";


const emptyForm = {
  full_name: "",
  employee_number: "",
  department: "",
  job_title: "",
  phone: "",
  employment_type: "",
  is_driver: false,
  authorized_to_drive: false,
  driver_status: "not-driver",
  driver_license_number: "",
  driver_licence_code: "",
  driver_licence_expiry: "",
  license_verified: false,
  pdp_required: false,
  pdp_number: "",
  pdp_expiry: "",
  policy_acknowledged: false,
  emergency_contact_name: "",
  emergency_contact_phone: "",
  driver_notes: "",
  active: true,
};


function normalizeEmployeeNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}


function dateOnly(value) {
  if (!value) {
    return "Not recorded";
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


function daysUntil(value) {
  if (!value) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target =
    new Date(`${value}T12:00:00`);
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() -
      today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}


function getExpiryState(value) {
  const remaining = daysUntil(value);

  if (remaining === null) {
    return {
      label: "Not recorded",
      className: "driver-expiry-neutral",
    };
  }

  if (remaining < 0) {
    return {
      label: `Expired ${Math.abs(
        remaining
      )} day${
        Math.abs(remaining) === 1
          ? ""
          : "s"
      } ago`,
      className: "driver-expiry-danger",
    };
  }

  if (remaining <= 30) {
    return {
      label: `${remaining} day${
        remaining === 1 ? "" : "s"
      } remaining`,
      className:
        "driver-expiry-warning",
    };
  }

  return {
    label: dateOnly(value),
    className: "driver-expiry-good",
  };
}


function getCompliance(employee) {
  if (!employee?.active) {
    return {
      label: "Employee Inactive",
      className: "driver-compliance-danger",
      eligible: false,
    };
  }

  if (!employee?.is_driver) {
    return {
      label: "Employee Only",
      className: "driver-compliance-neutral",
      eligible: false,
    };
  }

  if (
    employee.driver_status ===
    "suspended"
  ) {
    return {
      label: "Suspended",
      className: "driver-compliance-danger",
      eligible: false,
    };
  }

  if (
    employee.driver_status ===
    "unavailable"
  ) {
    return {
      label: "Unavailable",
      className:
        "driver-compliance-warning",
      eligible: false,
    };
  }

  const licenceDays = daysUntil(
    employee.driver_licence_expiry
  );

  if (
    licenceDays !== null &&
    licenceDays < 0
  ) {
    return {
      label: "Licence Expired",
      className: "driver-compliance-danger",
      eligible: false,
    };
  }

  const pdpDays = daysUntil(
    employee.pdp_expiry
  );

  if (
    employee.pdp_required &&
    (pdpDays === null || pdpDays < 0)
  ) {
    return {
      label: "PrDP Invalid",
      className: "driver-compliance-danger",
      eligible: false,
    };
  }

  if (
    !employee.authorized_to_drive
  ) {
    return {
      label: "Not Authorised",
      className:
        "driver-compliance-warning",
      eligible: false,
    };
  }

  if (!employee.license_verified) {
    return {
      label: "Licence Unverified",
      className:
        "driver-compliance-warning",
      eligible: false,
    };
  }

  if (!employee.policy_acknowledged) {
    return {
      label: "Policy Outstanding",
      className:
        "driver-compliance-warning",
      eligible: false,
    };
  }

  return {
    label: "Eligible",
    className: "driver-compliance-good",
    eligible: true,
  };
}


function DriverManagement() {
  const [
    employees,
    setEmployees,
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
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("drivers");

  const [
    editingEmployee,
    setEditingEmployee,
  ] = useState(null);

  const [
    formData,
    setFormData,
  ] = useState(emptyForm);


  useEffect(() => {
    loadEmployees();
  }, []);


  async function loadEmployees() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from("drivers")
        .select("*")
        .order("full_name", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error(
        "Driver management load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load employees and drivers."
      );
    } finally {
      setLoading(false);
    }
  }


  function openEdit(employee) {
    setEditingEmployee(employee);

    setFormData({
      full_name:
        employee.full_name || "",
      employee_number:
        employee.employee_number || "",
      department:
        employee.department || "",
      job_title:
        employee.job_title || "",
      phone:
        employee.phone || "",
      employment_type:
        employee.employment_type || "",
      is_driver:
        employee.is_driver ?? false,
      authorized_to_drive:
        employee.authorized_to_drive ??
        false,
      driver_status:
        employee.driver_status ||
        (employee.is_driver
          ? "unavailable"
          : "not-driver"),
      driver_license_number:
        employee.driver_license_number ||
        "",
      driver_licence_code:
        employee.driver_licence_code ||
        "",
      driver_licence_expiry:
        employee.driver_licence_expiry ||
        "",
      license_verified:
        employee.license_verified ??
        false,
      pdp_required:
        employee.pdp_required ?? false,
      pdp_number:
        employee.pdp_number || "",
      pdp_expiry:
        employee.pdp_expiry || "",
      policy_acknowledged:
        employee.policy_acknowledged ??
        false,
      emergency_contact_name:
        employee.emergency_contact_name ||
        "",
      emergency_contact_phone:
        employee.emergency_contact_phone ||
        "",
      driver_notes:
        employee.driver_notes || "",
      active:
        employee.active ?? true,
    });

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  function closeEdit() {
    setEditingEmployee(null);

    setFormData({
      ...emptyForm,
    });
  }


  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );

    setErrorMessage("");
    setSuccessMessage("");
  }


  function handleDriverToggle(event) {
    const checked =
      event.target.checked;

    setFormData(
      (current) => ({
        ...current,
        is_driver: checked,

        authorized_to_drive:
          checked
            ? current.authorized_to_drive
            : false,

        driver_status:
          checked
            ? current.driver_status ===
              "not-driver"
              ? "unavailable"
              : current.driver_status
            : "not-driver",

        pdp_required:
          checked
            ? current.pdp_required
            : false,
      })
    );
  }


  async function handleSubmit(event) {
    event.preventDefault();

    if (!editingEmployee) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (
        !formData.full_name.trim()
      ) {
        throw new Error(
          "Employee name is required."
        );
      }

      if (
        !normalizeEmployeeNumber(
          formData.employee_number
        )
      ) {
        throw new Error(
          "Employee number is required."
        );
      }

      if (formData.is_driver) {
        if (
          !formData
            .driver_license_number
            .trim()
        ) {
          throw new Error(
            "A driver must have a licence number."
          );
        }

        if (
          !formData
            .driver_licence_code
            .trim()
        ) {
          throw new Error(
            "Please select the driver's licence code."
          );
        }

        if (
          !formData
            .driver_licence_expiry
        ) {
          throw new Error(
            "A driver licence expiry date is required."
          );
        }

        if (
          formData.pdp_required &&
          !formData.pdp_number.trim()
        ) {
          throw new Error(
            "Enter the PrDP number because PrDP is marked as required."
          );
        }

        if (
          formData.pdp_required &&
          !formData.pdp_expiry
        ) {
          throw new Error(
            "Enter the PrDP expiry date."
          );
        }
      }

      const payload = {
        full_name:
          formData.full_name.trim(),

        employee_number:
          normalizeEmployeeNumber(
            formData.employee_number
          ),

        department:
          formData.department.trim() ||
          null,

        job_title:
          formData.job_title.trim() ||
          null,

        phone:
          formData.phone.trim() ||
          null,

        employment_type:
          formData.employment_type ||
          null,

        is_driver:
          formData.is_driver,

        authorized_to_drive:
          formData.is_driver
            ? formData
                .authorized_to_drive
            : false,

        driver_status:
          formData.is_driver
            ? formData.driver_status
            : "not-driver",

        driver_license_number:
          formData.is_driver
            ? formData
                .driver_license_number
                .trim()
                .toUpperCase()
            : null,

        driver_licence_code:
          formData.is_driver
            ? formData
                .driver_licence_code
            : null,

        driver_licence_expiry:
          formData.is_driver
            ? formData
                .driver_licence_expiry ||
              null
            : null,

        license_verified:
          formData.is_driver
            ? formData.license_verified
            : false,

        pdp_required:
          formData.is_driver
            ? formData.pdp_required
            : false,

        pdp_number:
          formData.is_driver &&
          formData.pdp_required
            ? formData.pdp_number
                .trim()
                .toUpperCase()
            : null,

        pdp_expiry:
          formData.is_driver &&
          formData.pdp_required
            ? formData.pdp_expiry ||
              null
            : null,

        policy_acknowledged:
          formData.is_driver
            ? formData
                .policy_acknowledged
            : formData
                .policy_acknowledged,

        emergency_contact_name:
          formData
            .emergency_contact_name
            .trim() || null,

        emergency_contact_phone:
          formData
            .emergency_contact_phone
            .trim() || null,

        driver_notes:
          formData.driver_notes
            .trim() || null,

        active:
          formData.active,
      };

      if (
        payload.policy_acknowledged
      ) {
        payload.policy_acknowledged_at =
          editingEmployee
            .policy_acknowledged_at ||
          new Date().toISOString();
      } else {
        payload.policy_acknowledged_at =
          null;
      }

      const {
        error,
      } = await supabase
        .from("drivers")
        .update(payload)
        .eq(
          "id",
          editingEmployee.id
        );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        `${payload.full_name}'s driver profile has been updated.`
      );

      closeEdit();
      await loadEmployees();
    } catch (error) {
      console.error(
        "Driver profile save error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to save the driver profile."
      );
    } finally {
      setSaving(false);
    }
  }


  const stats = useMemo(() => {
    const drivers =
      employees.filter(
        (employee) =>
          employee.is_driver === true
      );

    const eligible =
      drivers.filter(
        (employee) =>
          getCompliance(employee)
            .eligible
      );

    const expiring =
      drivers.filter(
        (employee) => {
          const licenceDays =
            daysUntil(
              employee
                .driver_licence_expiry
            );

          const pdpDays =
            employee.pdp_required
              ? daysUntil(
                  employee.pdp_expiry
                )
              : null;

          return (
            (licenceDays !== null &&
              licenceDays >= 0 &&
              licenceDays <= 30) ||
            (pdpDays !== null &&
              pdpDays >= 0 &&
              pdpDays <= 30)
          );
        }
      );

    return {
      employees: employees.length,
      drivers: drivers.length,
      eligible: eligible.length,
      expiring: expiring.length,
    };
  }, [employees]);


  const visibleEmployees =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return employees.filter(
        (employee) => {
          if (
            filter === "drivers" &&
            !employee.is_driver
          ) {
            return false;
          }

          if (
            filter === "eligible" &&
            !getCompliance(employee)
              .eligible
          ) {
            return false;
          }

          if (
            filter === "attention"
          ) {
            const compliance =
              getCompliance(employee);

            if (
              !employee.is_driver ||
              compliance.eligible
            ) {
              return false;
            }
          }

          if (!search) {
            return true;
          }

          return [
            employee.full_name,
            employee.employee_number,
            employee.department,
            employee.job_title,
            employee
              .driver_license_number,
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
      employees,
      filter,
      searchTerm,
    ]);


  return (
    <main className="driver-management-page">
      <header className="driver-header">
        <div className="driver-header-inner">
          <div className="driver-header-left">
            <Link
              to="/"
              className="driver-back-button"
            >
              <FaArrowLeft />
            </Link>

          
          </div>
        </div>
      </header>


      <section className="driver-content">
        {errorMessage && (
          <div className="driver-message driver-message-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="driver-message driver-message-success">
            <FaCheckCircle />

            <span>
              {successMessage}
            </span>
          </div>
        )}


        {editingEmployee && (
          <section className="driver-form-card">
            <div className="driver-form-heading">
              <div>
                <span>
                  DRIVER PROFILE
                </span>

                <h2>
                  {editingEmployee.full_name}
                </h2>

                <p>
                  Update employment,
                  licence and compliance
                  information.
                </p>
              </div>

              <button
                type="button"
                className="driver-close-button"
                onClick={closeEdit}
                aria-label="Close driver form"
              >
                <FaTimes />
              </button>
            </div>


            <form
              className="driver-form"
              onSubmit={handleSubmit}
            >
              <div className="driver-form-section">
                <div className="driver-form-section-heading">
                  <FaUser />

                  <div>
                    <strong>
                      Employee Details
                    </strong>

                    <span>
                      Existing company employee
                      information
                    </span>
                  </div>
                </div>

                <div className="driver-form-grid">
                  <label>
                    Full Name

                    <input
                      name="full_name"
                      type="text"
                      value={
                        formData.full_name
                      }
                      onChange={
                        handleChange
                      }
                      required
                    />
                  </label>

                  <label>
                    Employee Number

                    <input
                      name="employee_number"
                      type="text"
                      value={
                        formData.employee_number
                      }
                      onChange={
                        handleChange
                      }
                      required
                    />
                  </label>

                  <label>
                    Department

                    <input
                      name="department"
                      type="text"
                      value={
                        formData.department
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. Logistics"
                    />
                  </label>

                  <label>
                    Job Title

                    <input
                      name="job_title"
                      type="text"
                      value={
                        formData.job_title
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. Driver"
                    />
                  </label>

                  <label>
                    Phone

                    <input
                      name="phone"
                      type="tel"
                      value={
                        formData.phone
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. 082 123 4567"
                    />
                  </label>

                  <label>
                    Employment Type

                    <select
                      name="employment_type"
                      value={
                        formData.employment_type
                      }
                      onChange={
                        handleChange
                      }
                    >
                      <option value="">
                        Select type
                      </option>

                      <option value="Permanent">
                        Permanent
                      </option>

                      <option value="Contract">
                        Contract
                      </option>

                      <option value="Temporary">
                        Temporary
                      </option>

                      <option value="Intern">
                        Intern
                      </option>

                      <option value="Contractor">
                        Contractor
                      </option>
                    </select>
                  </label>
                </div>
              </div>


              <div className="driver-form-section">
                <div className="driver-form-section-heading">
                  <FaTruck />

                  <div>
                    <strong>
                      Driver Eligibility
                    </strong>

                    <span>
                      Control who may operate
                      fleet vehicles
                    </span>
                  </div>
                </div>

                <div className="driver-toggle-grid">
                  <label className="driver-checkbox-card">
                    <input
                      name="is_driver"
                      type="checkbox"
                      checked={
                        formData.is_driver
                      }
                      onChange={
                        handleDriverToggle
                      }
                    />

                    <span>
                      <strong>
                        Registered Driver
                      </strong>

                      <small>
                        This employee performs
                        driving duties.
                      </small>
                    </span>
                  </label>

                  <label className="driver-checkbox-card">
                    <input
                      name="authorized_to_drive"
                      type="checkbox"
                      checked={
                        formData
                          .authorized_to_drive
                      }
                      onChange={
                        handleChange
                      }
                      disabled={
                        !formData.is_driver
                      }
                    />

                    <span>
                      <strong>
                        Authorised to Drive
                      </strong>

                      <small>
                        Management has approved
                        fleet vehicle use.
                      </small>
                    </span>
                  </label>

                  <label className="driver-checkbox-card">
                    <input
                      name="license_verified"
                      type="checkbox"
                      checked={
                        formData
                          .license_verified
                      }
                      onChange={
                        handleChange
                      }
                      disabled={
                        !formData.is_driver
                      }
                    />

                    <span>
                      <strong>
                        Licence Verified
                      </strong>

                      <small>
                        Licence has been sighted
                        and verified.
                      </small>
                    </span>
                  </label>

                  <label className="driver-checkbox-card">
                    <input
                      name="policy_acknowledged"
                      type="checkbox"
                      checked={
                        formData
                          .policy_acknowledged
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <span>
                      <strong>
                        Policy Acknowledged
                      </strong>

                      <small>
                        Vehicle-use policy has
                        been accepted.
                      </small>
                    </span>
                  </label>
                </div>

                {formData.is_driver && (
                  <div className="driver-form-grid driver-form-grid-top">
                    <label>
                      Driver Status

                      <select
                        name="driver_status"
                        value={
                          formData.driver_status
                        }
                        onChange={
                          handleChange
                        }
                      >
                        <option value="eligible">
                          Eligible
                        </option>

                        <option value="unavailable">
                          Unavailable
                        </option>

                        <option value="suspended">
                          Suspended
                        </option>

                        <option value="expired">
                          Expired
                        </option>
                      </select>
                    </label>
                  </div>
                )}
              </div>


              {formData.is_driver && (
                <>
                  <div className="driver-form-section">
                    <div className="driver-form-section-heading">
                      <FaIdCard />

                      <div>
                        <strong>
                          Driver Licence
                        </strong>

                        <span>
                          Licence class,
                          verification and expiry
                        </span>
                      </div>
                    </div>

                    <div className="driver-form-grid">
                      <label>
                        Licence Number *

                        <input
                          name="driver_license_number"
                          type="text"
                          value={
                            formData
                              .driver_license_number
                          }
                          onChange={
                            handleChange
                          }
                          required
                        />
                      </label>

                      <label>
                        Licence Code *

                        <select
                          name="driver_licence_code"
                          value={
                            formData
                              .driver_licence_code
                          }
                          onChange={
                            handleChange
                          }
                          required
                        >
                          <option value="">
                            Select code
                          </option>

                          <option value="A">
                            A
                          </option>

                          <option value="A1">
                            A1
                          </option>

                          <option value="B">
                            B
                          </option>

                          <option value="C1">
                            C1
                          </option>

                          <option value="C">
                            C
                          </option>

                          <option value="EB">
                            EB
                          </option>

                          <option value="EC1">
                            EC1
                          </option>

                          <option value="EC">
                            EC
                          </option>
                        </select>
                      </label>

                      <label>
                        Licence Expiry *

                        <input
                          name="driver_licence_expiry"
                          type="date"
                          value={
                            formData
                              .driver_licence_expiry
                          }
                          onChange={
                            handleChange
                          }
                          required
                        />
                      </label>
                    </div>
                  </div>


                  <div className="driver-form-section">
                    <div className="driver-form-section-heading">
                      <FaShieldAlt />

                      <div>
                        <strong>
                          Professional Driving
                          Permit
                        </strong>

                        <span>
                          Capture PrDP details
                          where required
                        </span>
                      </div>
                    </div>

                    <label className="driver-checkbox-card driver-pdp-toggle">
                      <input
                        name="pdp_required"
                        type="checkbox"
                        checked={
                          formData.pdp_required
                        }
                        onChange={
                          handleChange
                        }
                      />

                      <span>
                        <strong>
                          PrDP Required
                        </strong>

                        <small>
                          Enable for roles or
                          vehicles that require a
                          professional driving
                          permit.
                        </small>
                      </span>
                    </label>

                    {formData.pdp_required && (
                      <div className="driver-form-grid driver-form-grid-top">
                        <label>
                          PrDP Number *

                          <input
                            name="pdp_number"
                            type="text"
                            value={
                              formData
                                .pdp_number
                            }
                            onChange={
                              handleChange
                            }
                            required
                          />
                        </label>

                        <label>
                          PrDP Expiry *

                          <input
                            name="pdp_expiry"
                            type="date"
                            value={
                              formData
                                .pdp_expiry
                            }
                            onChange={
                              handleChange
                            }
                            required
                          />
                        </label>
                      </div>
                    )}
                  </div>


                  <div className="driver-form-section">
                    <div className="driver-form-section-heading">
                      <FaPhoneAlt />

                      <div>
                        <strong>
                          Emergency & Notes
                        </strong>

                        <span>
                          Operational contact
                          information
                        </span>
                      </div>
                    </div>

                    <div className="driver-form-grid">
                      <label>
                        Emergency Contact Name

                        <input
                          name="emergency_contact_name"
                          type="text"
                          value={
                            formData
                              .emergency_contact_name
                          }
                          onChange={
                            handleChange
                          }
                        />
                      </label>

                      <label>
                        Emergency Contact Phone

                        <input
                          name="emergency_contact_phone"
                          type="tel"
                          value={
                            formData
                              .emergency_contact_phone
                          }
                          onChange={
                            handleChange
                          }
                        />
                      </label>

                      <label className="driver-field-full">
                        Driver Notes

                        <textarea
                          name="driver_notes"
                          value={
                            formData.driver_notes
                          }
                          onChange={
                            handleChange
                          }
                          rows="4"
                          placeholder="Restrictions, training notes or operational information..."
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}


              <div className="driver-form-actions">
                <button
                  type="button"
                  className="driver-secondary-button"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="driver-primary-button"
                  disabled={saving}
                >
                  <FaSave />

                  {saving
                    ? "Saving..."
                    : "Save Driver Profile"}
                </button>
              </div>
            </form>
          </section>
        )}


        <section className="driver-summary-grid">
          <article>
            <FaUsers />

            <div>
              <span>
                Employees
              </span>

              <strong>
                {stats.employees}
              </strong>
            </div>
          </article>

          <article>
            <FaTruck />

            <div>
              <span>
                Registered Drivers
              </span>

              <strong>
                {stats.drivers}
              </strong>
            </div>
          </article>

          <article>
            <FaUserCheck />

            <div>
              <span>
                Eligible
              </span>

              <strong>
                {stats.eligible}
              </strong>
            </div>
          </article>

          <article>
            <FaExclamationTriangle />

            <div>
              <span>
                Expiring ≤30 Days
              </span>

              <strong>
                {stats.expiring}
              </strong>
            </div>
          </article>
        </section>


        <section className="driver-toolbar">
          <div className="driver-search">
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
              placeholder="Search name, employee no., department or licence..."
            />
          </div>

          <div className="driver-filter-tabs">
            <button
              type="button"
              className={
                filter === "drivers"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("drivers")
              }
            >
              Drivers
            </button>

            <button
              type="button"
              className={
                filter === "eligible"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("eligible")
              }
            >
              Eligible
            </button>

            <button
              type="button"
              className={
                filter === "attention"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("attention")
              }
            >
              Needs Attention
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
              All Employees
            </button>
          </div>
        </section>


        {loading ? (
          <section className="driver-empty">
            <FaTruck />

            <h2>
              Loading drivers...
            </h2>
          </section>
        ) : visibleEmployees.length ===
          0 ? (
          <section className="driver-empty">
            <FaUser />

            <h2>
              No matching records
            </h2>

            <p>
              Try another filter or search
              term.
            </p>
          </section>
        ) : (
          <section className="driver-grid">
            {visibleEmployees.map(
              (employee) => {
                const compliance =
                  getCompliance(employee);

                const licenceState =
                  getExpiryState(
                    employee
                      .driver_licence_expiry
                  );

                const pdpState =
                  getExpiryState(
                    employee.pdp_expiry
                  );

                return (
                  <article
                    className="driver-card"
                    key={employee.id}
                  >
                    <div className="driver-card-top">
                      <div className="driver-card-avatar">
                        <FaUser />
                      </div>

                      <span
                        className={`driver-compliance-badge ${compliance.className}`}
                      >
                        {
                          compliance.label
                        }
                      </span>
                    </div>

                    <div className="driver-card-title">
                      <span>
                        {employee.is_driver
                          ? "DRIVER"
                          : "EMPLOYEE"}
                      </span>

                      <h3>
                        {
                          employee.full_name
                        }
                      </h3>

                      <p>
                        {
                          employee.employee_number
                        }

                        {employee.department
                          ? ` · ${employee.department}`
                          : ""}
                      </p>
                    </div>

                    {employee.is_driver ? (
                      <>
                        <div className="driver-card-details">
                          <div>
                            <FaIdCard />

                            <span>
                              Licence
                            </span>

                            <strong>
                              {
                                employee
                                  .driver_licence_code ||
                                "—"
                              }
                            </strong>

                            <small>
                              {
                                employee
                                  .driver_license_number ||
                                "Not recorded"
                              }
                            </small>
                          </div>

                          <div
                            className={
                              licenceState
                                .className
                            }
                          >
                            <FaCalendarAlt />

                            <span>
                              Licence Expiry
                            </span>

                            <strong>
                              {dateOnly(
                                employee
                                  .driver_licence_expiry
                              )}
                            </strong>

                            <small>
                              {
                                licenceState
                                  .label
                              }
                            </small>
                          </div>

                          <div
                            className={
                              employee.pdp_required
                                ? pdpState
                                    .className
                                : "driver-expiry-neutral"
                            }
                          >
                            <FaShieldAlt />

                            <span>
                              PrDP
                            </span>

                            <strong>
                              {employee.pdp_required
                                ? dateOnly(
                                    employee
                                      .pdp_expiry
                                  )
                                : "Not required"}
                            </strong>

                            {employee.pdp_required && (
                              <small>
                                {
                                  pdpState
                                    .label
                                }
                              </small>
                            )}
                          </div>
                        </div>

                        <div className="driver-check-list">
                          <span
                            className={
                              employee
                                .license_verified
                                ? "ok"
                                : "warn"
                            }
                          >
                            {employee
                              .license_verified
                              ? "✓"
                              : "!"}{" "}
                            Licence Verified
                          </span>

                          <span
                            className={
                              employee
                                .authorized_to_drive
                                ? "ok"
                                : "warn"
                            }
                          >
                            {employee
                              .authorized_to_drive
                              ? "✓"
                              : "!"}{" "}
                            Authorised
                          </span>

                          <span
                            className={
                              employee
                                .policy_acknowledged
                                ? "ok"
                                : "warn"
                            }
                          >
                            {employee
                              .policy_acknowledged
                              ? "✓"
                              : "!"}{" "}
                            Policy
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="driver-employee-note">
                        This employee is not
                        currently registered as
                        a fleet driver.
                      </div>
                    )}

                    <button
                      type="button"
                      className="driver-edit-button"
                      onClick={() =>
                        openEdit(employee)
                      }
                    >
                      <FaEdit />

                      {employee.is_driver
                        ? "Manage Driver"
                        : "Set Up as Driver"}
                    </button>
                  </article>
                );
              }
            )}
          </section>
        )}
      </section>
    </main>
  );
}


export default DriverManagement;
