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
  FaBuilding,
  FaCheckCircle,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaPlus,
  FaSearch,
  FaTimes,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/CustomerManagement.css";


const emptyForm = {
  customer_code: "",
  company_name: "",
  contact_name: "",
  phone: "",
  email: "",
  billing_address: "",
  physical_address: "",
  vat_number: "",
  payment_terms: "",
  active: true,
  notes: "",
};


function CustomerManagement() {
  const [customers, setCustomers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState(null);

  const [formData, setFormData] =
    useState(emptyForm);


  useEffect(() => {
    loadCustomers();
  }, []);


  async function loadCustomers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from("fleet_customers")
        .select("*")
        .order(
          "company_name",
          {
            ascending: true,
          }
        );

      if (error) {
        throw error;
      }

      setCustomers(
        data || []
      );
    } catch (error) {
      console.error(
        "Customer load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }


  function openCreate() {
    setEditingCustomer(null);
    setFormData({
      ...emptyForm,
    });
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }


  function openEdit(customer) {
    setEditingCustomer(customer);

    setFormData({
      customer_code:
        customer.customer_code || "",
      company_name:
        customer.company_name || "",
      contact_name:
        customer.contact_name || "",
      phone:
        customer.phone || "",
      email:
        customer.email || "",
      billing_address:
        customer.billing_address || "",
      physical_address:
        customer.physical_address || "",
      vat_number:
        customer.vat_number || "",
      payment_terms:
        customer.payment_terms || "",
      active:
        customer.active !== false,
      notes:
        customer.notes || "",
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
    setEditingCustomer(null);
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
  }


  async function saveCustomer(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (
        !formData.company_name
          .trim()
      ) {
        throw new Error(
          "Company name is required."
        );
      }

      const payload = {
        customer_code:
          formData.customer_code
            .trim() || null,

        company_name:
          formData.company_name
            .trim(),

        contact_name:
          formData.contact_name
            .trim() || null,

        phone:
          formData.phone
            .trim() || null,

        email:
          formData.email
            .trim() || null,

        billing_address:
          formData.billing_address
            .trim() || null,

        physical_address:
          formData.physical_address
            .trim() || null,

        vat_number:
          formData.vat_number
            .trim() || null,

        payment_terms:
          formData.payment_terms
            .trim() || null,

        active:
          formData.active,

        notes:
          formData.notes
            .trim() || null,
      };


      let query;

      if (editingCustomer) {
        query = supabase
          .from("fleet_customers")
          .update(payload)
          .eq(
            "id",
            editingCustomer.id
          );
      } else {
        query = supabase
          .from("fleet_customers")
          .insert(payload);
      }


      const {
        error,
      } = await query;

      if (error) {
        throw error;
      }

      setSuccessMessage(
        editingCustomer
          ? "Customer updated successfully."
          : "Customer created successfully."
      );

      closeForm();

      await loadCustomers();
    } catch (error) {
      console.error(
        "Customer save error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
  }


  async function toggleActive(
    customer
  ) {
    try {
      setErrorMessage("");
      setSuccessMessage("");

      const nextActive =
        !customer.active;

      const {
        error,
      } = await supabase
        .from("fleet_customers")
        .update({
          active: nextActive,
        })
        .eq(
          "id",
          customer.id
        );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        nextActive
          ? "Customer reactivated."
          : "Customer deactivated."
      );

      await loadCustomers();
    } catch (error) {
      setErrorMessage(
        error.message ||
          "Unable to update customer."
      );
    }
  }


  const visibleCustomers =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return customers;
      }

      return customers.filter(
        (customer) =>
          [
            customer.company_name,
            customer.customer_code,
            customer.contact_name,
            customer.phone,
            customer.email,
            customer.vat_number,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(search)
            )
      );
    }, [
      customers,
      searchTerm,
    ]);


  const activeCount =
    customers.filter(
      (customer) =>
        customer.active !== false
    ).length;


  return (
    <main className="customer-page">
      <header className="customer-header">
        <div className="customer-header-inner">
          <div className="customer-header-left">
            <Link
              to="/"
              className="customer-back"
            >
              <FaArrowLeft />
            </Link>

          </div>

          <button
            type="button"
            className="customer-create-button"
            onClick={openCreate}
          >
            <FaPlus />
            Add Customer
          </button>
        </div>
      </header>


      <section className="customer-content">
        {errorMessage && (
          <div className="customer-message customer-error">
            <FaBuilding />
            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="customer-message customer-success">
            <FaCheckCircle />
            <span>
              {successMessage}
            </span>
          </div>
        )}


        <section className="customer-summary">
          <article>
            <span>
              Total Customers
            </span>
            <strong>
              {customers.length}
            </strong>
          </article>

          <article>
            <span>
              Active Customers
            </span>
            <strong>
              {activeCount}
            </strong>
          </article>
        </section>


        <section className="customer-toolbar">
          <div className="customer-search">
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
              placeholder="Search company, code, contact, phone or VAT..."
            />
          </div>
        </section>


        {loading ? (
          <section className="customer-empty">
            <FaBuilding />
            <h2>
              Loading customers...
            </h2>
          </section>
        ) : visibleCustomers.length ===
          0 ? (
          <section className="customer-empty">
            <FaBuilding />
            <h2>
              No customers yet
            </h2>
            <p>
              Add the first transport customer
              to begin creating jobs.
            </p>
          </section>
        ) : (
          <section className="customer-grid">
            {visibleCustomers.map(
              (customer) => (
                <article
                  key={customer.id}
                  className="customer-card"
                >
                  <div className="customer-card-top">
                    <div>
                      <span>
                        {customer.customer_code ||
                          "CUSTOMER"}
                      </span>

                      <h2>
                        {
                          customer.company_name
                        }
                      </h2>
                    </div>

                    <span
                      className={`customer-status ${
                        customer.active
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {customer.active
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </span>
                  </div>


                  <div className="customer-contact">
                    <div>
                      <span>
                        Contact
                      </span>
                      <strong>
                        {customer.contact_name ||
                          "Not recorded"}
                      </strong>
                    </div>

                    <div>
                      <FaPhone />
                      <span>
                        {customer.phone ||
                          "No phone"}
                      </span>
                    </div>

                    <div>
                      <FaEnvelope />
                      <span>
                        {customer.email ||
                          "No email"}
                      </span>
                    </div>
                  </div>


                  <div className="customer-details">
                    <div>
                      <span>
                        VAT Number
                      </span>
                      <strong>
                        {customer.vat_number ||
                          "Not recorded"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Payment Terms
                      </span>
                      <strong>
                        {customer.payment_terms ||
                          "Not recorded"}
                      </strong>
                    </div>
                  </div>


                  {customer.physical_address && (
                    <p className="customer-address">
                      {
                        customer.physical_address
                      }
                    </p>
                  )}


                  <div className="customer-actions">
                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          customer
                        )
                      }
                    >
                      <FaEdit />
                      Edit
                    </button>

                    <button
                      type="button"
                      className={
                        customer.active
                          ? "customer-deactivate"
                          : "customer-reactivate"
                      }
                      onClick={() =>
                        toggleActive(
                          customer
                        )
                      }
                    >
                      {customer.active
                        ? "Deactivate"
                        : "Reactivate"}
                    </button>
                  </div>
                </article>
              )
            )}
          </section>
        )}
      </section>


      {showForm && (
        <div className="customer-modal-backdrop">
          <section className="customer-modal">
            <div className="customer-modal-heading">
              <div>
                <span>
                  {editingCustomer
                    ? "EDIT CUSTOMER"
                    : "NEW CUSTOMER"}
                </span>

                <h2>
                  {editingCustomer
                    ? formData.company_name
                    : "Create Customer"}
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
              className="customer-form"
              onSubmit={saveCustomer}
            >
              <label>
                Customer Code
                <input
                  name="customer_code"
                  value={
                    formData.customer_code
                  }
                  onChange={handleChange}
                  placeholder="e.g. CUS-001"
                />
              </label>

              <label>
                Company Name *
                <input
                  name="company_name"
                  value={
                    formData.company_name
                  }
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Contact Name
                <input
                  name="contact_name"
                  value={
                    formData.contact_name
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Phone
                <input
                  name="phone"
                  value={
                    formData.phone
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={
                    formData.email
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                VAT Number
                <input
                  name="vat_number"
                  value={
                    formData.vat_number
                  }
                  onChange={handleChange}
                />
              </label>

              <label>
                Payment Terms
                <input
                  name="payment_terms"
                  value={
                    formData.payment_terms
                  }
                  onChange={handleChange}
                  placeholder="e.g. 30 days"
                />
              </label>

              <label className="customer-form-full">
                Physical Address
                <textarea
                  name="physical_address"
                  rows="3"
                  value={
                    formData
                      .physical_address
                  }
                  onChange={handleChange}
                />
              </label>

              <label className="customer-form-full">
                Billing Address
                <textarea
                  name="billing_address"
                  rows="3"
                  value={
                    formData
                      .billing_address
                  }
                  onChange={handleChange}
                />
              </label>

              <label className="customer-active-option customer-form-full">
                <input
                  name="active"
                  type="checkbox"
                  checked={
                    formData.active
                  }
                  onChange={handleChange}
                />

                <span>
                  Active customer
                </span>
              </label>

              <label className="customer-form-full">
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

              <div className="customer-modal-actions">
                <button
                  type="button"
                  className="customer-cancel"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="customer-save"
                  disabled={saving}
                >
                  <FaCheckCircle />

                  {saving
                    ? "Saving..."
                    : editingCustomer
                    ? "Save Changes"
                    : "Create Customer"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


export default CustomerManagement;
