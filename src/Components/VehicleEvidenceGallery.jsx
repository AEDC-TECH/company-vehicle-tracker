import {
  useEffect,
  useState,
} from "react";

import {
  FaCamera,
  FaExternalLinkAlt,
  FaFilePdf,
  FaImage,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import "../Styles/VehicleEvidenceUpload.css";


function VehicleEvidenceGallery({
  tripId,
}) {
  const [evidence, setEvidence] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");


  useEffect(() => {
    if (tripId) {
      loadEvidence();
    } else {
      setEvidence([]);
      setLoading(false);
    }
  }, [tripId]);


  async function loadEvidence() {
    try {
      setLoading(true);
      setErrorMessage("");
      setEvidence([]);


      /*
       * ============================================
       * 1. LOAD THE TRIP
       * ============================================
       *
       * We need the request_id because pre-use
       * photographs may have been uploaded before
       * the trip record existed.
       */

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


      /*
       * ============================================
       * 2. LOAD EVIDENCE ATTACHED TO TRIP
       * ============================================
       */

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


      /*
       * ============================================
       * 3. LOAD EVIDENCE ATTACHED TO REQUEST
       * ============================================
       *
       * This is important for PRE-USE evidence.
       */

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


      /*
       * ============================================
       * 4. MERGE + REMOVE DUPLICATES
       * ============================================
       *
       * Some evidence may contain BOTH:
       *
       * request_id
       * trip_id
       *
       * We therefore deduplicate by evidence.id.
       */

      const combinedEvidence = [
        ...(tripEvidence || []),
        ...requestEvidence,
      ];


      const uniqueEvidence =
        Array.from(
          new Map(
            combinedEvidence.map(
              (record) => [
                record.id,
                record,
              ]
            )
          ).values()
        );


      /*
       * ============================================
       * 5. SORT EVIDENCE
       * ============================================
       *
       * PRE-USE first
       * POST-USE second
       * then chronological.
       */

      uniqueEvidence.sort(
        (a, b) => {
          const stageOrder = {
            "pre-use": 1,
            "post-use": 2,
            incident: 3,
            other: 4,
          };


          const aStage =
            stageOrder[
              a.evidence_stage
            ] || 99;

          const bStage =
            stageOrder[
              b.evidence_stage
            ] || 99;


          if (aStage !== bStage) {
            return aStage - bStage;
          }


          return (
            new Date(
              a.created_at || 0
            ) -
            new Date(
              b.created_at || 0
            )
          );
        }
      );


      /*
       * ============================================
       * 6. CREATE SIGNED STORAGE URLS
       * ============================================
       *
       * vehicle-evidence is private.
       *
       * Signed URLs let the browser display the
       * evidence without making the bucket public.
       */

      const evidenceWithUrls =
        await Promise.all(
          uniqueEvidence.map(
            async (record) => {
              if (
                !record.storage_path
              ) {
                return {
                  ...record,
                  signedUrl: null,
                };
              }


              const {
                data: signedData,
                error: signedError,
              } =
                await supabase.storage
                  .from(
                    "vehicle-evidence"
                  )
                  .createSignedUrl(
                    record.storage_path,
                    3600
                  );


              if (signedError) {
                console.error(
                  `Signed URL error for ${record.storage_path}:`,
                  signedError
                );


                return {
                  ...record,
                  signedUrl: null,
                  signedUrlError:
                    signedError.message,
                };
              }


              return {
                ...record,

                signedUrl:
                  signedData?.signedUrl ||
                  null,

                signedUrlError: null,
              };
            }
          )
        );


      setEvidence(
        evidenceWithUrls
      );

    } catch (error) {
      console.error(
        "Evidence gallery error:",
        error
      );


      setErrorMessage(
        error?.message ||
          "Unable to load vehicle evidence."
      );

      setEvidence([]);

    } finally {
      setLoading(false);
    }
  }


  /*
   * ============================================
   * LABEL FORMATTER
   * ============================================
   */

  function formatLabel(value) {
    if (!value) {
      return "";
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


  /*
   * ============================================
   * DATE FORMATTER
   * ============================================
   */

  function formatDate(value) {
    if (!value) {
      return "";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }


    return date.toLocaleString(
      "en-ZA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }


  /*
   * ============================================
   * FILE TYPE HELPERS
   * ============================================
   */

  function isPdfFile(item) {
    return (
      item.mime_type ===
        "application/pdf" ||
      item.original_file_name
        ?.toLowerCase()
        .endsWith(".pdf")
    );
  }


  function isImageFile(item) {
    return (
      item.mime_type?.startsWith(
        "image/"
      ) ||
      /\.(jpg|jpeg|png|webp)$/i.test(
        item.original_file_name || ""
      )
    );
  }


  /*
   * ============================================
   * GROUP EVIDENCE
   * ============================================
   */

  const preUseEvidence =
    evidence.filter(
      (item) =>
        item.evidence_stage ===
        "pre-use"
    );


  const postUseEvidence =
    evidence.filter(
      (item) =>
        item.evidence_stage ===
        "post-use"
    );


  const otherEvidence =
    evidence.filter(
      (item) =>
        item.evidence_stage !==
          "pre-use" &&
        item.evidence_stage !==
          "post-use"
    );


  /*
   * ============================================
   * LOADING
   * ============================================
   */

  if (loading) {
    return (
      <div className="evidence-gallery-message">
        <FaCamera />

        <span>
          Loading photographic
          evidence...
        </span>
      </div>
    );
  }


  /*
   * ============================================
   * ERROR
   * ============================================
   */

  if (errorMessage) {
    return (
      <div className="evidence-gallery-error">
        {errorMessage}
      </div>
    );
  }


  /*
   * ============================================
   * EMPTY
   * ============================================
   */

  if (evidence.length === 0) {
    return (
      <div className="evidence-gallery-message">
        <FaImage />

        <span>
          No photographic evidence
          has been recorded for this
          trip.
        </span>
      </div>
    );
  }


  /*
   * ============================================
   * EVIDENCE SECTION
   * ============================================
   */

  function EvidenceSection({
    title,
    subtitle,
    items,
  }) {
    if (!items.length) {
      return null;
    }


    return (
      <section className="evidence-history-section">
        <div className="evidence-history-heading">
          <div>
            <span>
              {subtitle}
            </span>

            <h5>
              {title}
            </h5>
          </div>

          <strong>
            {items.length}{" "}
            {items.length === 1
              ? "file"
              : "files"}
          </strong>
        </div>


        <div className="evidence-gallery">
          {items.map(
            (item) => (
              <EvidenceCard
                key={item.id}
                item={item}
              />
            )
          )}
        </div>
      </section>
    );
  }


  /*
   * ============================================
   * INDIVIDUAL EVIDENCE CARD
   * ============================================
   */

  function EvidenceCard({
    item,
  }) {
    const isPdf =
      isPdfFile(item);

    const isImage =
      isImageFile(item);


    return (
      <article className="evidence-gallery-card">
        <div className="evidence-preview">
          {isPdf ? (
            <div className="evidence-file-placeholder">
              <FaFilePdf />

              <span>
                PDF
              </span>
            </div>
          ) : isImage &&
            item.signedUrl ? (
            <img
              src={
                item.signedUrl
              }
              alt={
                item.original_file_name ||
                "AEDC vehicle evidence"
              }
              loading="lazy"
            />
          ) : (
            <div className="evidence-file-placeholder">
              <FaImage />

              <span>
                Image
              </span>
            </div>
          )}
        </div>


        <div className="evidence-gallery-info">
          <span>
            {formatLabel(
              item.evidence_stage
            )}
          </span>

          <strong>
            {formatLabel(
              item.evidence_type
            )}
          </strong>


          <small>
            {item.original_file_name ||
              "Evidence file"}
          </small>


          {item.created_at && (
            <small>
              Uploaded{" "}
              {formatDate(
                item.created_at
              )}
            </small>
          )}


          {item.signedUrlError && (
            <small className="evidence-url-error">
              File saved, but preview
              could not be generated.
            </small>
          )}


          {item.signedUrl && (
            <a
              href={
                item.signedUrl
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaExternalLinkAlt />

              Open Evidence
            </a>
          )}
        </div>
      </article>
    );
  }


  /*
   * ============================================
   * MAIN GALLERY
   * ============================================
   */

  return (
    <div className="vehicle-evidence-history">
      <EvidenceSection
        subtitle="BEFORE DEPARTURE"
        title="Pre-Use Evidence"
        items={preUseEvidence}
      />


      <EvidenceSection
        subtitle="AFTER RETURN"
        title="Post-Use Evidence"
        items={postUseEvidence}
      />


      <EvidenceSection
        subtitle="SUPPORTING RECORDS"
        title="Other Evidence"
        items={otherEvidence}
      />
    </div>
  );
}


export default VehicleEvidenceGallery;