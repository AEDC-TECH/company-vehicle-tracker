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
  FaClipboardCheck,
  FaExclamationTriangle,
  FaFileAlt,
  FaMapMarkerAlt,
  FaPrint,
  FaSearch,
  FaTruck,
  FaUser,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/DispatchBoard.css";


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
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function DispatchBoard() {
  const [jobs, setJobs] =
    useState([]);

  const [requests, setRequests] =
    useState([]);

  const [trips, setTrips] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [dispatching, setDispatching] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filter, setFilter] =
    useState("ready");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");


  useEffect(() => {
    loadDispatch();
  }, []);


  async function loadDispatch() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        jobResult,
        requestResult,
        tripResult,
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
              status,
              roadworthy,
              active,
              load_capacity_kg
            ),
            drivers (
              id,
              full_name,
              employee_number,
              department,
              driver_status,
              driver_licence_expiry,
              pdp_required,
              pdp_expiry
            )
          `)
          .in(
            "status",
            [
              "draft",
              "scheduled",
              "assigned",
              "in_progress",
              "delivered",
            ]
          )
          .order(
            "planned_pickup_at",
            {
              ascending: true,
              nullsFirst: false,
            }
          ),

        supabase
          .from("vehicle_requests")
          .select(`
            id,
            transport_job_id,
            booking_reference,
            status,
            employee_number,
            requested_driver_name,
            requested_departure_at,
            requested_return_at
          `)
          .not(
            "transport_job_id",
            "is",
            null
          ),

        supabase
          .from("vehicle_trips")
          .select(`
            id,
            request_id,
            vehicle_id,
            employee_number,
            driver_name,
            status,
            departure_at,
            returned_at
          `)
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

      if (requestResult.error) {
        throw requestResult.error;
      }

      if (tripResult.error) {
        throw tripResult.error;
      }

      setJobs(
        jobResult.data || []
      );

      setRequests(
        requestResult.data || []
      );

      setTrips(
        tripResult.data || []
      );
    } catch (error) {
      console.error(
        "Dispatch load error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load the dispatch board."
      );
    } finally {
      setLoading(false);
    }
  }


  function getRequest(jobId) {
    return requests.find(
      (request) =>
        request.transport_job_id ===
        jobId
    );
  }


  function getTrip(requestId) {
    if (!requestId) {
      return null;
    }

    return trips.find(
      (trip) =>
        trip.request_id ===
        requestId
    );
  }


  function getStage(job) {
    const request =
      getRequest(job.id);

    const trip =
      getTrip(request?.id);

    if (
      job.status ===
      "delivered"
    ) {
      return "delivered";
    }

    if (
      trip &&
      [
        "in-use",
        "incident-open",
      ].includes(
        trip.status
      )
    ) {
      return "on-road";
    }

    if (
      trip &&
      trip.status ===
      "returned"
    ) {
      return "returned";
    }

    if (request) {
      return "awaiting-pretrip";
    }

    if (
      job.vehicle_id &&
      job.driver_id &&
      job.planned_pickup_at &&
      job.planned_delivery_at
    ) {
      return "ready";
    }

    return "planning";
  }


  async function dispatchJob(job) {
    const dispatcherName =
      window.prompt(
        "Enter dispatcher / fleet manager name:"
      );

    if (!dispatcherName?.trim()) {
      return;
    }

    try {
      setDispatching(
        job.id
      );

      setErrorMessage("");
      setSuccessMessage("");

      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_dispatch_transport_job",
        {
          p_job_id:
            job.id,

          p_dispatcher_name:
            dispatcherName.trim(),
        }
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        `${job.job_reference} dispatched successfully. Booking ${
          data?.booking_reference ||
          ""
        } is now approved for ${
          data?.driver_name ||
          "the assigned driver"
        }.`
      );

      await loadDispatch();
    } catch (error) {
      console.error(
        "Dispatch error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to dispatch this job."
      );
    } finally {
      setDispatching("");
    }
  }


  const stats = useMemo(() => {
    const stages =
      jobs.map(getStage);

    return {
      ready:
        stages.filter(
          (stage) =>
            stage === "ready"
        ).length,

      pretrip:
        stages.filter(
          (stage) =>
            stage ===
            "awaiting-pretrip"
        ).length,

      road:
        stages.filter(
          (stage) =>
            stage === "on-road"
        ).length,

      delivered:
        stages.filter(
          (stage) =>
            stage === "delivered"
        ).length,

      planning:
        stages.filter(
          (stage) =>
            stage === "planning"
        ).length,
    };
  }, [
    jobs,
    requests,
    trips,
  ]);


  const visibleJobs =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return jobs.filter(
        (job) => {
          const stage =
            getStage(job);

          if (
            filter !== "all" &&
            stage !== filter
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          return [
            job.job_reference,
            job.fleet_customers
              ?.company_name,
            job.pickup_address,
            job.delivery_address,
            job.vehicles
              ?.registration,
            job.drivers
              ?.full_name,
            job.drivers
              ?.employee_number,
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
      requests,
      trips,
      filter,
      searchTerm,
    ]);


  return (
    <main className="dispatch-page">
      <header className="dispatch-header">
        <div className="dispatch-header-inner">
          <div className="dispatch-header-left">
            <Link
              to="/"
              className="dispatch-back"
            >
              <FaArrowLeft />
            </Link>

          </div>

          <Link
            to="/jobs"
            className="dispatch-jobs-link"
          >
            <FaBox />
            Jobs & Deliveries
          </Link>
        </div>
      </header>


      <section className="dispatch-content">
        {errorMessage && (
          <div className="dispatch-message dispatch-error">
            <FaExclamationTriangle />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="dispatch-message dispatch-success">
            <FaCheckCircle />

            <span>
              {successMessage}
            </span>
          </div>
        )}


        <section className="dispatch-summary">
          <article>
            <FaClipboardCheck />

            <div>
              <span>
                Ready to Dispatch
              </span>

              <strong>
                {stats.ready}
              </strong>
            </div>
          </article>

          <article>
            <FaCheckCircle />

            <div>
              <span>
                Awaiting Pre-Trip
              </span>

              <strong>
                {stats.pretrip}
              </strong>
            </div>
          </article>

          <article>
            <FaTruck />

            <div>
              <span>
                On Road
              </span>

              <strong>
                {stats.road}
              </strong>
            </div>
          </article>

          <article>
            <FaCalendarAlt />

            <div>
              <span>
                Needs Planning
              </span>

              <strong>
                {stats.planning}
              </strong>
            </div>
          </article>
        </section>


        <section className="dispatch-toolbar">
          <div className="dispatch-search">
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
              placeholder="Search job, customer, driver, vehicle or route..."
            />
          </div>

          <div className="dispatch-tabs">
            {[
              ["ready", "Ready"],
              [
                "awaiting-pretrip",
                "Pre-Trip",
              ],
              ["on-road", "On Road"],
              ["delivered", "Delivered"],
              ["planning", "Planning"],
              ["returned", "Returned"],
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
          <section className="dispatch-empty">
            <FaTruck />

            <h2>
              Loading dispatch...
            </h2>
          </section>
        ) : visibleJobs.length ===
          0 ? (
          <section className="dispatch-empty">
            <FaClipboardCheck />

            <h2>
              No jobs in this stage
            </h2>

            <p>
              Assign vehicles and drivers from
              Jobs & Deliveries when planning
              work.
            </p>
          </section>
        ) : (
          <section className="dispatch-grid">
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

                const request =
                  getRequest(job.id);

                const trip =
                  getTrip(
                    request?.id
                  );

                const stage =
                  getStage(job);

                return (
                  <article
                    key={job.id}
                    className={`dispatch-card dispatch-stage-${stage}`}
                  >
                    <div className="dispatch-card-top">
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

                      <span className="dispatch-stage">
                        {formatLabel(
                          stage
                        )}
                      </span>
                    </div>


                    <div className="dispatch-route">
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

                      <div className="dispatch-route-line" />

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


                    <div className="dispatch-details">
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
                        <FaCar />

                        <span>
                          Vehicle
                        </span>

                        <strong>
                          {vehicle.registration ||
                            "Not assigned"}
                        </strong>

                        <small>
                          {vehicle.make ||
                            ""}{" "}
                          {vehicle.model ||
                            ""}
                        </small>
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

                        <small>
                          {driver.employee_number ||
                            ""}
                        </small>
                      </div>
                    </div>


                    {request && (
                      <div className="dispatch-booking">
                        <FaClipboardCheck />

                        <div>
                          <span>
                            APPROVED VEHICLE BOOKING
                          </span>

                          <strong>
                            {request.booking_reference ||
                              request.id}
                          </strong>

                          <small>
                            Driver must open the
                            Employee Portal and
                            complete the pre-trip
                            inspection.
                          </small>
                        </div>
                      </div>
                    )}


                    {trip && (
                      <div className="dispatch-trip">
                        <FaTruck />

                        <div>
                          <span>
                            TRIP STATUS
                          </span>

                          <strong>
                            {formatLabel(
                              trip.status
                            )}
                          </strong>

                          <small>
                            {trip.departure_at
                              ? `Started ${formatDateTime(
                                  trip.departure_at
                                )}`
                              : "Trip linked"}
                          </small>
                        </div>
                      </div>
                    )}


                    <div className="dispatch-actions">
                      {stage ===
                        "planning" && (
                        <Link
                          to="/jobs"
                          className="dispatch-secondary"
                        >
                          Complete Assignment
                        </Link>
                      )}

                      {stage ===
                        "ready" && (
                        <button
                          type="button"
                          className="dispatch-primary"
                          disabled={
                            dispatching ===
                            job.id
                          }
                          onClick={() =>
                            dispatchJob(
                              job
                            )
                          }
                        >
                          <FaTruck />

                          {dispatching ===
                          job.id
                            ? "Dispatching..."
                            : "Dispatch Job"}
                        </button>
                      )}

                      {stage ===
                        "awaiting-pretrip" && (
                        <>
                          <Link
                            to={`/requests/${request.id}`}
                            className="dispatch-secondary"
                          >
                            View Booking
                          </Link>

                          <Link
                            to={`/pod/job/${job.id}?print=blank`}
                            className="dispatch-secondary"
                          >
                            <FaPrint />
                            Print POD
                          </Link>

                          <span className="dispatch-driver-note">
                            Driver: sign into
                            Employee Portal → approved
                            booking → pre-trip.
                          </span>
                        </>
                      )}

                      {stage ===
                        "delivered" && (
                        <>
                          <Link
                            to={`/pod/job/${job.id}`}
                            className="dispatch-primary"
                          >
                            <FaFileAlt />
                            View POD
                          </Link>

                          <Link
                            to={`/pod/job/${job.id}?print=blank`}
                            className="dispatch-secondary"
                          >
                            <FaPrint />
                            Print Blank POD
                          </Link>

                          <span className="dispatch-driver-note">
                            POD recorded. Driver can now
                            complete the vehicle return.
                          </span>
                        </>
                      )}

                      {stage ===
                        "on-road" && (
                        <>
                          <Link
                            to="/history"
                            className="dispatch-secondary"
                          >
                            View Fleet Activity
                          </Link>

                          <Link
                            to={`/pod/job/${job.id}?print=blank`}
                            className="dispatch-secondary"
                          >
                            <FaPrint />
                            Print POD
                          </Link>
                        </>
                      )}
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


export default DispatchBoard;
