import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaBox,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaTruck,
  FaUser,
} from "react-icons/fa";

import {
  getEmployeeDeliveryContext,
  submitEmployeeProofOfDelivery,
} from "../lib/deliveryLookup";

import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/EmployeeProofOfDelivery.css";


function toLocalInput(
  value = new Date()
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  const offset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime() -
      offset * 60 * 1000
  )
    .toISOString()
    .slice(0, 16);
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
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function RecipientSignaturePad({
  value,
  onChange,
  disabled = false,
}) {
  const canvasRef =
    useRef(null);

  const drawingRef =
    useRef(false);

  const hasInkRef =
    useRef(Boolean(value));


  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const ratio =
      Math.max(
        window.devicePixelRatio ||
          1,
        1
      );

    canvas.width =
      Math.max(
        Math.floor(
          rect.width * ratio
        ),
        1
      );

    canvas.height =
      Math.max(
        Math.floor(
          rect.height * ratio
        ),
        1
      );

    const context =
      canvas.getContext("2d");

    context.setTransform(
      ratio,
      0,
      0,
      ratio,
      0,
      0
    );

    context.lineCap =
      "round";

    context.lineJoin =
      "round";

    context.lineWidth =
      2.2;

    context.strokeStyle =
      "#172033";


    if (value) {
      const image =
        new Image();

      image.onload = () => {
        context.clearRect(
          0,
          0,
          rect.width,
          rect.height
        );

        context.drawImage(
          image,
          0,
          0,
          rect.width,
          rect.height
        );
      };

      image.src =
        value;
    }
  }, []);


  function point(event) {
    const canvas =
      canvasRef.current;

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        event.clientX -
        rect.left,

      y:
        event.clientY -
        rect.top,
    };
  }


  function startDrawing(event) {
    if (disabled) {
      return;
    }

    event.preventDefault();

    const canvas =
      canvasRef.current;

    const context =
      canvas.getContext("2d");

    const current =
      point(event);

    drawingRef.current =
      true;

    context.beginPath();

    context.moveTo(
      current.x,
      current.y
    );

    canvas.setPointerCapture?.(
      event.pointerId
    );
  }


  function draw(event) {
    if (
      disabled ||
      !drawingRef.current
    ) {
      return;
    }

    event.preventDefault();

    const context =
      canvasRef.current
        .getContext("2d");

    const current =
      point(event);

    context.lineTo(
      current.x,
      current.y
    );

    context.stroke();

    hasInkRef.current =
      true;
  }


  function finishDrawing(event) {
    if (
      disabled ||
      !drawingRef.current
    ) {
      return;
    }

    event.preventDefault();

    drawingRef.current =
      false;

    const canvas =
      canvasRef.current;

    canvas.releasePointerCapture?.(
      event.pointerId
    );

    if (
      hasInkRef.current
    ) {
      onChange(
        canvas.toDataURL(
          "image/png"
        )
      );
    }
  }


  function clearSignature() {
    if (disabled) {
      return;
    }

    const canvas =
      canvasRef.current;

    const context =
      canvas.getContext("2d");

    const rect =
      canvas.getBoundingClientRect();

    context.clearRect(
      0,
      0,
      rect.width,
      rect.height
    );

    hasInkRef.current =
      false;

    onChange("");
  }


  return (
    <div className="pod-signature-wrap">
      <canvas
        ref={canvasRef}
        className="pod-signature-canvas"
        onPointerDown={
          startDrawing
        }
        onPointerMove={draw}
        onPointerUp={
          finishDrawing
        }
        onPointerCancel={
          finishDrawing
        }
      />

      <div className="pod-signature-footer">
        <span>
          Sign inside the box using
          a finger, mouse or stylus.
        </span>

        {!disabled && (
          <button
            type="button"
            onClick={
              clearSignature
            }
          >
            Clear Signature
          </button>
        )}
      </div>
    </div>
  );
}


