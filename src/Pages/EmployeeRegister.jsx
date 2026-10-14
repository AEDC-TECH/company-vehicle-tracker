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
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaIdCard,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaTimes,
  FaTrash,
  FaUser,
  FaUserCheck,
  FaUserSlash,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/EmployeeRegister.css";


const emptyForm = {
  full_name: "",
  employee_number: "",
  department: "",
  email: "",
  phone: "",

  driver_license_number: "",
  license_expiry_date: "",

  license_verified: false,
  authorized_to_drive: false,
  policy_acknowledged: false,
  active: true,
};


function EmployeeRegister() {
  const [employees, setEmployees] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [editingEmployee, setEditingEmployee] =
    useState(null);

  const [formData, setFormData] =
    useState(emptyForm);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");


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
        .order(
          "full_name",
          {
            ascending: true,
          }
        );

      if (error) {
        throw error;
      }

      setEmployees(
        data || []
      );
    } catch (error) {
      console.error(
        "Employee register error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load employees."
      );
    } finally {
      setLoading(false);
    }
  }


  function normalizeEmployeeNumber(
    value
  ) {
    return String(
      value || ""
    )
      .trim()
      .toUpperCase();
  }


  function handleChange(
    event
  ) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  }


  function openAddForm() {
    setEditingEmployee(null);

    setFormData({
      ...emptyForm,
    });

    setErrorMessage("");
    setSuccessMessage("");

    setShowForm(true);
  }


  function openEditForm(
    employee
  ) {
    setEditingEmployee(
      employee
    );

    setFormData({
      full_name:
        employee.full_name || "",

      employee_number:
        employee.employee_number || "",

      department:
        employee.department || "",

      email:
        employee.email || "",

      phone:
        employee.phone || "",

      driver_license_number:
        employee.driver_license_number ||
        "",

      license_expiry_date:
        employee.license_expiry_date ||
        "",

      license_verified:
        Boolean(
          employee.license_verified
        ),

      authorized_to_drive:
        Boolean(
          employee.authorized_to_drive
        ),

      policy_acknowledged:
        Boolean(
          employee.policy_acknowledged
        ),

      active:
        employee.active !== false,
    });

    setErrorMessage("");
    setSuccessMessage("");

    setShowForm(true);
  }


  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingEmployee(null);

    setFormData({
      ...emptyForm,
    });
  }


  async function employeeNumberExists(
    employeeNumber
  ) {
    const normalized =
      normalizeEmployeeNumber(
        employeeNumber
      );

    const {
      data,
      error,
    } = await supabase
      .from("drivers")
      .select(
        "id, employee_number"
      )
      .eq(
        "employee_number",
        normalized
      );

    if (error) {
      throw error;
    }

    return (
      data || []
    ).some(
      (employee) =>
        employee.id !==
        editingEmployee?.id
    );
  }


  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const employeeNumber =
      normalizeEmployeeNumber(
        formData.employee_number
      );

    if (
      !formData.full_name.trim()
    ) {
      setErrorMessage(
        "Enter the employee's full name."
      );

      return;
    }

    if (!employeeNumber) {
      setErrorMessage(
        "Enter the employee's company number."
      );

      return;
    }

    if (
      !formData.department.trim()
    ) {
      setErrorMessage(
        "Enter the employee's department."
      );

      return;
    }


    /*
     * If licence is marked as verified,
     * a licence number should exist.
     */

    if (
      formData.license_verified &&
      !formData.driver_license_number.trim()
    ) {
      setErrorMessage(
        "Enter the driver's licence number before marking the licence as verified."
      );

      return;
    }


    /*
     * Do not mark someone authorized
     * without verified licence.
     */

    if (
      formData.authorized_to_drive &&
      !formData.license_verified
    ) {
      setErrorMessage(
        "The driver's licence must first be verified before the employee can be authorized to drive."
      );

      return;
    }


    try {
      setSaving(true);

      const duplicate =
        await employeeNumberExists(
          employeeNumber
        );

      if (duplicate) {
        throw new Error(
          `Employee number ${employeeNumber} is already registered.`
        );
      }


      const employeePayload = {
        full_name:
          formData.full_name.trim(),

        employee_number:
          employeeNumber,

        department:
          formData.department.trim(),

        email:
          formData.email.trim() ||
          null,

        phone:
          formData.phone.trim() ||
          null,

        driver_license_number:
          formData.driver_license_number.trim() ||
          null,

        license_expiry_date:
          formData.license_expiry_date ||
          null,

        license_verified:
          formData.license_verified,

        authorized_to_drive:
          formData.authorized_to_drive,

        policy_acknowledged:
          formData.policy_acknowledged,

        active:
          formData.active,
      };


      /*
       * Licence verification audit.
       */

      if (
        formData.license_verified
      ) {
        employeePayload.license_verified_at =
          editingEmployee?.license_verified_at ||
          new Date().toISOString();

        employeePayload.license_verified_by =
          editingEmployee?.license_verified_by ||
          "Facilities Manager";
      } else {
        employeePayload.license_verified_at =
          null;

        employeePayload.license_verified_by =
          null;
      }


      /*
       * Policy acknowledgement timestamp.
       */

      if (
        formData.policy_acknowledged
      ) {
        employeePayload.policy_acknowledged_at =
          editingEmployee?.policy_acknowledged_at ||
          new Date().toISOString();
      } else {
        employeePayload.policy_acknowledged_at =
          null;
      }


      if (editingEmployee) {
        const {
          error,
        } = await supabase
          .from("drivers")
          .update(
            employeePayload
          )
          .eq(
            "id",
            editingEmployee.id
          );

        if (error) {
          throw error;
        }

        setSuccessMessage(
          `${formData.full_name.trim()} has been updated successfully.`
        );
      } else {
        const {
          error,
        } = await supabase
          .from("drivers")
          .insert(
            employeePayload
          );

        if (error) {
          throw error;
        }

        setSuccessMessage(
          `${formData.full_name.trim()} has been added to the AEDC Vehicle System.`
        );
      }

      setShowForm(false);
      setEditingEmployee(null);

      setFormData({
        ...emptyForm,
      });

      await loadEmployees();
    } catch (error) {
      console.error(
        "Employee save error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to save employee."
      );
    } finally {
      setSaving(false);
    }
  }


  async function toggleEmployeeAccess(
    employee
  ) {
    const nextStatus =
      employee.active === false;

    const actionText =
      nextStatus
        ? "reactivate"
        : "deactivate";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionText} ${employee.full_name}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const {
        error,
      } = await supabase
        .from("drivers")
        .update({
          active:
            nextStatus,
        })
        .eq(
          "id",
          employee.id
        );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        nextStatus
          ? `${employee.full_name} can now access the Employee Vehicle Portal.`
          : `${employee.full_name}'s Employee Vehicle Portal access has been disabled.`
      );

      await loadEmployees();
    } catch (error) {
      console.error(
        "Employee access update error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update employee access."
      );
    }
  }


  async function deleteEmployee(
    employee
  ) {
    /*
     * We should not delete employee records
     * that already have company vehicle history.
     */

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const [
        requestResult,
        tripResult,
      ] = await Promise.all([
        supabase
          .from("vehicle_requests")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "employee_number",
            employee.employee_number
          ),

        supabase
          .from("vehicle_trips")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "employee_number",
            employee.employee_number
          ),
      ]);

      if (
        requestResult.error
      ) {
        throw requestResult.error;
      }

      if (
        tripResult.error
      ) {
        throw tripResult.error;
      }

      const requestCount =
        requestResult.count || 0;

      const tripCount =
        tripResult.count || 0;

      if (
        requestCount > 0 ||
        tripCount > 0
      ) {
        setErrorMessage(
          `${employee.full_name} cannot be deleted because vehicle records already exist for this employee. Deactivate their access instead.`
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Permanently delete ${employee.full_name} (${employee.employee_number}) from the employee register?`
        );

      if (!confirmed) {
        return;
      }

      const {
        error,
      } = await supabase
        .from("drivers")
        .delete()
        .eq(
          "id",
          employee.id
        );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        `${employee.full_name} has been removed from the employee register.`
      );

      await loadEmployees();
    } catch (error) {
      console.error(
        "Employee delete error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to delete employee."
      );
    }
  }


  function licenceExpired(
    employee
  ) {
    if (
      !employee.license_expiry_date
    ) {
      return false;
    }

    const expiry =
      new Date(
        `${employee.license_expiry_date}T23:59:59`
      );

    return (
      expiry <
      new Date()
    );
  }


  function formatDate(
    value
  ) {
    if (!value) {
      return "Not recorded";
    }

    return new Intl.DateTimeFormat(
      "en-ZA",
      {
        dateStyle: "medium",
      }
    ).format(
      new Date(value)
    );
  }


  const filteredEmployees =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return employees.filter(
        (employee) => {
          const matchesSearch =
            !search ||
            [
              employee.full_name,
              employee.employee_number,
              employee.department,
              employee.email,
              employee.phone,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(search);

          let matchesFilter =
            true;

          if (
            filter === "active"
          ) {
            matchesFilter =
              employee.active !==
              false;
          }

          if (
            filter === "inactive"
          ) {
            matchesFilter =
              employee.active ===
              false;
          }

          if (
            filter === "authorized"
          ) {
            matchesFilter =
              employee.authorized_to_drive ===
              true;
          }

          if (
            filter === "not-authorized"
          ) {
            matchesFilter =
              employee.authorized_to_drive !==
              true;
          }

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      employees,
      searchTerm,
      filter,
    ]);


  const activeCount =
    employees.filter(
      (employee) =>
        employee.active !==
        false
    ).length;

  const authorizedCount =
    employees.filter(
      (employee) =>
        employee.authorized_to_drive ===
        true
    ).length;

  const licenceVerifiedCount =
    employees.filter(
      (employee) =>
        employee.license_verified ===
        true
    ).length;


  return (
    <main className="employee-register-page">
      {/* ================================================
          HEADER
      ================================================ */}

      <header className="employee-register-header">
        <div className="employee-register-header-inner">
          <div className="employee-register-header-left">
            <Link
              to="/"
              className="employee-register-back"
            >
              <FaArrowLeft />
            </Link>


          </div>

          <button
            type="button"
            className="employee-register-add"
            onClick={
              openAddForm
            }
          >
            <FaPlus />
            Add Employee
          </button>
        </div>
      </header>


      <section className="employee-register-content">
        {/* ================================================
            INTRO
        ================================================ */}

        <section className="employee-register-intro">
          <div>
            <span>
              EMPLOYEE ACCESS CONTROL
            </span>

            <h2>
              AEDC Employee Register
            </h2>

            <p>
              Only active employees listed here
              can enter the Employee Vehicle
              Portal using their company number.
            </p>
          </div>
        </section>


        {/* ================================================
            MESSAGES
        ================================================ */}

        {errorMessage && (
          <div className="employee-register-message employee-register-message-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setErrorMessage("")
              }
            >
              <FaTimes />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="employee-register-message employee-register-message-success">
            <FaCheckCircle />

            <span>
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
            >
              <FaTimes />
            </button>
          </div>
        )}


        {/* ================================================
            SUMMARY
        ================================================ */}

        <section className="employee-register-summary">
          <article>
            <div>
              <FaUser />
            </div>

            <section>
              <span>
                Total Employees
              </span>

              <strong>
                {employees.length}
              </strong>
            </section>
          </article>

          <article>
            <div>
              <FaUserCheck />
            </div>

            <section>
              <span>
                Portal Access
              </span>

              <strong>
                {activeCount}
              </strong>
            </section>
          </article>

          <article>
            <div>
              <FaIdCard />
            </div>

            <section>
              <span>
                Licence Verified
              </span>

              <strong>
                {licenceVerifiedCount}
              </strong>
            </section>
          </article>

          <article>
            <div>
              <FaShieldAlt />
            </div>

            <section>
              <span>
                Authorized Drivers
              </span>

              <strong>
                {authorizedCount}
              </strong>
            </section>
          </article>
        </section>


        {/* ================================================
            FORM
        ================================================ */}

        {showForm && (
          <section className="employee-register-form-card">
            <div className="employee-register-form-heading">
              <div>
                <span>
                  {editingEmployee
                    ? "EDIT EMPLOYEE"
                    : "NEW EMPLOYEE"}
                </span>

                <h2>
                  {editingEmployee
                    ? "Update Employee"
                    : "Add Employee to Vehicle System"}
                </h2>

                <p>
                  Employees must be registered
                  here before their company
                  number can access the portal.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                className="employee-register-close"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="employee-register-form"
            >
              {/* =========================================
                  PERSONAL
              ========================================= */}

              <div className="employee-register-form-section">
                <div className="employee-register-form-section-heading">
                  <span>
                    01
                  </span>

                  <div>
                    <h3>
                      Employee Details
                    </h3>

                    <p>
                      Basic AEDC employee
                      information.
                    </p>
                  </div>
                </div>

                <div className="employee-register-grid">
                  <div className="employee-register-field">
                    <label>
                      Full Name *
                    </label>

                    <input
                      type="text"
                      name="full_name"
                      value={
                        formData.full_name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Employee full name"
                      required
                    />
                  </div>

                  <div className="employee-register-field">
                    <label>
                      Company Employee Number *
                    </label>

                    <input
                      type="text"
                      name="employee_number"
                      value={
                        formData.employee_number
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. AEDC001"
                      required
                    />
                  </div>

                  <div className="employee-register-field">
                    <label>
                      Department *
                    </label>

                    <input
                      type="text"
                      name="department"
                      value={
                        formData.department
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. Finance"
                      required
                    />
                  </div>

                  <div className="employee-register-field">
                    <label>
                      Email Address
                    </label>

                    <input
                      type="email"
                      name="email"
                      value={
                        formData.email
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="employee@company.com"
                    />
                  </div>

                  <div className="employee-register-field">
                    <label>
                      Contact Number
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={
                        formData.phone
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Contact number"
                    />
                  </div>
                </div>
              </div>


              {/* =========================================
                  DRIVER ELIGIBILITY
              ========================================= */}

              <div className="employee-register-form-section">
                <div className="employee-register-form-section-heading">
                  <span>
                    02
                  </span>

                  <div>
                    <h3>
                      Driver Eligibility
                    </h3>

                    <p>
                      Portal access does not
                      automatically mean the
                      employee is authorized
                      to drive.
                    </p>
                  </div>
                </div>

                <div className="employee-register-grid">
                  <div className="employee-register-field">
                    <label>
                      Driver Licence Number
                    </label>

                    <input
                      type="text"
                      name="driver_license_number"
                      value={
                        formData.driver_license_number
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Licence number"
                    />
                  </div>

                  <div className="employee-register-field">
                    <label>
                      Licence Expiry Date
                    </label>

                    <input
                      type="date"
                      name="license_expiry_date"
                      value={
                        formData.license_expiry_date
                      }
                      onChange={
                        handleChange
                      }
                    />
                  </div>
                </div>

                <div className="employee-register-checks">
                  <label>
                    <input
                      type="checkbox"
                      name="license_verified"
                      checked={
                        formData.license_verified
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <div>
                      <strong>
                        Driver Licence Verified
                      </strong>

                      <span>
                        Facilities Manager or HR
                        has verified the licence.
                      </span>
                    </div>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="authorized_to_drive"
                      checked={
                        formData.authorized_to_drive
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <div>
                      <strong>
                        Authorized to Drive
                      </strong>

                      <span>
                        Employee is approved to
                        drive AEDC company
                        vehicles.
                      </span>
                    </div>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="policy_acknowledged"
                      checked={
                        formData.policy_acknowledged
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <div>
                      <strong>
                        Vehicle Policy Acknowledged
                      </strong>

                      <span>
                        Employee has acknowledged
                        the AEDC Company Vehicle
                        Use Policy.
                      </span>
                    </div>
                  </label>
                </div>
              </div>


              {/* =========================================
                  ACCESS
              ========================================= */}

              <div className="employee-register-form-section">
                <div className="employee-register-form-section-heading">
                  <span>
                    03
                  </span>

                  <div>
                    <h3>
                      Portal Access
                    </h3>

                    <p>
                      Inactive employees cannot
                      enter the Employee Vehicle
                      Portal.
                    </p>
                  </div>
                </div>

                <label className="employee-register-access-check">
                  <input
                    type="checkbox"
                    name="active"
                    checked={
                      formData.active
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <div>
                    <strong>
                      Employee Portal Access Active
                    </strong>

                    <span>
                      Allow this company employee
                      number to access the vehicle
                      portal.
                    </span>
                  </div>
                </label>
              </div>


              <div className="employee-register-form-actions">
                <button
                  type="button"
                  className="employee-register-cancel"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="employee-register-save"
                  disabled={
                    saving
                  }
                >
                  <FaCheckCircle />

                  {saving
                    ? "Saving..."
                    : editingEmployee
                    ? "Update Employee"
                    : "Add Employee"}
                </button>
              </div>
            </form>
          </section>
        )}


        {/* ================================================
            SEARCH / FILTER
        ================================================ */}

        <section className="employee-register-tools">
          <div className="employee-register-search">
            <FaSearch />

            <input
              type="text"
              value={
                searchTerm
              }
              onChange={
                (event) =>
                  setSearchTerm(
                    event.target.value
                  )
              }
              placeholder="Search name, company number, department..."
            />
          </div>

          <select
            value={
              filter
            }
            onChange={
              (event) =>
                setFilter(
                  event.target.value
                )
            }
          >
            <option value="all">
              All Employees
            </option>

            <option value="active">
              Active Access
            </option>

            <option value="inactive">
              Inactive Access
            </option>

            <option value="authorized">
              Authorized Drivers
            </option>

            <option value="not-authorized">
              Not Authorized to Drive
            </option>
          </select>
        </section>


        {/* ================================================
            EMPLOYEE LIST
        ================================================ */}

        <section className="employee-register-list-section">
          <div className="employee-register-list-heading">
            <span>
              REGISTERED EMPLOYEES
            </span>

            <h2>
              Employee Access Register
            </h2>

            <p>
              Company numbers shown here are
              recognized by the employee portal.
            </p>
          </div>

          {loading ? (
            <div className="employee-register-empty">
              Loading employees...
            </div>
          ) : filteredEmployees.length ===
            0 ? (
            <div className="employee-register-empty">
              <FaUser />

              <h3>
                No employees found
              </h3>

              <p>
                Add the first employee to begin
                controlling vehicle portal
                access.
              </p>

              <button
                type="button"
                onClick={
                  openAddForm
                }
              >
                <FaPlus />
                Add Employee
              </button>
            </div>
          ) : (
            <div className="employee-register-list">
              {filteredEmployees.map(
                (employee) => {
                  const expired =
                    licenceExpired(
                      employee
                    );

                  const eligible =
                    employee.license_verified &&
                    employee.authorized_to_drive &&
                    employee.policy_acknowledged &&
                    !expired;

                  return (
                    <article
                      key={
                        employee.id
                      }
                      className={`employee-register-card ${
                        employee.active === false
                          ? "employee-register-card-inactive"
                          : ""
                      }`}
                    >
                      <div className="employee-register-card-top">
                        <div className="employee-register-person">
                          <div className="employee-register-avatar">
                            <FaUser />
                          </div>

                          <div>
                            <span>
                              {
                                employee.employee_number
                              }
                            </span>

                            <h3>
                              {
                                employee.full_name
                              }
                            </h3>

                            <p>
                              {employee.department ||
                                "Department not recorded"}
                            </p>
                          </div>
                        </div>

                        <div className="employee-register-badges">
                          <span
                            className={
                              employee.active !==
                              false
                                ? "employee-register-badge employee-register-badge-active"
                                : "employee-register-badge employee-register-badge-inactive"
                            }
                          >
                            {employee.active !==
                            false
                              ? "PORTAL ACTIVE"
                              : "PORTAL INACTIVE"}
                          </span>

                          <span
                            className={
                              eligible
                                ? "employee-register-badge employee-register-badge-authorized"
                                : "employee-register-badge employee-register-badge-not-authorized"
                            }
                          >
                            {eligible
                              ? "DRIVER ELIGIBLE"
                              : "NOT DRIVER ELIGIBLE"}
                          </span>
                        </div>
                      </div>


                      <div className="employee-register-card-grid">
                        <div>
                          <span>
                            Email
                          </span>

                          <strong>
                            {employee.email ||
                              "Not recorded"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Phone
                          </span>

                          <strong>
                            {employee.phone ||
                              "Not recorded"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Driver Licence
                          </span>

                          <strong>
                            {employee.driver_license_number ||
                              "Not recorded"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Licence Expiry
                          </span>

                          <strong
                            className={
                              expired
                                ? "employee-register-expired"
                                : ""
                            }
                          >
                            {employee.license_expiry_date
                              ? formatDate(
                                  employee.license_expiry_date
                                )
                              : "Not recorded"}

                            {expired &&
                              " — EXPIRED"}
                          </strong>
                        </div>
                      </div>


                      <div className="employee-register-compliance">
                        <div
                          className={
                            employee.license_verified
                              ? "employee-register-compliance-good"
                              : ""
                          }
                        >
                          {employee.license_verified ? (
                            <FaCheckCircle />
                          ) : (
                            <FaExclamationTriangle />
                          )}

                          Licence Verified
                        </div>

                        <div
                          className={
                            employee.authorized_to_drive
                              ? "employee-register-compliance-good"
                              : ""
                          }
                        >
                          {employee.authorized_to_drive ? (
                            <FaCheckCircle />
                          ) : (
                            <FaExclamationTriangle />
                          )}

                          Authorized to Drive
                        </div>

                        <div
                          className={
                            employee.policy_acknowledged
                              ? "employee-register-compliance-good"
                              : ""
                          }
                        >
                          {employee.policy_acknowledged ? (
                            <FaCheckCircle />
                          ) : (
                            <FaExclamationTriangle />
                          )}

                          Policy Acknowledged
                        </div>
                      </div>


                      <div className="employee-register-card-actions">
                        <button
                          type="button"
                          className="employee-register-edit"
                          onClick={() =>
                            openEditForm(
                              employee
                            )
                          }
                        >
                          <FaEdit />
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            employee.active ===
                            false
                              ? "employee-register-reactivate"
                              : "employee-register-deactivate"
                          }
                          onClick={() =>
                            toggleEmployeeAccess(
                              employee
                            )
                          }
                        >
                          {employee.active ===
                          false ? (
                            <>
                              <FaUserCheck />
                              Reactivate
                            </>
                          ) : (
                            <>
                              <FaUserSlash />
                              Deactivate
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="employee-register-delete"
                          onClick={() =>
                            deleteEmployee(
                              employee
                            )
                          }
                        >
                          <FaTrash />
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </section>


      <footer className="employee-register-footer">
        AEDC Company Vehicle Management System
      </footer>
    </main>
  );
}


export default EmployeeRegister;