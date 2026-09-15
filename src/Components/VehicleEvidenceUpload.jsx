import { useRef, useState } from "react";

import {
  FaCamera,
  FaCheckCircle,
  FaFileImage,
  FaTimes,
  FaUpload,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import { createVehicleEvidenceRecord } from "../lib/vehicleEvidenceLookup";

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

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(
          `${file.name}: unsupported file type.`
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

        const uniqueName =
          `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const storagePath =
          `${recordFolder}/${stage}/${type}/${uniqueName}`;

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
              type,
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
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple={multiple}
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
          JPG, PNG, WEBP or PDF · Maximum 10 MB each
        </span>

        <small>
          Mobile users can choose photos from their device.
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