function EmployeeProofOfDelivery() {
  const { tripId } =
    useParams();

  const navigate =
    useNavigate();

  const [
    context,
    setContext,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    signatureData,
    setSignatureData,
  ] = useState("");


  const [
    formData,
    setFormData,
  ] = useState({
    deliveryResult:
      "delivered",

    deliveredAt:
      toLocalInput(),

    deliveryLocation:
      "",

    recipientName:
      "",

    recipientRole:
      "",

    recipientPhone:
      "",

    recipientSignatureName:
      "",

    recipientConfirmed:
      false,

    goodsCondition:
      "received-in-good-order",

    quantityReceived:
      "",

    documentReference:
      "",

    deliveryNotes:
      "",
  });


  useEffect(() => {
    loadContext();
  }, [tripId]);


  async function loadContext() {
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
        await getEmployeeDeliveryContext({
          tripId,
          employeeNumber,
        });

      if (!data) {
        throw new Error(
          "Delivery context could not be loaded."
        );
      }

      setContext(data);

      if (data.pod) {
        setSignatureData(
          data.pod.signature_data ||
          ""
        );

        setFormData({
          deliveryResult:
            data.pod.delivery_result ||
            "delivered",

          deliveredAt:
            toLocalInput(
              data.pod.delivered_at
            ),

          deliveryLocation:
            data.pod.delivery_location ||
            data.job?.delivery_address ||
            "",

          recipientName:
            data.pod.recipient_name ||
            "",

          recipientRole:
            data.pod.recipient_role ||
            "",

          recipientPhone:
            data.pod.recipient_phone ||
            "",

          recipientSignatureName:
            data.pod
              .recipient_signature_name ||
            "",

          recipientConfirmed:
            Boolean(
              data.pod
                .recipient_confirmed
            ),

          goodsCondition:
            data.pod.goods_condition ||
            "received-in-good-order",

          quantityReceived:
            data.pod.quantity_received ??
            "",

          documentReference:
            data.pod.document_reference ||
            "",

          deliveryNotes:
            data.pod.delivery_notes ||
            "",
        });
      } else {
        setFormData(
          (current) => ({
            ...current,

            deliveryLocation:
              data.job
                ?.delivery_address ||
              "",

            quantityReceived:
              data.job?.load_units ??
              "",
          })
        );
      }
    } catch (error) {
      console.error(
        "POD context error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load proof of delivery."
      );
    } finally {
      setLoading(false);
    }
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


  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (!context) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const recipientRequired =
        formData.deliveryResult !==
        "failed";

      if (
        recipientRequired &&
        !formData.recipientName
          .trim()
      ) {
        throw new Error(
          "Enter the name of the person receiving the delivery."
        );
      }

      if (
        recipientRequired &&
        !formData
          .recipientSignatureName
          .trim()
      ) {
        throw new Error(
          "Enter the recipient confirmation name."
        );
      }

      if (
        recipientRequired &&
        !formData
          .recipientConfirmed
      ) {
        throw new Error(
          "Recipient confirmation is required."
        );
      }

      if (
        recipientRequired &&
        !signatureData
      ) {
        throw new Error(
          "Ask the recipient to sign before submitting the POD."
        );
      }

      if (
        formData.deliveryResult ===
          "failed" &&
        !formData.deliveryNotes
          .trim()
      ) {
        throw new Error(
          "Enter the reason the delivery failed."
        );
      }

      const employeeNumber =
        String(
          localStorage.getItem(
            "aedc_employee_number"
          ) || ""
        )
          .trim()
          .toUpperCase();

      const result =
        await submitEmployeeProofOfDelivery({
          tripId,

          employeeNumber,

          deliveryResult:
            formData
              .deliveryResult,

          deliveredAt:
            new Date(
              formData.deliveredAt
            ).toISOString(),

          deliveryLocation:
            formData
              .deliveryLocation
              .trim(),

          recipientName:
            formData
              .recipientName
              .trim(),

          recipientRole:
            formData
              .recipientRole
              .trim(),

          recipientPhone:
            formData
              .recipientPhone
              .trim(),

          recipientSignatureName:
            formData
              .recipientSignatureName
              .trim(),

          recipientConfirmed:
            formData
              .recipientConfirmed,

          goodsCondition:
            formData
              .goodsCondition,

          quantityReceived:
            formData
              .quantityReceived,

          documentReference:
            formData
              .documentReference
              .trim(),

          deliveryNotes:
            formData
              .deliveryNotes
              .trim(),

          signatureData,
        });

      if (
        result?.delivery_result ===
        "delivered"
      ) {
        window.alert(
          `Proof of delivery recorded successfully.\n\n${result.job_reference || "Transport job"} is now DELIVERED.`
        );
      } else {
        window.alert(
          `Delivery attempt recorded as ${formatLabel(
            result?.delivery_result ||
              formData.deliveryResult
          )}.\n\nThe transport job remains IN PROGRESS.`
        );
      }

      navigate(
        "/employee/deliveries",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "POD submit error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to submit proof of delivery."
      );
    } finally {
      setSubmitting(false);
    }
  }


  if (loading) {
    return (
      <main className="pod-page">
        <div className="pod-loading">
          <FaTruck />

          <h2>
            Loading Delivery
          </h2>
        </div>
      </main>
    );
  }


  if (
    !context ||
    errorMessage &&
      !context
  ) {
    return (
      <main className="pod-page">
        <div className="pod-loading">
          <FaExclamationTriangle />

          <h2>
            POD Unavailable
          </h2>

          <p>
            {errorMessage ||
              "This delivery could not be loaded."}
          </p>

          <Link
            to="/employee/deliveries"
          >
            Back to My Deliveries
          </Link>
        </div>
      </main>
    );
  }


  const existingDelivered =
    context.pod?.delivery_result ===
    "delivered";


  return (
    <main className="pod-page">
      <header className="pod-header">
        <div className="pod-header-inner">
          <Link
            to="/employee/deliveries"
            className="pod-back"
          >
            <FaArrowLeft />
          </Link>

          <AEDCLogo
            compact
            className="pod-logo"
          />

          <div>
            <span>
              DRIVER OPERATIONS
            </span>

            <h1>
              Proof of Delivery
            </h1>

            <p>
              {
                context.job
                  ?.job_reference
              }
            </p>
          </div>
        </div>
      </header>


      <section className="pod-content">
        {errorMessage && (
          <div className="pod-message pod-error">
            <FaExclamationTriangle />
            <span>
              {errorMessage}
            </span>
          </div>
        )}


        <section className="pod-context-card">
          <div className="pod-context-heading">
            <span>
              DELIVERY JOB
            </span>

            <h2>
              {
                context.customer
                  ?.company_name
              }
            </h2>
          </div>

          <div className="pod-route">
            <div>
              <FaMapMarkerAlt />

              <span>
                Pickup
              </span>

              <strong>
                {
                  context.job
                    ?.pickup_address
                }
              </strong>
            </div>

            <div>
              <FaMapMarkerAlt />

              <span>
                Delivery
              </span>

              <strong>
                {
                  context.job
                    ?.delivery_address
                }
              </strong>
            </div>
          </div>

          <div className="pod-context-grid">
            <div>
              <FaBox />

              <span>
                Cargo
              </span>

              <strong>
                {context.job
                  ?.cargo_description ||
                  "Not recorded"}
              </strong>
            </div>

            <div>
              <FaTruck />

              <span>
                Vehicle
              </span>

              <strong>
                {
                  context.vehicle
                    ?.registration
                }
              </strong>
            </div>

            <div>
              <FaUser />

              <span>
                Driver
              </span>

              <strong>
                {
                  context.driver_name
                }
              </strong>
            </div>
          </div>
        </section>


        {existingDelivered ? (
          <section className="pod-complete-card">
            <FaCheckCircle />

            <h2>
              Delivery Confirmed
            </h2>

            <p>
              Successful POD has already
              been recorded for this job.
            </p>

            <div>
              <span>
                Recipient
              </span>

              <strong>
                {
                  context.pod
                    .recipient_name
                }
              </strong>
            </div>

            <div>
              <span>
                Delivered
              </span>

              <strong>
                {formatDateTime(
                  context.pod
                    .delivered_at
                )}
              </strong>
            </div>

            {context.pod
              .signature_data && (
              <div className="pod-saved-signature">
                <span>
                  Recipient Signature
                </span>

                <img
                  src={
                    context.pod
                      .signature_data
                  }
                  alt="Recipient signature"
                />
              </div>
            )}

            <Link
              to={`/employee/return/${tripId}`}
            >
              Return Vehicle
            </Link>
          </section>
        ) : (
          <form
            className="pod-form"
            onSubmit={handleSubmit}
          >
            <section className="pod-card">
              <div className="pod-section-heading">
                <FaClipboardCheck />

                <div>
                  <span>
                    01
                  </span>

                  <h2>
                    Delivery Result
                  </h2>
                </div>
              </div>

              <div className="pod-grid">
                <label>
                  Result *
                  <select
                    name="deliveryResult"
                    value={
                      formData
                        .deliveryResult
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="delivered">
                      Delivered
                    </option>

                    <option value="partial">
                      Partial Delivery
                    </option>

                    <option value="failed">
                      Delivery Failed
                    </option>
                  </select>
                </label>

                <label>
                  Delivery Date / Time *
                  <input
                    type="datetime-local"
                    name="deliveredAt"
                    value={
                      formData.deliveredAt
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />
                </label>

                <label className="pod-full">
                  Delivery Location
                  <input
                    name="deliveryLocation"
                    value={
                      formData
                        .deliveryLocation
                    }
                    onChange={
                      handleChange
                    }
                  />
                </label>

                <label>
                  Goods Condition *
                  <select
                    name="goodsCondition"
                    value={
                      formData
                        .goodsCondition
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="received-in-good-order">
                      Received in Good Order
                    </option>

                    <option value="damaged">
                      Damaged
                    </option>

                    <option value="short-delivery">
                      Short Delivery
                    </option>

                    <option value="rejected">
                      Rejected
                    </option>
                  </select>
                </label>

                <label>
                  Quantity Received
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="quantityReceived"
                    value={
                      formData
                        .quantityReceived
                    }
                    onChange={
                      handleChange
                    }
                  />
                </label>
              </div>
            </section>


            <section className="pod-card">
              <div className="pod-section-heading">
                <FaUser />

                <div>
                  <span>
                    02
                  </span>

                  <h2>
                    Recipient Confirmation
                  </h2>
                </div>
              </div>

              {formData.deliveryResult ===
              "failed" ? (
                <div className="pod-failed-note">
                  <FaExclamationTriangle />

                  <div>
                    <strong>
                      No recipient sign-off required
                    </strong>

                    <p>
                      For a failed delivery, record the
                      reason clearly in Delivery Notes.
                      The job will remain IN PROGRESS.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="pod-grid">
                    <label>
                      Recipient Name *
                      <input
                        name="recipientName"
                        value={
                          formData
                            .recipientName
                        }
                        onChange={
                          handleChange
                        }
                        required
                      />
                    </label>

                    <label>
                      Role / Position
                      <input
                        name="recipientRole"
                        value={
                          formData
                            .recipientRole
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="e.g. Store Manager"
                      />
                    </label>

                    <label>
                      Phone
                      <input
                        name="recipientPhone"
                        value={
                          formData
                            .recipientPhone
                        }
                        onChange={
                          handleChange
                        }
                      />
                    </label>

                    <label>
                      POD / Document Reference
                      <input
                        name="documentReference"
                        value={
                          formData
                            .documentReference
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Delivery note / GRV number"
                      />
                    </label>

                    <label className="pod-full">
                      Recipient Confirmation Name *
                      <input
                        name="recipientSignatureName"
                        value={
                          formData
                            .recipientSignatureName
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Type the recipient's full name"
                        required
                      />
                    </label>
                  </div>


                  <div className="pod-signature-field">
                    <label>
                      Recipient Signature *
                    </label>

                    <RecipientSignaturePad
                      value={
                        signatureData
                      }
                      onChange={
                        setSignatureData
                      }
                    />
                  </div>


                  <label className="pod-confirmation">
                    <input
                      type="checkbox"
                      name="recipientConfirmed"
                      checked={
                        formData
                          .recipientConfirmed
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <span>
                      <strong>
                        Recipient confirms the
                        delivery information above
                      </strong>

                      <small>
                        The signature, typed name,
                        timestamp and driver audit
                        trail will be stored with
                        this POD record.
                      </small>
                    </span>
                  </label>
                </>
              )}
            </section>


            <section className="pod-card">
              <div className="pod-section-heading">
                <FaBox />

                <div>
                  <span>
                    03
                  </span>

                  <h2>
                    Delivery Notes
                  </h2>
                </div>
              </div>

              <label className="pod-notes">
                {formData.deliveryResult ===
                "failed"
                  ? "Failure Reason *"
                  : "Notes"}
                <textarea
                  name="deliveryNotes"
                  rows="5"
                  value={
                    formData
                      .deliveryNotes
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Record shortages, damage, rejected goods, waiting time or any delivery remarks..."
                />
              </label>
            </section>


            <div className="pod-actions">
              <Link
                to="/employee/deliveries"
                className="pod-cancel"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="pod-submit"
                disabled={submitting}
              >
                <FaCheckCircle />

                {submitting
                  ? "Saving POD..."
                  : "Submit Proof of Delivery"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}


export default EmployeeProofOfDelivery;
