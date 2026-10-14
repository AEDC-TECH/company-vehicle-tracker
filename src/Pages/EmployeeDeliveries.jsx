import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaBox,
  FaCheckCircle,
  FaClipboardCheck,
  FaMapMarkerAlt,
  FaTruck,
} from "react-icons/fa";

import {
  listEmployeeDeliveries,
} from "../lib/deliveryLookup";

import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/EmployeeDeliveries.css";


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


function formatLabel(value) {
  if (!value) {
    return "Not recorded";
  }

  return String(value)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function EmployeeDeliveries() {
  const [
    deliveries,
    setDeliveries,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  useEffect(() => {
    loadDeliveries();
  }, []);


  async function loadDeliveries() {
    try {
      setLoading(true);
      setErrorMessage("");

      const employeeNumber =
        String(
          localStorage.getItem(
            "aedc_employee_number"
          ) || ""
        )
          .trim()
          .toUpperCase();

      if (!employeeNumber) {
        throw new Error(
          "Employee session could not be found. Sign in again."
        );
      }

      const data =
        await listEmployeeDeliveries(
          employeeNumber
        );

      setDeliveries(data);
    } catch (error) {
      console.error(
        "Delivery load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load your delivery jobs."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="employee-deliveries-page">
      <header className="employee-deliveries-header">
        <div className="employee-deliveries-header-inner">
          <Link
            to="/employee"
            className="employee-deliveries-back"
          >
            <FaArrowLeft />
          </Link>

          <AEDCLogo
            compact
            className="employee-deliveries-logo"
          />

          <div>
            <span>
              DRIVER OPERATIONS
            </span>

            <h1>
              My Deliveries
            </h1>

            <p>
              Customer delivery jobs linked to
              your vehicle trips.
            </p>
          </div>
        </div>
      </header>


      <section className="employee-deliveries-content">
        {errorMessage && (
          <div className="employee-deliveries-error">
            {errorMessage}
          </div>
        )}


        {loading ? (
          <section className="employee-deliveries-empty">
            <FaTruck />

            <h2>
              Loading deliveries...
            </h2>
          </section>
        ) : deliveries.length ===
          0 ? (
          <section className="employee-deliveries-empty">
            <FaBox />

            <h2>
              No delivery jobs
            </h2>

            <p>
              You currently have no transport
              deliveries linked to your trips.
            </p>
          </section>
        ) : (
          <section className="employee-deliveries-grid">
            {deliveries.map(
              (delivery) => {
                const completed =
                  delivery.delivery_result ===
                  "delivered";

                return (
                  <article
                    key={
                      delivery.transport_job_id
                    }
                    className="employee-delivery-card"
                  >
                    <div className="employee-delivery-top">
                      <div>
                        <span>
                          {
                            delivery.job_reference
                          }
                        </span>

                        <h2>
                          {
                            delivery.customer_name
                          }
                        </h2>
                      </div>

                      <span
                        className={`employee-delivery-status ${
                          completed
                            ? "completed"
                            : ""
                        }`}
                      >
                        {completed
                          ? "DELIVERED"
                          : delivery.delivery_result
                          ? formatLabel(
                              delivery.delivery_result
                            )
                          : "POD REQUIRED"}
                      </span>
                    </div>


                    <div className="employee-delivery-route">
                      <div>
                        <FaMapMarkerAlt />

                        <span>
                          PICKUP
                        </span>

                        <strong>
                          {
                            delivery.pickup_address
                          }
                        </strong>
                      </div>

                      <div>
                        <FaMapMarkerAlt />

                        <span>
                          DELIVERY
                        </span>

                        <strong>
                          {
                            delivery.delivery_address
                          }
                        </strong>
                      </div>
                    </div>


                    <div className="employee-delivery-details">
                      <div>
                        <span>
                          Cargo
                        </span>

                        <strong>
                          {delivery.cargo_description ||
                            "Not recorded"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Planned Delivery
                        </span>

                        <strong>
                          {formatDateTime(
                            delivery.planned_delivery_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Vehicle
                        </span>

                        <strong>
                          {delivery.vehicle_make}{" "}
                          {delivery.vehicle_model}
                        </strong>

                        <small>
                          {
                            delivery.vehicle_registration
                          }
                        </small>
                      </div>
                    </div>


                    <div className="employee-delivery-actions">
                      <Link
                        to={`/employee/pod/${delivery.trip_id}`}
                        className={
                          completed
                            ? "employee-delivery-view"
                            : "employee-delivery-pod"
                        }
                      >
                        {completed
                          ? (
                            <>
                              <FaCheckCircle />
                              View POD
                            </>
                          )
                          : (
                            <>
                              <FaClipboardCheck />
                              Record POD
                            </>
                          )}
                      </Link>
                    </div>
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


export default EmployeeDeliveries;
