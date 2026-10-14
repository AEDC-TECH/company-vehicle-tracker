import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  FaArrowLeft,
  FaBox,
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaFileAlt,
  FaMapMarkerAlt,
  FaPrint,
  FaSignature,
  FaTruck,
  FaUpload,
  FaUser,
} from "react-icons/fa";

import {
  jsPDF,
} from "jspdf";

import { supabase } from "../lib/supabase";
import AEDCLogo from "../Components/AEDCLogo";

import "../Styles/AdminProofOfDelivery.css";


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
  ).format(
    new Date(value)
  );
}


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


function formatLabel(value) {
  if (!value) {
    return "Not recorded";
  }

  return String(value)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


function safeFilePart(value) {
  return String(value || "POD")
    .trim()
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}


function AdminProofOfDelivery() {
  const {
    jobId,
  } = useParams();

  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();

  const [
    context,
    setContext,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    paperFile,
    setPaperFile,
  ] =
    useState(null);

  const [
    paperPreviewUrl,
    setPaperPreviewUrl,
  ] =
    useState("");

  const [
    formData,
    setFormData,
  ] =
    useState({
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
  }, [jobId]);


  useEffect(() => {
    if (
      !loading &&
      context &&
      searchParams.get(
        "print"
      ) === "blank"
    ) {
      window.setTimeout(
        () => {
          window.print();

          const next =
            new URLSearchParams(
              searchParams
            );

          next.delete(
            "print"
          );

          setSearchParams(
            next,
            {
              replace: true,
            }
          );
        },
        120
      );
    }
  }, [
    loading,
    context,
    searchParams,
    setSearchParams,
  ]);


  async function loadContext() {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const {
        data:
          job,
        error:
          jobError,
      } =
        await supabase
          .from(
            "transport_jobs"
          )
          .select(`
            *,
            fleet_customers (
              id,
              customer_code,
              company_name,
              contact_name,
              email,
              phone,
              physical_address,
              billing_address,
              vat_number
            ),
            vehicles (
              id,
              make,
              model,
              registration
            ),
            drivers (
              id,
              full_name,
              employee_number,
              phone,
              department
            )
          `)
          .eq(
            "id",
            jobId
          )
          .single();

      if (jobError) {
        throw jobError;
      }


      const [
        requestResult,
        tripResult,
        podResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "vehicle_requests"
            )
            .select("*")
            .eq(
              "transport_job_id",
              jobId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle(),

          job.trip_id
            ? supabase
                .from(
                  "vehicle_trips"
                )
                .select("*")
                .eq(
                  "id",
                  job.trip_id
                )
                .maybeSingle()
            : Promise.resolve({
                data: null,
                error: null,
              }),

          supabase
            .from(
              "fleet_proof_of_delivery"
            )
            .select("*")
            .eq(
              "transport_job_id",
              jobId
            )
            .maybeSingle(),
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

      if (
        podResult.error
      ) {
        throw podResult.error;
      }


      let trip =
        tripResult.data ||
        null;

      if (
        !trip &&
        requestResult.data?.id
      ) {
        const {
          data:
            fallbackTrip,
          error:
            fallbackError,
        } =
          await supabase
            .from(
              "vehicle_trips"
            )
            .select("*")
            .eq(
              "request_id",
              requestResult.data
                .id
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle();

        if (
          fallbackError
        ) {
          throw fallbackError;
        }

        trip =
          fallbackTrip ||
          null;
      }


      const pod =
        podResult.data ||
        null;


      let signedPaperUrl =
        "";

      if (
        pod
          ?.paper_document_path
      ) {
        const {
          data:
            signedUrlData,
          error:
            signedUrlError,
        } =
          await supabase
            .storage
            .from(
              "pod-documents"
            )
            .createSignedUrl(
              pod
                .paper_document_path,
              60 * 60
            );

        if (
          signedUrlError
        ) {
          console.warn(
            "Paper POD signed URL error:",
            signedUrlError
          );
        } else {
          signedPaperUrl =
            signedUrlData
              ?.signedUrl ||
            "";
        }
      }


      const nextContext = {
        job,
        customer:
          job.fleet_customers ||
          {},
        vehicle:
          job.vehicles ||
          {},
        driver:
          job.drivers ||
          {},
        request:
          requestResult.data ||
          null,
        trip,
        pod,
        signedPaperUrl,
      };

      setContext(
        nextContext
      );

      setPaperPreviewUrl(
        signedPaperUrl
      );


      if (pod) {
        setFormData({
          deliveryResult:
            pod.delivery_result ||
            "delivered",

          deliveredAt:
            toLocalInput(
              pod.delivered_at
            ),

          deliveryLocation:
            pod.delivery_location ||
            job.delivery_address ||
            "",

          recipientName:
            pod.recipient_name ||
            "",

          recipientRole:
            pod.recipient_role ||
            "",

          goodsCondition:
            pod.goods_condition ||
            "received-in-good-order",

          quantityReceived:
            pod.quantity_received ??
            job.load_units ??
            "",

          documentReference:
            pod.document_reference ||
            "",

          deliveryNotes:
            pod.delivery_notes ||
            "",
        });
      } else {
        setFormData(
          (current) => ({
            ...current,

            deliveredAt:
              toLocalInput(),

            deliveryLocation:
              job.delivery_address ||
              "",

            quantityReceived:
              job.load_units ??
              "",
          })
        );
      }
    } catch (error) {
      console.error(
        "Admin POD load error:",
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


  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          value,
      })
    );
  }


  function handlePaperFile(
    event
  ) {
    const file =
      event.target.files?.[0] ||
      null;

    setErrorMessage("");

    if (!file) {
      setPaperFile(null);
      return;
    }

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowed.includes(
        file.type
      )
    ) {
      setPaperFile(null);

      setErrorMessage(
        "Signed paper POD must be a PDF, JPG, PNG or WEBP file."
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      15 * 1024 * 1024
    ) {
      setPaperFile(null);

      setErrorMessage(
        "Signed paper POD cannot exceed 15 MB."
      );

      event.target.value =
        "";

      return;
    }

    setPaperFile(
      file
    );
  }


  async function savePaperPod(
    event
  ) {
    event.preventDefault();

    if (
      !context?.trip
    ) {
      setErrorMessage(
        "The vehicle trip has not started yet. Print the blank POD now, then upload the signed copy after the delivery trip exists."
      );

      return;
    }

    if (
      !paperFile
    ) {
      setErrorMessage(
        "Select the signed paper POD file."
      );

      return;
    }

    if (
      [
        "delivered",
        "partial",
      ].includes(
        formData
          .deliveryResult
      ) &&
      !formData
        .recipientName
        .trim()
    ) {
      setErrorMessage(
        "Enter the recipient name shown on the signed paper POD."
      );

      return;
    }

    if (
      formData
        .deliveryResult ===
        "failed" &&
      !formData
        .deliveryNotes
        .trim()
    ) {
      setErrorMessage(
        "Enter the reason the delivery failed."
      );

      return;
    }


    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase
          .auth
          .getUser();

      if (
        userError ||
        !user
      ) {
        throw new Error(
          "Admin session could not be verified."
        );
      }


      const cleanName =
        paperFile.name
          .replace(
            /\s+/g,
            "-"
          )
          .replace(
            /[^a-zA-Z0-9._-]/g,
            ""
          )
          .toLowerCase();

      const storagePath =
        `jobs/${jobId}/${Date.now()}-${crypto.randomUUID()}-${cleanName}`;


      const {
        error:
          uploadError,
      } =
        await supabase
          .storage
          .from(
            "pod-documents"
          )
          .upload(
            storagePath,
            paperFile,
            {
              cacheControl:
                "3600",
              upsert:
                false,
              contentType:
                paperFile.type,
            }
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }


      const {
        data:
          result,
        error:
          rpcError,
      } =
        await supabase
          .rpc(
            "admin_record_paper_pod",
            {
              p_transport_job_id:
                jobId,

              p_delivery_result:
                formData
                  .deliveryResult,

              p_delivered_at:
                new Date(
                  formData
                    .deliveredAt
                ).toISOString(),

              p_delivery_location:
                formData
                  .deliveryLocation
                  .trim() ||
                null,

              p_recipient_name:
                formData
                  .recipientName
                  .trim() ||
                null,

              p_recipient_role:
                formData
                  .recipientRole
                  .trim() ||
                null,

              p_goods_condition:
                formData
                  .goodsCondition,

              p_quantity_received:
                formData
                  .quantityReceived ===
                  ""
                  ? null
                  : Number(
                      formData
                        .quantityReceived
                    ),

              p_document_reference:
                formData
                  .documentReference
                  .trim() ||
                null,

              p_delivery_notes:
                formData
                  .deliveryNotes
                  .trim() ||
                null,

              p_storage_path:
                storagePath,

              p_file_name:
                paperFile.name,

              p_mime_type:
                paperFile.type,

              p_uploaded_by:
                user.email ||
                user.id,
            }
          );


      if (
        rpcError
      ) {
        await supabase
          .storage
          .from(
            "pod-documents"
          )
          .remove([
            storagePath,
          ]);

        throw rpcError;
      }


      setSuccessMessage(
        result
          ?.pod_method ===
          "paper"
          ? "Signed paper POD recorded successfully."
          : "Signed paper copy attached to the existing digital POD."
      );

      setPaperFile(
        null
      );

      await loadContext();
    } catch (error) {
      console.error(
        "Paper POD save error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to save the signed paper POD."
      );
    } finally {
      setSaving(false);
    }
  }


  function printBlankPod() {
    window.print();
  }


  function addWrappedText(
    doc,
    text,
    x,
    y,
    width,
    options = {}
  ) {
    const lines =
      doc.splitTextToSize(
        String(
          text ||
          "Not recorded"
        ),
        width
      );

    doc.text(
      lines,
      x,
      y,
      options
    );

    return (
      y +
      lines.length * 5
    );
  }


  async function downloadPodPdf() {
    if (
      !context?.pod
    ) {
      setErrorMessage(
        "There is no completed POD to download yet."
      );

      return;
    }


    try {
      setErrorMessage("");

      const {
        job,
        customer,
        vehicle,
        driver,
        trip,
        pod,
      } =
        context;

      const doc =
        new jsPDF({
          unit: "mm",
          format: "a4",
        });

      const pageWidth =
        doc.internal
          .pageSize
          .getWidth();

      const pageHeight =
        doc.internal
          .pageSize
          .getHeight();

      const margin = 12;
      const contentWidth =
        pageWidth -
        margin * 2;

      const cream = [
        255,
        251,
        234,
      ];

      const creamDark = [
        249,
        241,
        214,
      ];

      const gold = [
        179,
        139,
        46,
      ];

      const goldDark = [
        143,
        111,
        29,
      ];

      const navy = [
        17,
        20,
        95,
      ];

      const textDark = [
        47,
        47,
        47,
      ];

      const textMuted = [
        126,
        114,
        71,
      ];

      const line = [
        234,
        223,
        182,
      ];

      const softLine = [
        240,
        232,
        203,
      ];


      function fillPageBackground() {
        doc.setFillColor(
          ...cream
        );

        doc.rect(
          0,
          0,
          pageWidth,
          pageHeight,
          "F"
        );

        doc.setDrawColor(
          ...line
        );

        doc.setLineWidth(
          0.35
        );

        doc.roundedRect(
          7,
          7,
          pageWidth - 14,
          pageHeight - 14,
          4,
          4,
          "S"
        );
      }


      function sectionTitle(
        title,
        y
      ) {
        doc.setFillColor(
          ...creamDark
        );

        doc.setDrawColor(
          ...line
        );

        doc.roundedRect(
          margin,
          y,
          contentWidth,
          8,
          2,
          2,
          "FD"
        );

        doc.setTextColor(
          ...goldDark
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(
          8
        );

        doc.text(
          String(
            title
          ).toUpperCase(),
          margin + 4,
          y + 5.3
        );

        return y + 11;
      }


      function infoBox(
        label,
        value,
        x,
        y,
        width,
        height = 16
      ) {
        doc.setFillColor(
          255,
          253,
          244
        );

        doc.setDrawColor(
          ...line
        );

        doc.roundedRect(
          x,
          y,
          width,
          height,
          2.2,
          2.2,
          "FD"
        );

        doc.setTextColor(
          ...textMuted
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(
          6.2
        );

        doc.text(
          String(
            label
          ).toUpperCase(),
          x + 3,
          y + 4.5
        );

        doc.setTextColor(
          ...textDark
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(
          8
        );

        const lines =
          doc.splitTextToSize(
            String(
              value ||
              "Not recorded"
            ),
            width - 6
          );

        doc.text(
          lines.slice(
            0,
            2
          ),
          x + 3,
          y + 9
        );
      }


      function ensureSpace(
        y,
        needed = 28
      ) {
        if (
          y + needed >
          pageHeight - 18
        ) {
          doc.addPage();

          fillPageBackground();

          return 18;
        }

        return y;
      }


      fillPageBackground();


      /*
       * ============================================
       * HEADER
       * ============================================
       */

      doc.setFillColor(
        ...navy
      );

      doc.roundedRect(
        margin,
        13,
        contentWidth,
        24,
        3,
        3,
        "F"
      );

      doc.setTextColor(
        255,
        255,
        255
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        14
      );

      doc.text(
        "AEDC TRANSPORT OPERATIONS",
        margin + 5,
        22
      );

      doc.setFontSize(
        7.2
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        "DELIVERY NOTE / PROOF OF DELIVERY",
        margin + 5,
        29
      );


      doc.setFillColor(
        ...gold
      );

      doc.roundedRect(
        pageWidth - margin - 48,
        18,
        43,
        13,
        2,
        2,
        "F"
      );

      doc.setTextColor(
        255,
        255,
        255
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        6
      );

      doc.text(
        "JOB REFERENCE",
        pageWidth - margin - 45,
        22.5
      );

      doc.setFontSize(
        7.5
      );

      doc.text(
        String(
          job.job_reference ||
          job.id
        ).slice(
          0,
          24
        ),
        pageWidth - margin - 45,
        28
      );


      let y = 43;


      /*
       * ============================================
       * JOB / CUSTOMER
       * ============================================
       */

      y =
        sectionTitle(
          "Customer & Delivery",
          y
        );

      const gap = 4;
      const half =
        (
          contentWidth -
          gap
        ) /
        2;

      infoBox(
        "Customer",
        customer.company_name,
        margin,
        y,
        half
      );

      infoBox(
        "Customer Reference",
        job.customer_reference ||
          "Not recorded",
        margin + half + gap,
        y,
        half
      );

      y += 20;

      infoBox(
        "Pickup",
        job.pickup_address,
        margin,
        y,
        contentWidth,
        17
      );

      y += 21;

      infoBox(
        "Delivery",
        pod.delivery_location ||
          job.delivery_address,
        margin,
        y,
        contentWidth,
        17
      );

      y += 23;


      /*
       * ============================================
       * VEHICLE / DRIVER
       * ============================================
       */

      y =
        sectionTitle(
          "Vehicle & Driver",
          y
        );

      infoBox(
        "Vehicle",
        `${vehicle.make || ""} ${vehicle.model || ""}`.trim() ||
          "Not recorded",
        margin,
        y,
        half
      );

      infoBox(
        "Registration",
        vehicle.registration ||
          "Not recorded",
        margin + half + gap,
        y,
        half
      );

      y += 20;

      infoBox(
        "Driver",
        driver.full_name ||
          trip?.driver_name ||
          "Not recorded",
        margin,
        y,
        half
      );

      infoBox(
        "Employee Number",
        driver.employee_number ||
          trip?.employee_number ||
          "Not recorded",
        margin + half + gap,
        y,
        half
      );

      y += 23;


      /*
       * ============================================
       * GOODS + DELIVERY
       * ============================================
       */

      y =
        ensureSpace(
          y,
          65
        );

      y =
        sectionTitle(
          "Goods & Delivery Result",
          y
        );

      infoBox(
        "Cargo",
        job.cargo_description ||
          "Not recorded",
        margin,
        y,
        contentWidth,
        17
      );

      y += 21;

      const third =
        (
          contentWidth -
          gap * 2
        ) /
        3;

      infoBox(
        "Planned Units",
        job.load_units ??
          "Not recorded",
        margin,
        y,
        third
      );

      infoBox(
        "Quantity Received",
        pod.quantity_received ??
          "Not recorded",
        margin + third + gap,
        y,
        third
      );

      infoBox(
        "Weight",
        job.load_weight_kg !=
        null
          ? `${Number(
              job.load_weight_kg
            ).toLocaleString(
              "en-ZA"
            )} kg`
          : "Not recorded",
        margin +
          (
            third +
            gap
          ) *
            2,
        y,
        third
      );

      y += 20;

      infoBox(
        "Delivery Result",
        formatLabel(
          pod.delivery_result
        ),
        margin,
        y,
        third
      );

      infoBox(
        "Goods Condition",
        formatLabel(
          pod.goods_condition
        ),
        margin + third + gap,
        y,
        third
      );

      infoBox(
        "POD Method",
        formatLabel(
          pod.pod_method ||
            (
              pod.signature_data
                ? "digital"
                : "paper"
            )
        ),
        margin +
          (
            third +
            gap
          ) *
            2,
        y,
        third
      );

      y += 23;


      /*
       * ============================================
       * RECIPIENT
       * ============================================
       */

      y =
        ensureSpace(
          y,
          60
        );

      y =
        sectionTitle(
          "Recipient Confirmation",
          y
        );

      infoBox(
        "Recipient",
        pod.recipient_name ||
          "Not recorded",
        margin,
        y,
        half
      );

      infoBox(
        "Position",
        pod.recipient_role ||
          "Not recorded",
        margin + half + gap,
        y,
        half
      );

      y += 20;

      infoBox(
        "Delivered At",
        formatDateTime(
          pod.delivered_at
        ),
        margin,
        y,
        half
      );

      infoBox(
        "Document Reference",
        pod.document_reference ||
          "Not recorded",
        margin + half + gap,
        y,
        half
      );

      y += 23;


      /*
       * ============================================
       * NOTES
       * ============================================
       */

      y =
        ensureSpace(
          y,
          45
        );

      y =
        sectionTitle(
          "Delivery Notes",
          y
        );

      doc.setFillColor(
        255,
        253,
        244
      );

      doc.setDrawColor(
        ...line
      );

      doc.roundedRect(
        margin,
        y,
        contentWidth,
        30,
        2,
        2,
        "FD"
      );

      doc.setTextColor(
        ...textDark
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        7.5
      );

      const noteLines =
        doc.splitTextToSize(
          String(
            pod.delivery_notes ||
            "No additional delivery notes recorded."
          ),
          contentWidth - 8
        );

      doc.text(
        noteLines.slice(
          0,
          5
        ),
        margin + 4,
        y + 6
      );

      doc.setDrawColor(
        ...softLine
      );

      doc.setLineWidth(
        0.2
      );

      for (
        let lineY =
          y + 12;
        lineY <
        y + 28;
        lineY += 5
      ) {
        doc.line(
          margin + 4,
          lineY,
          pageWidth -
            margin -
            4,
          lineY
        );
      }

      y += 35;


      /*
       * ============================================
       * SIGNATURE
       * ============================================
       */

      y =
        ensureSpace(
          y,
          48
        );

      y =
        sectionTitle(
          "Customer Sign-Off",
          y
        );

      doc.setFillColor(
        255,
        253,
        244
      );

      doc.setDrawColor(
        ...line
      );

      doc.roundedRect(
        margin,
        y,
        contentWidth,
        38,
        2,
        2,
        "FD"
      );

      doc.setTextColor(
        ...textMuted
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        6.3
      );

      doc.text(
        pod.signature_data
          ? "DIGITAL RECIPIENT SIGNATURE"
          : "SIGNED PAPER POD",
        margin + 4,
        y + 5
      );


      if (
        pod.signature_data
      ) {
        try {
          doc.addImage(
            pod.signature_data,
            "PNG",
            margin + 4,
            y + 8,
            67,
            23
          );
        } catch (
          signatureError
        ) {
          console.warn(
            "PDF signature image error:",
            signatureError
          );
        }
      } else {
        doc.setDrawColor(
          ...softLine
        );

        doc.line(
          margin + 4,
          y + 26,
          margin + 72,
          y + 26
        );

        doc.setTextColor(
          ...textMuted
        );

        doc.setFontSize(
          6.2
        );

        doc.text(
          "See attached signed paper POD scan.",
          margin + 4,
          y + 32
        );
      }


      doc.setTextColor(
        ...textDark
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(
        7
      );

      doc.text(
        "Recipient Name",
        margin + 82,
        y + 12
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        pod.recipient_signature_name ||
          pod.recipient_name ||
          "Not recorded",
        margin + 82,
        y + 18
      );

      doc.setDrawColor(
        ...softLine
      );

      doc.line(
        margin + 82,
        y + 21,
        pageWidth -
          margin -
          5,
        y + 21
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.text(
        "Confirmation Date",
        margin + 82,
        y + 27
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.text(
        formatDateTime(
          pod.signature_captured_at ||
          pod.delivered_at
        ),
        margin + 82,
        y + 33
      );


      /*
       * ============================================
       * FOOTER
       * ============================================
       */

      doc.setDrawColor(
        ...line
      );

      doc.line(
        margin,
        pageHeight - 16,
        pageWidth - margin,
        pageHeight - 16
      );

      doc.setTextColor(
        ...textMuted
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(
        6.2
      );

      doc.text(
        `Generated from AEDC Fleet Management System · ${formatDateTime(
          new Date()
        )}`,
        margin,
        pageHeight - 11
      );

      doc.text(
        String(
          job.job_reference ||
          ""
        ),
        pageWidth -
          margin,
        pageHeight - 11,
        {
          align:
            "right",
        }
      );


      const fileName =
        `POD-${safeFilePart(
          job.job_reference
        )}-${safeFilePart(
          customer.company_name
        )}.pdf`;

      doc.save(
        fileName
      );
    } catch (error) {
      console.error(
        "POD PDF error:",
        error
      );

      setErrorMessage(
        "Unable to generate the POD PDF."
      );
    }
  }


  const podMethod =
    useMemo(() => {
      if (
        context?.pod
          ?.signature_data
      ) {
        return "digital";
      }

      if (
        context?.pod
          ?.paper_document_path
      ) {
        return "paper";
      }

      return (
        context?.pod
          ?.pod_method ||
        null
      );
    }, [context]);


  if (loading) {
    return (
      <main className="admin-pod-page">
        <div className="admin-pod-loading">
          <FaTruck />
          <h2>
            Loading delivery documents...
          </h2>
        </div>
      </main>
    );
  }


  if (!context) {
    return (
      <main className="admin-pod-page">
        <div className="admin-pod-loading">
          <FaExclamationTriangle />

          <h2>
            Delivery documents unavailable
          </h2>

          <p>
            {errorMessage}
          </p>

          <Link to="/dispatch">
            Back to Dispatch
          </Link>
        </div>
      </main>
    );
  }


  const {
    job,
    customer,
    vehicle,
    driver,
    trip,
    pod,
  } =
    context;


  return (
    <main className="admin-pod-page">

      <header className="admin-pod-header no-print">
        <div className="admin-pod-header-inner">

          <Link
            to="/dispatch"
            className="admin-pod-back"
          >
            <FaArrowLeft />
          </Link>

          <AEDCLogo
            compact
            className="admin-pod-logo"
          />

          <div className="admin-pod-header-copy">
            <span>
              TRANSPORT OPERATIONS
            </span>

            <h1>
              Proof of Delivery
            </h1>

            <p>
              {job.job_reference}
            </p>
          </div>

          <div className="admin-pod-header-actions">

            <button
              type="button"
              onClick={
                printBlankPod
              }
            >
              <FaPrint />
              Print Blank POD
            </button>

            {pod && (
              <button
                type="button"
                className="primary"
                onClick={
                  downloadPodPdf
                }
              >
                <FaDownload />
                Download POD PDF
              </button>
            )}

          </div>

        </div>
      </header>


      <section className="admin-pod-content no-print">

        {errorMessage && (
          <div className="admin-pod-message error">
            <FaExclamationTriangle />
            <span>
              {errorMessage}
            </span>
          </div>
        )}

        {successMessage && (
          <div className="admin-pod-message success">
            <FaCheckCircle />
            <span>
              {successMessage}
            </span>
          </div>
        )}


        <section className="admin-pod-overview">

          <div>
            <span>
              JOB
            </span>

            <strong>
              {job.job_reference}
            </strong>
          </div>

          <div>
            <span>
              CUSTOMER
            </span>

            <strong>
              {customer.company_name ||
                "Not recorded"}
            </strong>
          </div>

          <div>
            <span>
              VEHICLE
            </span>

            <strong>
              {vehicle.registration ||
                "Not assigned"}
            </strong>

            <small>
              {vehicle.make}{" "}
              {vehicle.model}
            </small>
          </div>

          <div>
            <span>
              DRIVER
            </span>

            <strong>
              {driver.full_name ||
                trip?.driver_name ||
                "Not assigned"}
            </strong>

            <small>
              {driver.employee_number ||
                trip?.employee_number ||
                ""}
            </small>
          </div>

        </section>


        <section className="admin-pod-route-card">

          <div>
            <FaMapMarkerAlt />

            <span>
              PICKUP
            </span>

            <strong>
              {job.pickup_address ||
                "Not recorded"}
            </strong>
          </div>

          <div>
            <FaMapMarkerAlt />

            <span>
              DELIVERY
            </span>

            <strong>
              {job.delivery_address ||
                "Not recorded"}
            </strong>
          </div>

        </section>


        {pod ? (
          <section className="admin-pod-card">

            <div className="admin-pod-card-heading">
              <FaCheckCircle />

              <div>
                <span>
                  COMPLETED POD
                </span>

                <h2>
                  Delivery Confirmation
                </h2>
              </div>

              <strong className={`admin-pod-method ${podMethod || ""}`}>
                {formatLabel(
                  podMethod ||
                    "recorded"
                )}
              </strong>
            </div>


            <div className="admin-pod-details">

              <div>
                <span>
                  Delivery Result
                </span>

                <strong>
                  {formatLabel(
                    pod.delivery_result
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Delivered At
                </span>

                <strong>
                  {formatDateTime(
                    pod.delivered_at
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Recipient
                </span>

                <strong>
                  {pod.recipient_name ||
                    "Not recorded"}
                </strong>
              </div>

              <div>
                <span>
                  Position
                </span>

                <strong>
                  {pod.recipient_role ||
                    "Not recorded"}
                </strong>
              </div>

              <div>
                <span>
                  Goods Condition
                </span>

                <strong>
                  {formatLabel(
                    pod.goods_condition
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Quantity Received
                </span>

                <strong>
                  {pod.quantity_received ??
                    "Not recorded"}
                </strong>
              </div>

              <div>
                <span>
                  Document Reference
                </span>

                <strong>
                  {pod.document_reference ||
                    "Not recorded"}
                </strong>
              </div>

              <div>
                <span>
                  Delivery Location
                </span>

                <strong>
                  {pod.delivery_location ||
                    job.delivery_address ||
                    "Not recorded"}
                </strong>
              </div>

            </div>


            {pod.delivery_notes && (
              <div className="admin-pod-notes">
                <span>
                  DELIVERY NOTES
                </span>

                <p>
                  {pod.delivery_notes}
                </p>
              </div>
            )}


            {pod.signature_data && (
              <div className="admin-pod-signature">
                <div>
                  <FaSignature />

                  <span>
                    DIGITAL RECIPIENT SIGNATURE
                  </span>
                </div>

                <img
                  src={
                    pod.signature_data
                  }
                  alt="Recipient signature"
                />

                <small>
                  Signed as{" "}
                  {pod.recipient_signature_name ||
                    pod.recipient_name}
                </small>
              </div>
            )}


            {context.signedPaperUrl && (
              <div className="admin-pod-paper-attached">
                <FaFileAlt />

                <div>
                  <span>
                    SIGNED PAPER POD ATTACHED
                  </span>

                  <strong>
                    {pod.paper_document_name ||
                      "Signed POD document"}
                  </strong>

                  <small>
                    Uploaded{" "}
                    {formatDateTime(
                      pod.paper_document_uploaded_at
                    )}
                    {pod.paper_document_uploaded_by
                      ? ` by ${pod.paper_document_uploaded_by}`
                      : ""}
                  </small>
                </div>

                <a
                  href={
                    context.signedPaperUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  View Scan
                </a>
              </div>
            )}

          </section>
        ) : (
          <section className="admin-pod-card admin-pod-empty">

            <FaFileAlt />

            <h2>
              No completed POD yet
            </h2>

            <p>
              If the driver has a phone,
              the customer can sign the
              digital POD. If the driver
              does not have a phone, print
              the blank POD below and upload
              the signed paper copy after
              delivery.
            </p>

          </section>
        )}


        <section className="admin-pod-card">

          <div className="admin-pod-card-heading">
            <FaUpload />

            <div>
              <span>
                PAPER FALLBACK
              </span>

              <h2>
                Upload Signed Paper POD
              </h2>
            </div>
          </div>


          {!trip && (
            <div className="admin-pod-message warning">
              <FaExclamationTriangle />

              <span>
                The vehicle trip has not started yet.
                You can print the blank POD now.
                Uploading the signed copy becomes
                available once the trip exists.
              </span>
            </div>
          )}


          <form
            className="admin-paper-pod-form"
            onSubmit={
              savePaperPod
            }
          >

            <div className="admin-paper-grid">

              <label>
                Delivery Result *
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
                    formData
                      .deliveredAt
                  }
                  onChange={
                    handleChange
                  }
                  required
                />
              </label>


              <label className="full">
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
                Recipient Name
                <input
                  name="recipientName"
                  value={
                    formData
                      .recipientName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Name written on the paper POD"
                />
              </label>


              <label>
                Recipient Role / Position
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
                Goods Condition
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


              <label className="full">
                POD / Delivery Note Reference
                <input
                  name="documentReference"
                  value={
                    formData
                      .documentReference
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Paper POD / GRV / delivery note number"
                />
              </label>


              <label className="full">
                Delivery Notes
                <textarea
                  name="deliveryNotes"
                  rows="4"
                  value={
                    formData
                      .deliveryNotes
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Shortages, damage, rejected goods or delivery remarks..."
                />
              </label>

            </div>


            <label className="admin-paper-file">
              <FaUpload />

              <div>
                <strong>
                  Signed Paper POD *
                </strong>

                <span>
                  Upload PDF, JPG, PNG or WEBP · Maximum 15 MB
                </span>
              </div>

              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={
                  handlePaperFile
                }
              />
            </label>


            {paperFile && (
              <div className="admin-paper-selected">
                <FaFileAlt />

                <div>
                  <strong>
                    {paperFile.name}
                  </strong>

                  <span>
                    {(
                      paperFile.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </span>
                </div>
              </div>
            )}


            <button
              type="submit"
              className="admin-paper-submit"
              disabled={
                saving ||
                !trip
              }
            >
              <FaCheckCircle />

              {saving
                ? "Saving Paper POD..."
                : "Save Signed Paper POD"}
            </button>

          </form>

        </section>

      </section>


      {/* =====================================================
          PRINT-ONLY BLANK DELIVERY NOTE / POD
      ===================================================== */}

      <section className="blank-pod-print">

        <div className="blank-pod-brand">
          <strong>
            AEDC TRANSPORT OPERATIONS
          </strong>

          <span>
            DELIVERY NOTE / PROOF OF DELIVERY
          </span>
        </div>


        <div className="blank-pod-reference">
          <div>
            <span>
              JOB REFERENCE
            </span>

            <strong>
              {job.job_reference}
            </strong>
          </div>

          <div>
            <span>
              CUSTOMER REFERENCE
            </span>

            <strong>
              {job.customer_reference ||
                "________________"}
            </strong>
          </div>
        </div>


        <div className="blank-pod-section">

          <h2>
            Customer & Delivery
          </h2>

          <div className="blank-pod-grid">

            <div>
              <span>
                Customer
              </span>

              <strong>
                {customer.company_name ||
                  "Not recorded"}
              </strong>
            </div>

            <div>
              <span>
                Contact
              </span>

              <strong>
                {customer.contact_name ||
                  "________________"}
              </strong>
            </div>

            <div className="wide">
              <span>
                Pickup
              </span>

              <strong>
                {job.pickup_address ||
                  "Not recorded"}
              </strong>
            </div>

            <div className="wide">
              <span>
                Delivery
              </span>

              <strong>
                {job.delivery_address ||
                  "Not recorded"}
              </strong>
            </div>

          </div>

        </div>


        <div className="blank-pod-section">

          <h2>
            Vehicle & Driver
          </h2>

          <div className="blank-pod-grid">

            <div>
              <span>
                Vehicle
              </span>

              <strong>
                {vehicle.make}{" "}
                {vehicle.model}
              </strong>
            </div>

            <div>
              <span>
                Registration
              </span>

              <strong>
                {vehicle.registration ||
                  "Not assigned"}
              </strong>
            </div>

            <div>
              <span>
                Driver
              </span>

              <strong>
                {driver.full_name ||
                  "Not assigned"}
              </strong>
            </div>

            <div>
              <span>
                Employee Number
              </span>

              <strong>
                {driver.employee_number ||
                  "Not recorded"}
              </strong>
            </div>

          </div>

        </div>


        <div className="blank-pod-section">

          <h2>
            Goods
          </h2>

          <div className="blank-pod-goods">

            <div>
              <span>
                Description
              </span>

              <strong>
                {job.cargo_description ||
                  "Not recorded"}
              </strong>
            </div>

            <div>
              <span>
                Planned Units
              </span>

              <strong>
                {job.load_units ??
                  "________"}
              </strong>
            </div>

            <div>
              <span>
                Weight
              </span>

              <strong>
                {job.load_weight_kg !=
                null
                  ? `${Number(
                      job.load_weight_kg
                    ).toLocaleString(
                      "en-ZA"
                    )} kg`
                  : "________"}
              </strong>
            </div>

          </div>


          <table className="blank-pod-table">
            <thead>
              <tr>
                <th>
                  Item / Description
                </th>

                <th>
                  Qty Sent
                </th>

                <th>
                  Qty Received
                </th>

                <th>
                  Condition / Remarks
                </th>
              </tr>
            </thead>

            <tbody>
              {[1, 2, 3, 4].map(
                (row) => (
                  <tr key={row}>
                    <td>
                      {row === 1
                        ? job.cargo_description ||
                          ""
                        : ""}
                    </td>

                    <td>
                      {row === 1
                        ? job.load_units ??
                          ""
                        : ""}
                    </td>

                    <td />
                    <td />
                  </tr>
                )
              )}
            </tbody>
          </table>

        </div>


        <div className="blank-pod-section">

          <h2>
            Delivery Result
          </h2>

          <div className="blank-pod-checks">
            <span>
              ☐ Delivered in Full
            </span>

            <span>
              ☐ Partial Delivery
            </span>

            <span>
              ☐ Damaged
            </span>

            <span>
              ☐ Rejected
            </span>
          </div>


          <div className="blank-pod-lines">
            <p>
              Delivery Notes / Exceptions:
            </p>

            <div />
            <div />
            <div />
          </div>

        </div>


        <div className="blank-pod-section blank-pod-signoff">

          <h2>
            Customer Confirmation
          </h2>

          <p>
            I confirm that the goods listed
            above were received as indicated.
          </p>


          <div className="blank-pod-sign-grid">

            <div>
              <span>
                Recipient Name
              </span>
            </div>

            <div>
              <span>
                Position
              </span>
            </div>

            <div>
              <span>
                Signature
              </span>
            </div>

            <div>
              <span>
                Date
              </span>
            </div>

            <div>
              <span>
                Time
              </span>
            </div>

            <div>
              <span>
                Driver Signature
              </span>
            </div>

          </div>

        </div>


        <footer className="blank-pod-footer">
          Generated from AEDC Fleet Management System ·
          Job {job.job_reference}
        </footer>

      </section>

    </main>
  );
}


export default AdminProofOfDelivery;
