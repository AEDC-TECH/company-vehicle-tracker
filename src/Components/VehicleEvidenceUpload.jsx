import { useRef, useState } from "react";

import {
  FaCamera,
  FaCheckCircle,
  FaFileImage,
  FaShieldAlt,
  FaTimes,
  FaUpload,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import { createVehicleEvidenceRecord } from "../lib/vehicleEvidenceLookup";

import {
  formatAssignedVehicleName,
} from "../lib/vehicleLookup";

import "../Styles/VehicleEvidenceUpload.css";

function VehicleEvidenceUpload({
  vehicleId,
  tripId = null,
  requestId = null,
  incidentId = null,
  stage,
  type,
  title = "Upload Evidence",
  description = "",
  required = false,
  multiple = true,
  imagesOnly = false,
  expectedVehicle = null,
  preferCamera = false,
  employeeNumberOverride = null,
  onUploaded,
}) {
  const fileInputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function chooseFiles() {
    fileInputRef.current?.click();
  }

  function getStoredEmployeeNumber() {
    const override =
      String(
        employeeNumberOverride || ""
      )
        .trim()
        .toUpperCase();

    if (override) {
      return override;
    }

    return String(
      localStorage.getItem(
        "aedc_employee_number"
      ) || ""
    )
      .trim()
      .toUpperCase() || null;
  }

  function sanitiseFileName(name) {
    return name
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();
  }

  function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);

    const imageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const allowedTypes =
      imagesOnly
        ? imageTypes
        : [
            ...imageTypes,
            "application/pdf",
          ];

    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(
          imagesOnly
            ? `${file.name}: this upload requires a JPG, PNG or WEBP image.`
            : `${file.name}: unsupported file type.`
        );
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        errors.push(
          `${file.name}: file exceeds 10 MB.`
        );
        continue;
      }

      validFiles.push(file);
    }

    setErrorMessage(
      errors.length > 0
        ? errors.join(" ")
        : ""
    );

    setSelectedFiles((current) =>
      multiple
        ? [...current, ...validFiles]
        : validFiles.slice(0, 1)
    );

    event.target.value = "";
  }

  function removeSelectedFile(index) {
    setSelectedFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );
  }

  async function uploadFiles() {
    if (selectedFiles.length === 0) {
      if (required) {
        setErrorMessage(
          "Please select at least one file."
        );
      }

      return [];
    }

    try {
      setUploading(true);
      setErrorMessage("");

      const recordFolder =
        tripId
          ? `trips/${tripId}`
          : incidentId
          ? `incidents/${incidentId}`
          : requestId
          ? `requests/${requestId}`
          : `general/${vehicleId}`;

      const completedUploads = [];

      for (const file of selectedFiles) {
        const safeName = sanitiseFileName(
          file.name
        );

        const directionalTypes = [
          "vehicle-front",
          "vehicle-rear",
          "vehicle-driver-side",
          "vehicle-passenger-side",
        ];

        const isDirectionalPhoto =
          directionalTypes.includes(
            type
          );

        const databaseEvidenceType =
          isDirectionalPhoto
            ? "vehicle-condition"
            : type;

        const logicalPrefix =
          isDirectionalPhoto
            ? `${type}--`
            : "";

        const uniqueName =
          `${logicalPrefix}${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const storagePath =
          `${recordFolder}/${stage}/${databaseEvidenceType}/${uniqueName}`;

        const {
          error: storageError,
        } = await supabase.storage
          .from("vehicle-evidence")
          .upload(
            storagePath,
            file,
            {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            }
          );

        if (storageError) {
          throw storageError;
        }

        let evidenceRecord;

        try {
          evidenceRecord =
            await createVehicleEvidenceRecord({
              employeeNumber:
                getStoredEmployeeNumber(),

              vehicleId,
              tripId,
              requestId,
              incidentId,
              stage,
              type:
                databaseEvidenceType,
              storagePath,

              originalFileName:
                file.name,

              mimeType:
                file.type,

              fileSize:
                file.size,
            });
        } catch (databaseError) {
          await supabase.storage
            .from("vehicle-evidence")
            .remove([storagePath]);

          throw databaseError;
        }

        completedUploads.push(
          evidenceRecord
        );
      }

      setUploadedFiles((current) => [
        ...current,
        ...completedUploads,
      ]);

      setSelectedFiles([]);

      if (onUploaded) {
        onUploaded(completedUploads);
      }

      return completedUploads;
    } catch (error) {
      console.error(
        "Evidence upload error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to upload evidence."
      );

      return [];
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="evidence-upload">
      <div className="evidence-upload-heading">
        <div className="evidence-icon">
          <FaCamera />
        </div>

        <div>
          <div className="evidence-title-row">
            <h4>{title}</h4>

            {required && (
              <span className="evidence-required">
                REQUIRED
              </span>
            )}
          </div>

          {description && (
            <p>{description}</p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        className="hidden-file-input"
        type="file"
        accept={
          imagesOnly
            ? "image/jpeg,image/png,image/webp"
            : "image/jpeg,image/png,image/webp,application/pdf"
        }
        multiple={multiple}
        capture={
          preferCamera &&
          imagesOnly
            ? "environment"
            : undefined
        }
        onChange={handleFileSelection}
      />

      <button
        type="button"
        className="evidence-drop-zone"
        onClick={chooseFiles}
      >
        <FaUpload />

        <strong>
          Select photo
          {multiple ? "s" : ""}
        </strong>

        <span>
          {imagesOnly
            ? "JPG, PNG or WEBP image · Maximum 10 MB each"
            : "JPG, PNG, WEBP or PDF · Maximum 10 MB each"}
        </span>

        <small>
          {preferCamera
            ? "On mobile, use the rear camera and photograph the assigned vehicle now."
            : "Mobile users can choose photos from their device."}
        </small>
      </button>

      {selectedFiles.length > 0 && (
        <div className="selected-evidence-list">
          <span className="evidence-list-label">
            READY TO UPLOAD
          </span>

          {selectedFiles.map(
            (file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="selected-evidence-file"
              >
                <FaFileImage />

                <div>
                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeSelectedFile(index)
                  }
                  aria-label="Remove file"
                >
                  <FaTimes />
                </button>
              </div>
            )
          )}

          <button
            type="button"
            className="upload-evidence-button"
            disabled={uploading}
            onClick={uploadFiles}
          >
            <FaUpload />

            {uploading
              ? "Uploading..."
              : `Upload ${
                  selectedFiles.length
                } File${
                  selectedFiles.length > 1
                    ? "s"
                    : ""
                }`}
          </button>
        </div>
      )}

      {expectedVehicle && (
        <div className="evidence-assigned-vehicle">
          <FaShieldAlt />

          <div>
            <span>
              ASSIGNED VEHICLE
            </span>

            <strong>
              {formatAssignedVehicleName(
                expectedVehicle
              ) ||
                "Company Vehicle"}
            </strong>

            {expectedVehicle
              .registration && (
              <small>
                Registration:{" "}
                {
                  expectedVehicle
                    .registration
                }
              </small>
            )}
          </div>
        </div>
      )}


      {uploadedFiles.length > 0 && (
        <div className="uploaded-evidence-list">
          {uploadedFiles.map(
            (file) => (
              <div
                key={file.id}
                className="uploaded-evidence-file"
              >
                <FaCheckCircle />

                <div>
                  <strong>
                    Evidence uploaded
                  </strong>

                  <span>
                    {file.original_file_name}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {errorMessage && (
        <div className="evidence-error">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default VehicleEvidenceUpload;
