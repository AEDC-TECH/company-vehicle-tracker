import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCamera,
  FaCheckCircle,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaEye,
  FaFileAlt,
  FaFileImage,
  FaTachometerAlt,
  FaTimes,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import "../Styles/VehicleEvidenceGallery.css";


const REQUIRED_PHOTO_TYPES = [
  "vehicle-front",
  "vehicle-rear",
  "vehicle-driver-side",
  "vehicle-passenger-side",
];

const REQUIRED_SLOTS = {
  "vehicle-front": {
    title: "Front of Vehicle",
    shortLabel:
      "Required front exterior photo",
    summary:
      "Stand directly in front of the vehicle and capture the complete front view.",
    checkpoints: [
      "Whole front of vehicle inside the frame",
      "Both headlights visible",
      "Front bumper visible",
      "Windscreen visible",
      "Front registration plate visible where possible",
    ],
  },

  "vehicle-rear": {
    title: "Rear of Vehicle",
    shortLabel:
      "Required rear exterior photo",
    summary:
      "Stand directly behind the vehicle and capture the complete rear view.",
    checkpoints: [
      "Whole rear of vehicle inside the frame",
      "Tail lights visible",
      "Rear bumper visible",
      "Rear window visible",
      "Rear registration plate visible where possible",
    ],
  },

  "vehicle-driver-side": {
    title:
      "Driver Side of Vehicle",
    shortLabel:
      "Required driver-side photo",
    summary:
      "Stand square to the driver side and capture the full side profile.",
    checkpoints: [
      "Entire driver side inside the frame",
      "Front wheel visible",
      "Rear wheel visible",
      "All doors visible",
      "Side mirror and body panels visible",
    ],
  },

  "vehicle-passenger-side": {
    title:
      "Passenger Side of Vehicle",
    shortLabel:
      "Required passenger-side photo",
    summary:
      "Stand square to the passenger side and capture the full side profile.",
    checkpoints: [
      "Entire passenger side inside the frame",
      "Front wheel visible",
      "Rear wheel visible",
      "All doors visible",
      "Side mirror and body panels visible",
    ],
  },

  odometer: {
    title: "Odometer",
    shortLabel:
      "Required odometer photo",
    summary:
      "Photograph the dashboard clearly so the odometer reading can be read without zooming.",
    checkpoints: [
      "Odometer digits clearly readable",
      "Dashboard in focus",
      "No blur or glare hiding the reading",
      "Photo taken from close range",
    ],
  },
};


function formatLabel(value) {
  if (!value) {
    return "Evidence";
  }

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function formatDate(value) {
  if (!value) {
    return "Date not recorded";
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


function formatFileSize(bytes) {
  const value =
    Number(bytes || 0);

  if (!value) {
    return "";
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toFixed(0)} KB`;
  }

  return `${(
    value /
    1024 /
    1024
  ).toFixed(2)} MB`;
}


function isImage(file) {
  return String(
    file?.mime_type || ""
  ).startsWith("image/");
}


function isPdf(file) {
  return (
    file?.mime_type ===
    "application/pdf"
  );
}


function normaliseStage(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
}


function getLogicalEvidenceType(
  file
) {
  const storedType =
    String(
      file?.evidence_type || ""
    )
      .trim()
      .toLowerCase();

  const storagePath =
    String(
      file?.storage_path || ""
    )
      .trim()
      .toLowerCase();

  const directionalTypes = [
    "vehicle-front",
    "vehicle-rear",
    "vehicle-driver-side",
    "vehicle-passenger-side",
  ];

  for (const type of directionalTypes) {
    if (
      storagePath.includes(
        `/${type}/`
      ) ||
      storagePath.includes(
        `/${type}--`
      ) ||
      storagePath.includes(
        `/${type}-`
      )
    ) {
      return type;
    }
  }

  return storedType;
}


function getStageGroup(file) {
  const stage =
    normaliseStage(
      file?.evidence_stage
    );

  if (
    [
      "pre-use",
      "pre-trip",
      "pretrip",
      "pre-inspection",
      "preinspection",
    ].includes(stage)
  ) {
    return "pre";
  }

  if (
    [
      "post-use",
      "post-trip",
      "posttrip",
      "return",
      "vehicle-return",
      "post-inspection",
      "postinspection",
    ].includes(stage)
  ) {
    return "post";
  }

  if (
    [
      "incident",
      "incident-report",
      "incident-evidence",
      "accident",
      "damage",
      "breakdown",
    ].includes(stage)
  ) {
    return "incident";
  }

  return "other";
}


function getEvidenceInstruction(file) {
  const type =
    getLogicalEvidenceType(
      file
    );

  const stageGroup =
    getStageGroup(file);

  if (
    REQUIRED_SLOTS[type]
  ) {
    return REQUIRED_SLOTS[type];
  }

  if (type === "odometer") {
    return {
      ...REQUIRED_SLOTS.odometer,
      shortLabel:
        stageGroup === "post"
          ? "Required return odometer photo"
          : "Required starting odometer photo",
      title:
        stageGroup === "post"
          ? "Return Odometer"
          : "Starting Odometer",
    };
  }

  if (type === "pre-existing-damage") {
    return {
      shortLabel:
        "Damage evidence photo",
      title:
        "Pre-Existing Damage",
      summary:
        "Capture the reported damage clearly so the exact condition can be verified.",
      checkpoints: [
        "Damage area clearly visible",
        "Enough distance to show location on vehicle",
        "Close enough to show severity",
      ],
    };
  }

  if (stageGroup === "incident") {
    return {
      shortLabel:
        "Incident evidence",
      title:
        "Incident Evidence",
      summary:
        "Capture clear supporting evidence of the incident, accident or breakdown.",
      checkpoints: [
        "Incident area clearly visible",
        "Photo supports the incident report",
      ],
    };
  }

  return null;
}


function buildStageAuditData(
  files
) {
  const photoMap = {};
  let odometerFile = null;
  const extras = [];

  for (const file of files || []) {
    const type =
      getLogicalEvidenceType(
        file
      );

    if (
      REQUIRED_PHOTO_TYPES.includes(
        type
      )
    ) {
      if (!photoMap[type]) {
        photoMap[type] = file;
      } else {
        extras.push(file);
      }

      continue;
    }

    if (type === "odometer") {
      if (!odometerFile) {
        odometerFile = file;
      } else {
        extras.push(file);
      }

      continue;
    }

    extras.push(file);
  }

  return {
    photoMap,
    odometerFile,
    extras,
  };
}


function EvidenceCard({
  file,
  onView,
}) {
  const instruction =
    getEvidenceInstruction(
      file
    );

  return (
    <article className="vehicle-evidence-card">
      <button
        type="button"
        className="vehicle-evidence-preview"
        onClick={() =>
          onView(file)
        }
        disabled={
          !file.signed_url
        }
        aria-label={`View ${
          file.original_file_name ||
          "evidence"
        }`}
      >
        {isImage(file) &&
        file.signed_url ? (
          <img
            src={
              file.signed_url
            }
            alt={
              file.original_file_name ||
              "Vehicle evidence"
            }
            loading="lazy"
          />
        ) : (
          <div className="vehicle-evidence-file-placeholder">
            {isPdf(file)
              ? (
                <FaFileAlt />
              )
              : (
                <FaFileImage />
              )}

            <strong>
              {isPdf(file)
                ? "PDF"
                : "FILE"}
            </strong>
          </div>
        )}

        {file.signed_url && (
          <span className="vehicle-evidence-hover">
            <FaEye />
            View
          </span>
        )}
      </button>

      <div className="vehicle-evidence-card-body">
        <div className="vehicle-evidence-badges">
          <span>
            {formatLabel(
              file.evidence_stage
            )}
          </span>

          <span>
            {formatLabel(
              getLogicalEvidenceType(
                file
              )
            )}
          </span>
        </div>

        <strong
          className="vehicle-evidence-name"
          title={
            file.original_file_name ||
            ""
          }
        >
          {file.original_file_name ||
            "Evidence file"}
        </strong>

        <div className="vehicle-evidence-meta">
          <span>
            {formatDate(
              file.created_at
            )}
          </span>

          {file.file_size ? (
            <span>
              {formatFileSize(
                file.file_size
              )}
            </span>
          ) : null}
        </div>

        {instruction && (
          <div className="vehicle-evidence-instruction-card">
            <strong>
              {
                instruction.shortLabel
              }
            </strong>

            <p>
              {instruction.summary}
            </p>
          </div>
        )}

        <button
          type="button"
          className="vehicle-evidence-view-button"
          onClick={() =>
            onView(file)
          }
          disabled={
            !file.signed_url
          }
        >
          <FaEye />
          {file.signed_url
            ? "View Evidence"
            : "Preview Unavailable"}
        </button>
      </div>
    </article>
  );
}


function RequiredEvidenceSlot({
  label,
  file,
  slotKey,
  onView,
}) {
  const instruction =
    getEvidenceInstruction({
      evidence_type: slotKey,
      evidence_stage:
        file?.evidence_stage,
    });

  if (!instruction) {
    return null;
  }

  return (
    <article
      className={`required-evidence-slot ${
        file
          ? "filled"
          : "missing"
      }`}
    >
      <div className="required-evidence-slot-top">
        <div>
          <span>
            {label}
          </span>

          <h6>
            {instruction.title}
          </h6>
        </div>

        <strong>
          {file ? "Uploaded" : "Missing"}
        </strong>
      </div>

      <p className="required-evidence-summary">
        {
          instruction.summary
        }
      </p>

      <ul className="required-evidence-checkpoints">
        {instruction.checkpoints.map(
          (item) => (
            <li key={item}>
              {item}
            </li>
          )
        )}
      </ul>

      {file ? (
        <div className="required-evidence-uploaded">
          <EvidenceCard
            file={file}
            onView={onView}
          />
        </div>
      ) : (
        <div className="required-evidence-placeholder">
          <FaCamera />
          <span>
            Required photo was not uploaded.
          </span>
        </div>
      )}
    </article>
  );
}


function OdometerEvidenceSlot({
  title,
  file,
  onView,
}) {
  const instruction =
    getEvidenceInstruction({
      evidence_type: "odometer",
      evidence_stage:
        file?.evidence_stage ||
        (title
          .toLowerCase()
          .includes("post")
          ? "post-use"
          : "pre-use"),
    });

  return (
    <article
      className={`odometer-evidence-slot ${
        file ? "filled" : "missing"
      }`}
    >
      <div className="required-evidence-slot-top">
        <div>
          <span>
            REQUIRED ODOMETER
          </span>

          <h6>
            {title}
          </h6>
        </div>

        <strong>
          {file ? "Uploaded" : "Missing"}
        </strong>
      </div>

      <p className="required-evidence-summary">
        {instruction.summary}
      </p>

      <ul className="required-evidence-checkpoints">
        {instruction.checkpoints.map(
          (item) => (
            <li key={item}>
              {item}
            </li>
          )
        )}
      </ul>

      {file ? (
        <div className="required-evidence-uploaded">
          <EvidenceCard
            file={file}
            onView={onView}
          />
        </div>
      ) : (
        <div className="required-evidence-placeholder">
          <FaTachometerAlt />
          <span>
            Required odometer photo was not uploaded.
          </span>
        </div>
      )}
    </article>
  );
}


function AdditionalEvidenceSection({
  title,
  subtitle,
  files,
  onView,
  variant = "other",
}) {
  if (!files.length) {
    return null;
  }

  return (
    <section
      className={`vehicle-evidence-section vehicle-evidence-section-${variant}`}
    >
      <div className="vehicle-evidence-section-heading">
        <div className="vehicle-evidence-section-icon">
          {variant === "incident" ? (
            <FaExclamationTriangle />
          ) : (
            <FaFileAlt />
          )}
        </div>

        <div>
          <div className="vehicle-evidence-section-title-row">
            <h5>
              {title}
            </h5>

            <span>
              {files.length}{" "}
              {files.length === 1
                ? "file"
                : "files"}
            </span>
          </div>

          <p>
            {subtitle}
          </p>
        </div>
      </div>

      <div className="vehicle-evidence-grid">
        {files.map((file) => (
          <EvidenceCard
            key={file.id}
            file={file}
            onView={onView}
          />
        ))}
      </div>
    </section>
  );
}


function RequiredStageSection({
  variant,
  title,
  subtitle,
  files,
  onView,
}) {
  if (!files.length) {
    return null;
  }

  const {
    photoMap,
    odometerFile,
    extras,
  } = buildStageAuditData(
    files
  );

  const photoCount =
    REQUIRED_PHOTO_TYPES.filter(
      (type) => photoMap[type]
    ).length;

  const totalRequiredDone =
    photoCount +
    (odometerFile ? 1 : 0);

  return (
    <section
      className={`required-stage-section required-stage-section-${variant}`}
    >
      <div className="required-stage-heading">
        <div className="required-stage-heading-icon">
          {variant === "pre" ? (
            <FaCamera />
          ) : (
            <FaCheckCircle />
          )}
        </div>

        <div className="required-stage-heading-text">
          <div className="required-stage-title-row">
            <h5>{title}</h5>

            <span>
              {totalRequiredDone}/5 required uploaded
            </span>
          </div>

          <p>{subtitle}</p>
        </div>
      </div>

      <div className="required-stage-summary-bar">
        <div>
          <strong>
            {photoCount}/4
          </strong>
          <span>
            Exterior Photos
          </span>
        </div>

        <div>
          <strong>
            {odometerFile ? 1 : 0}/1
          </strong>
          <span>
            Odometer
          </span>
        </div>
      </div>

      <div className="required-stage-subsection">
        <div className="required-stage-subheading">
          <div>
            <span>
              REQUIRED EXTERIOR PHOTOS
            </span>
            <h6>
              4 Required Vehicle Photos
            </h6>
          </div>
        </div>

        <div className="required-photo-grid">
          <RequiredEvidenceSlot
            label="PHOTO 1 OF 4"
            slotKey="vehicle-front"
            file={photoMap["vehicle-front"]}
            onView={onView}
          />

          <RequiredEvidenceSlot
            label="PHOTO 2 OF 4"
            slotKey="vehicle-rear"
            file={photoMap["vehicle-rear"]}
            onView={onView}
          />

          <RequiredEvidenceSlot
            label="PHOTO 3 OF 4"
            slotKey="vehicle-driver-side"
            file={photoMap["vehicle-driver-side"]}
            onView={onView}
          />

          <RequiredEvidenceSlot
            label="PHOTO 4 OF 4"
            slotKey="vehicle-passenger-side"
            file={photoMap["vehicle-passenger-side"]}
            onView={onView}
          />
        </div>
      </div>

      <div className="required-stage-subsection">
        <div className="required-stage-subheading">
          <div>
            <span>
              REQUIRED ODOMETER
            </span>
            <h6>
              1 Odometer Photo
            </h6>
          </div>
        </div>

        <OdometerEvidenceSlot
          title={
            variant === "post"
              ? "Return Odometer"
              : "Starting Odometer"
          }
          file={odometerFile}
          onView={onView}
        />
      </div>

      <AdditionalEvidenceSection
        title={
          variant === "post"
            ? "Additional Post-Trip Evidence"
            : "Additional Pre-Trip Evidence"
        }
        subtitle="Any extra supporting files captured in this stage beyond the required 4 side photos and odometer photo."
        files={extras}
        onView={onView}
        variant={variant}
      />
    </section>
  );
}



function ComparisonMiniCard({
  title,
  phaseLabel,
  file,
  onView,
}) {
  return (
    <div
      className={`comparison-mini-card ${
        file ? "filled" : "missing"
      }`}
    >
      <div className="comparison-mini-top">
        <span>
          {phaseLabel}
        </span>

        <strong>
          {file ? "Uploaded" : "Missing"}
        </strong>
      </div>

      <h6>
        {title}
      </h6>

      {file ? (
        <>
          <button
            type="button"
            className="comparison-mini-preview"
            onClick={() =>
              onView(file)
            }
          >
            {isImage(file) &&
            file.signed_url ? (
              <img
                src={
                  file.signed_url
                }
                alt={
                  file.original_file_name ||
                  title
                }
              />
            ) : (
              <div className="comparison-mini-file">
                {isPdf(file) ? (
                  <FaFileAlt />
                ) : (
                  <FaFileImage />
                )}
              </div>
            )}

            <span>
              <FaEye />
              View
            </span>
          </button>

          <p className="comparison-mini-file-name">
            {file.original_file_name ||
              "Evidence file"}
          </p>
        </>
      ) : (
        <div className="comparison-mini-empty">
          <FaCamera />
          <span>
            No photo uploaded
          </span>
        </div>
      )}
    </div>
  );
}


function ComparisonPairCard({
  slotKey,
  title,
  preFile,
  postFile,
  onView,
}) {
  const instruction =
    REQUIRED_SLOTS[slotKey] ||
    REQUIRED_SLOTS.odometer;

  return (
    <article className="comparison-pair-card">
      <div className="comparison-pair-header">
        <div>
          <span>
            SIDE-BY-SIDE COMPARISON
          </span>

          <h6>
            {title}
          </h6>
        </div>
      </div>

      <p className="comparison-pair-summary">
        {instruction.summary}
      </p>

      <div className="comparison-pair-grid">
        <ComparisonMiniCard
          title={title}
          phaseLabel="Pre-Trip"
          file={preFile}
          onView={onView}
        />

        <ComparisonMiniCard
          title={title}
          phaseLabel="Post-Trip"
          file={postFile}
          onView={onView}
        />
      </div>
    </article>
  );
}


function RequiredEvidenceComparisonSection({
  preFiles,
  postFiles,
  onView,
}) {
  const preAudit =
    buildStageAuditData(
      preFiles
    );
  const postAudit =
    buildStageAuditData(
      postFiles
    );

  const hasAnyComparison =
    REQUIRED_PHOTO_TYPES.some(
      (type) =>
        preAudit.photoMap[type] ||
        postAudit.photoMap[type]
    ) ||
    preAudit.odometerFile ||
    postAudit.odometerFile;

  if (!hasAnyComparison) {
    return null;
  }

  return (
    <section className="required-comparison-section">
      <div className="required-comparison-heading">
        <div className="required-comparison-icon">
          <FaEye />
        </div>

        <div>
          <div className="required-comparison-title-row">
            <h5>
              Before vs After Comparison
            </h5>

            <span>
              Compare matching pre-trip and post-trip uploads
            </span>
          </div>

          <p>
            Review the same angle side-by-side to spot condition changes more quickly.
          </p>
        </div>
      </div>

      <div className="comparison-pair-list">
        <ComparisonPairCard
          slotKey="vehicle-front"
          title="Front of Vehicle"
          preFile={
            preAudit.photoMap[
              "vehicle-front"
            ]
          }
          postFile={
            postAudit.photoMap[
              "vehicle-front"
            ]
          }
          onView={onView}
        />

        <ComparisonPairCard
          slotKey="vehicle-rear"
          title="Rear of Vehicle"
          preFile={
            preAudit.photoMap[
              "vehicle-rear"
            ]
          }
          postFile={
            postAudit.photoMap[
              "vehicle-rear"
            ]
          }
          onView={onView}
        />

        <ComparisonPairCard
          slotKey="vehicle-driver-side"
          title="Driver Side of Vehicle"
          preFile={
            preAudit.photoMap[
              "vehicle-driver-side"
            ]
          }
          postFile={
            postAudit.photoMap[
              "vehicle-driver-side"
            ]
          }
          onView={onView}
        />

        <ComparisonPairCard
          slotKey="vehicle-passenger-side"
          title="Passenger Side of Vehicle"
          preFile={
            preAudit.photoMap[
              "vehicle-passenger-side"
            ]
          }
          postFile={
            postAudit.photoMap[
              "vehicle-passenger-side"
            ]
          }
          onView={onView}
        />

        <ComparisonPairCard
          slotKey="odometer"
          title="Odometer"
          preFile={
            preAudit.odometerFile
          }
          postFile={
            postAudit.odometerFile
          }
          onView={onView}
        />
      </div>
    </section>
  );
}


function VehicleEvidenceGallery({
  tripId,
}) {
  const [
    evidence,
    setEvidence,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    selectedEvidence,
    setSelectedEvidence,
  ] = useState(null);

  useEffect(() => {
    loadEvidence();
  }, [tripId]);

  useEffect(() => {
    if (!selectedEvidence) {
      return undefined;
    }

    function closeOnEscape(event) {
      if (
        event.key === "Escape"
      ) {
        setSelectedEvidence(
          null
        );
      }
    }

    document.addEventListener(
      "keydown",
      closeOnEscape
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        closeOnEscape
      );

      document.body.style.overflow =
        "";
    };
  }, [selectedEvidence]);

  async function createSignedEvidence(
    record
  ) {
    if (!record?.storage_path) {
      return {
        ...record,
        signed_url: null,
        preview_error:
          "Storage path is missing.",
      };
    }

    const {
      data,
      error,
    } = await supabase.storage
      .from("vehicle-evidence")
      .createSignedUrl(
        record.storage_path,
        60 * 60
      );

    if (error) {
      console.error(
        "Evidence signed URL error:",
        error
      );

      return {
        ...record,
        signed_url: null,
        preview_error:
          error.message ||
          "Unable to create preview link.",
      };
    }

    return {
      ...record,
      signed_url:
        data?.signedUrl || null,
      preview_error: null,
    };
  }

  async function loadEvidence() {
    if (!tripId) {
      setEvidence([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setEvidence([]);

      const {
        data: tripData,
        error: tripError,
      } = await supabase
        .from("vehicle_trips")
        .select(
          "id, request_id, vehicle_id, booking_reference"
        )
        .eq("id", tripId)
        .single();

      if (tripError) {
        throw tripError;
      }

      const {
        data: tripEvidence,
        error: tripEvidenceError,
      } = await supabase
        .from("vehicle_evidence")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", {
          ascending: true,
        });

      if (tripEvidenceError) {
        throw tripEvidenceError;
      }

      let requestEvidence = [];

      if (tripData?.request_id) {
        const {
          data,
          error,
        } = await supabase
          .from("vehicle_evidence")
          .select("*")
          .eq(
            "request_id",
            tripData.request_id
          )
          .order("created_at", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        requestEvidence =
          data || [];
      }

      const merged = [
        ...(requestEvidence || []),
        ...(tripEvidence || []),
      ];

      const uniqueMap =
        new Map();

      for (const record of merged) {
        if (!record?.id) {
          continue;
        }

        uniqueMap.set(
          record.id,
          record
        );
      }

      const uniqueEvidence =
        Array.from(
          uniqueMap.values()
        ).sort(
          (a, b) =>
            new Date(
              a.created_at || 0
            ) -
            new Date(
              b.created_at || 0
            )
        );

      const signedEvidence =
        await Promise.all(
          uniqueEvidence.map(
            (record) =>
              createSignedEvidence(
                record
              )
          )
        );

      setEvidence(
        signedEvidence
      );
    } catch (error) {
      console.error(
        "Vehicle evidence gallery error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to load vehicle evidence."
      );
    } finally {
      setLoading(false);
    }
  }

  const groupedEvidence =
    useMemo(() => {
      const groups = {
        pre: [],
        post: [],
        incident: [],
        other: [],
      };

      for (const file of evidence) {
        const group =
          getStageGroup(file);

        groups[group].push(file);
      }

      return groups;
    }, [evidence]);

  const groupedCount =
    useMemo(() => {
      return {
        pre:
          groupedEvidence.pre.length,
        post:
          groupedEvidence.post.length,
        incident:
          groupedEvidence.incident.length,
        other:
          groupedEvidence.other.length,
      };
    }, [groupedEvidence]);

  function openEvidence(record) {
    if (!record?.signed_url) {
      return;
    }

    setSelectedEvidence(record);
  }

  function openFullSize() {
    if (
      !selectedEvidence?.signed_url
    ) {
      return;
    }

    window.open(
      selectedEvidence.signed_url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (loading) {
    return (
      <div className="vehicle-evidence-state">
        <div className="vehicle-evidence-spinner" />
        <span>
          Loading evidence...
        </span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="vehicle-evidence-error">
        {errorMessage}
      </div>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="vehicle-evidence-empty">
        <FaFileImage />
        <div>
          <strong>
            No uploaded evidence
          </strong>
          <span>
            Pre-trip and post-trip photos linked to this journey will appear here separately.
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="vehicle-evidence-gallery">
        <div className="vehicle-evidence-summary">
          <div>
            <strong>
              {evidence.length}
            </strong>
            <span>
              Total Files
            </span>
          </div>

          <div className="vehicle-evidence-summary-pre">
            <strong>
              {groupedCount.pre}
            </strong>
            <span>
              Pre-Trip
            </span>
          </div>

          <div className="vehicle-evidence-summary-post">
            <strong>
              {groupedCount.post}
            </strong>
            <span>
              Post-Trip
            </span>
          </div>

          {groupedCount.incident > 0 && (
            <div className="vehicle-evidence-summary-incident">
              <strong>
                {groupedCount.incident}
              </strong>
              <span>
                Incident
              </span>
            </div>
          )}

          {groupedCount.other > 0 && (
            <div className="vehicle-evidence-summary-other">
              <strong>
                {groupedCount.other}
              </strong>
              <span>
                Other
              </span>
            </div>
          )}
        </div>

        <RequiredEvidenceComparisonSection
          preFiles={groupedEvidence.pre}
          postFiles={groupedEvidence.post}
          onView={openEvidence}
        />

        <AdditionalEvidenceSection
          title="Incident Evidence"
          subtitle="Photos and supporting records captured for accidents, damage, breakdowns or other incidents linked to this trip."
          files={groupedEvidence.incident}
          onView={openEvidence}
          variant="incident"
        />

        <AdditionalEvidenceSection
          title="Other Documents"
          subtitle="Supporting files that are not part of the pre-trip, post-trip or incident evidence sets."
          files={groupedEvidence.other}
          onView={openEvidence}
          variant="other"
        />
      </div>

      {selectedEvidence && (
        <div
          className="vehicle-evidence-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedEvidence(
                null
              );
            }
          }}
        >
          <section
            className="vehicle-evidence-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Evidence preview"
          >
            <header className="vehicle-evidence-modal-header">
              <div>
                <span>
                  {getStageGroup(
                    selectedEvidence
                  ) === "pre"
                    ? "PRE-TRIP EVIDENCE"
                    : getStageGroup(
                        selectedEvidence
                      ) === "post"
                    ? "POST-TRIP EVIDENCE"
                    : getStageGroup(
                        selectedEvidence
                      ) === "incident"
                    ? "INCIDENT EVIDENCE"
                    : "OTHER EVIDENCE"}
                  {" · "}
                  {formatLabel(
                    getLogicalEvidenceType(
                      selectedEvidence
                    )
                  )}
                </span>

                <h3>
                  {selectedEvidence
                    .original_file_name ||
                    "Evidence Preview"}
                </h3>

                <p>
                  {formatDate(
                    selectedEvidence
                      .created_at
                  )}
                </p>
              </div>

              <button
                type="button"
                className="vehicle-evidence-modal-close"
                onClick={() =>
                  setSelectedEvidence(
                    null
                  )
                }
                aria-label="Close evidence viewer"
              >
                <FaTimes />
              </button>
            </header>

            <div className="vehicle-evidence-modal-content">
              {isImage(
                selectedEvidence
              ) ? (
                <img
                  src={
                    selectedEvidence
                      .signed_url
                  }
                  alt={
                    selectedEvidence
                      .original_file_name ||
                    "Vehicle evidence"
                  }
                />
              ) : isPdf(
                  selectedEvidence
                ) ? (
                <iframe
                  src={
                    selectedEvidence
                      .signed_url
                  }
                  title={
                    selectedEvidence
                      .original_file_name ||
                    "Evidence PDF"
                  }
                />
              ) : (
                <div className="vehicle-evidence-unsupported">
                  <FaFileAlt />
                  <strong>
                    Preview not supported
                  </strong>
                  <span>
                    Open the original file in a new tab.
                  </span>
                </div>
              )}
            </div>

            {getEvidenceInstruction(
              selectedEvidence
            ) && (
              <div className="vehicle-evidence-modal-instruction">
                <strong>
                  {
                    getEvidenceInstruction(
                      selectedEvidence
                    ).title
                  }
                </strong>

                <p>
                  {
                    getEvidenceInstruction(
                      selectedEvidence
                    ).summary
                  }
                </p>

                <ul>
                  {getEvidenceInstruction(
                    selectedEvidence
                  ).checkpoints.map(
                    (item) => (
                      <li key={item}>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            <footer className="vehicle-evidence-modal-footer">
              <div>
                <span>
                  {getStageGroup(
                    selectedEvidence
                  ) === "pre"
                    ? "Captured before trip"
                    : getStageGroup(
                        selectedEvidence
                      ) === "post"
                    ? "Captured after trip"
                    : getStageGroup(
                        selectedEvidence
                      ) === "incident"
                    ? "Captured for incident"
                    : formatLabel(
                        selectedEvidence
                          .evidence_stage
                      )}
                </span>

                {selectedEvidence
                  .file_size ? (
                  <span>
                    {formatFileSize(
                      selectedEvidence
                        .file_size
                    )}
                  </span>
                ) : null}

                <span>
                  Secure temporary preview
                </span>
              </div>

              <div className="vehicle-evidence-modal-actions">
                <button
                  type="button"
                  className="vehicle-evidence-modal-secondary"
                  onClick={() =>
                    setSelectedEvidence(
                      null
                    )
                  }
                >
                  Close
                </button>

                <button
                  type="button"
                  className="vehicle-evidence-modal-primary"
                  onClick={
                    openFullSize
                  }
                >
                  <FaExternalLinkAlt />
                  Open Full Size
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}


export default VehicleEvidenceGallery;
