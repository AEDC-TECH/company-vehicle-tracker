import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const ALLOWED_LOGICAL_TYPES = [
  "vehicle-front",
  "vehicle-rear",
  "vehicle-driver-side",
  "vehicle-passenger-side",
  "odometer",
];

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    },
  );
}

function normaliseEmployeeNumber(
  value: unknown,
) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normaliseRegistration(
  value: unknown,
) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function numberOrNull(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : null;
}

function integerOrNull(
  value: unknown,
) {
  const numeric =
    numberOrNull(value);

  if (numeric === null) {
    return null;
  }

  return Math.round(numeric);
}

function clamp01(
  value: unknown,
) {
  const numeric =
    numberOrNull(value);

  if (numeric === null) {
    return null;
  }

  return Math.max(
    0,
    Math.min(1, numeric),
  );
}

function dataUrlFromBlob(
  blob: Blob,
  mimeType: string,
) {
  return blob
    .arrayBuffer()
    .then((buffer) => {
      const bytes =
        new Uint8Array(buffer);

      let binary = "";

      const chunkSize = 0x8000;

      for (
        let offset = 0;
        offset < bytes.length;
        offset += chunkSize
      ) {
        const chunk =
          bytes.subarray(
            offset,
            Math.min(
              offset + chunkSize,
              bytes.length,
            ),
          );

        binary +=
          String.fromCharCode(
            ...chunk,
          );
      }

      return `data:${mimeType};base64,${btoa(
        binary,
      )}`;
    });
}

function extractOpenAIText(
  payload: any,
) {
  if (
    typeof payload?.output_text ===
    "string"
  ) {
    return payload.output_text;
  }

  const output =
    Array.isArray(payload?.output)
      ? payload.output
      : [];

  const pieces: string[] = [];

  for (const item of output) {
    const content =
      Array.isArray(item?.content)
        ? item.content
        : [];

    for (const part of content) {
      if (
        part?.type ===
          "output_text" &&
        typeof part?.text ===
          "string"
      ) {
        pieces.push(part.text);
      }
    }
  }

  return pieces.join("\n");
}

function parseJsonOnly(
  value: string,
) {
  const cleaned =
    String(value || "")
      .trim()
      .replace(
        /^```(?:json)?\s*/i,
        "",
      )
      .replace(
        /\s*```$/,
        "",
      )
      .trim();

  return JSON.parse(cleaned);
}

function viewDescription(
  logicalType: string,
) {
  switch (logicalType) {
    case "vehicle-front":
      return [
        "front view",
        "the complete front of the vehicle",
        "both headlights",
        "front bumper",
        "windscreen",
        "front registration plate",
      ].join(", ");

    case "vehicle-rear":
      return [
        "rear view",
        "the complete rear of the vehicle",
        "tail lights",
        "rear bumper",
        "rear window",
        "rear registration plate",
      ].join(", ");

    case "vehicle-driver-side":
      return [
        "driver-side profile",
        "the complete driver's side",
        "front wheel",
        "rear wheel",
        "doors",
        "side mirror",
        "body panels",
      ].join(", ");

    case "vehicle-passenger-side":
      return [
        "passenger-side profile",
        "the complete passenger side",
        "front wheel",
        "rear wheel",
        "doors",
        "side mirror",
        "body panels",
      ].join(", ");

    case "odometer":
      return [
        "vehicle dashboard",
        "the odometer digits",
        "a clear readable mileage reading",
      ].join(", ");

    default:
      return logicalType;
  }
}

async function writeAudit(
  supabaseAdmin: any,
  values: Record<string, unknown>,
) {
  const {
    error,
  } = await supabaseAdmin
    .from(
      "vehicle_evidence_verifications",
    )
    .insert(values);

  if (error) {
    console.error(
      "Verification audit insert error:",
      error,
    );
  }
}

Deno.serve(
  async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(
        "ok",
        {
          headers: corsHeaders,
        },
      );
    }

    if (req.method !== "POST") {
      return jsonResponse(
        {
          error:
            "Method not allowed.",
        },
        405,
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    let serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const secretKeysJson =
      Deno.env.get(
        "SUPABASE_SECRET_KEYS",
      );

    if (
      secretKeysJson
    ) {
      try {
        const secretKeys =
          JSON.parse(
            secretKeysJson,
          );

        serviceRoleKey =
          secretKeys?.default ||
          serviceRoleKey;
      } catch {
        // Legacy service-role fallback remains below.
      }
    }

    const openAIKey =
      Deno.env.get(
        "OPENAI_API_KEY",
      );

    const model =
      Deno.env.get(
        "OPENAI_VISION_MODEL",
      ) ||
      "gpt-5.6-luna";

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          error:
            "Supabase server credentials are missing.",
        },
        500,
      );
    }

    if (!openAIKey) {
      return jsonResponse(
        {
          error:
            "OPENAI_API_KEY is not configured for this Edge Function.",
        },
        500,
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    let body: any;

    try {
      body =
        await req.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid JSON request.",
        },
        400,
      );
    }

    const vehicleId =
      String(
        body?.vehicleId || "",
      ).trim();

    const tripId =
      body?.tripId
        ? String(
            body.tripId,
          ).trim()
        : null;

    const requestId =
      body?.requestId
        ? String(
            body.requestId,
          ).trim()
        : null;

    const employeeNumber =
      normaliseEmployeeNumber(
        body?.employeeNumber,
      );

    const stage =
      String(
        body?.stage || "",
      )
        .trim()
        .toLowerCase();

    const logicalType =
      String(
        body?.logicalType || "",
      )
        .trim()
        .toLowerCase();

    const storagePath =
      String(
        body?.storagePath || "",
      ).trim();

    const expectedOdometer =
      integerOrNull(
        body?.expectedOdometer,
      );

    if (
      !vehicleId ||
      !employeeNumber ||
      !storagePath
    ) {
      return jsonResponse(
        {
          error:
            "Vehicle, employee and storage path are required.",
        },
        400,
      );
    }

    if (
      ![
        "pre-use",
        "post-use",
      ].includes(stage)
    ) {
      return jsonResponse(
        {
          error:
            "Invalid evidence stage.",
        },
        400,
      );
    }

    if (
      !ALLOWED_LOGICAL_TYPES.includes(
        logicalType,
      )
    ) {
      return jsonResponse(
        {
          error:
            "This evidence type is not configured for AI verification.",
        },
        400,
      );
    }

    /*
     * Validate ownership against the
     * existing booking/trip workflow.
     */
    if (tripId) {
      const {
        data: trip,
        error: tripError,
      } = await supabaseAdmin
        .from("vehicle_trips")
        .select(
          "id, employee_number, vehicle_id",
        )
        .eq("id", tripId)
        .maybeSingle();

      if (
        tripError ||
        !trip
      ) {
        return jsonResponse(
          {
            error:
              "Trip could not be verified.",
          },
          403,
        );
      }

      if (
        normaliseEmployeeNumber(
          trip.employee_number,
        ) !==
          employeeNumber ||
        String(
          trip.vehicle_id,
        ) !==
          vehicleId
      ) {
        return jsonResponse(
          {
            error:
              "You are not authorised to verify evidence for this trip.",
          },
          403,
        );
      }
    } else if (requestId) {
      const {
        data: request,
        error: requestError,
      } = await supabaseAdmin
        .from(
          "vehicle_requests",
        )
        .select(
          "id, employee_number, vehicle_id",
        )
        .eq(
          "id",
          requestId,
        )
        .maybeSingle();

      if (
        requestError ||
        !request
      ) {
        return jsonResponse(
          {
            error:
              "Vehicle request could not be verified.",
          },
          403,
        );
      }

      if (
        normaliseEmployeeNumber(
          request.employee_number,
        ) !==
          employeeNumber ||
        String(
          request.vehicle_id,
        ) !==
          vehicleId
      ) {
        return jsonResponse(
          {
            error:
              "You are not authorised to verify evidence for this booking.",
          },
          403,
        );
      }
    } else {
      return jsonResponse(
        {
          error:
            "A trip or vehicle request is required.",
        },
        400,
      );
    }

    /*
     * Validate that the object path belongs
     * to the supplied request/trip and stage.
     */
    const expectedPrefix =
      tripId
        ? `trips/${tripId}/${stage}/`
        : `requests/${requestId}/${stage}/`;

    if (
      !storagePath.startsWith(
        expectedPrefix,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Evidence storage path does not belong to this booking or trip.",
        },
        400,
      );
    }

    const directionalTypes = [
      "vehicle-front",
      "vehicle-rear",
      "vehicle-driver-side",
      "vehicle-passenger-side",
    ];

    const expectedDatabaseFolder =
      directionalTypes.includes(
        logicalType,
      )
        ? "vehicle-condition"
        : logicalType;

    if (
      !storagePath.includes(
        `/${expectedDatabaseFolder}/`,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Evidence storage path does not match the evidence type.",
        },
        400,
      );
    }

    if (
      directionalTypes.includes(
        logicalType,
      ) &&
      !storagePath
        .toLowerCase()
        .includes(
          `${logicalType}--`,
        )
    ) {
      return jsonResponse(
        {
          error:
            "The required vehicle angle is missing from the evidence filename.",
        },
        400,
      );
    }

    const {
      data: vehicle,
      error: vehicleError,
    } = await supabaseAdmin
      .from("vehicles")
      .select(
        "id, make, model, registration",
      )
      .eq(
        "id",
        vehicleId,
      )
      .maybeSingle();

    if (
      vehicleError ||
      !vehicle
    ) {
      return jsonResponse(
        {
          error:
            "Assigned vehicle could not be found.",
        },
        404,
      );
    }

    const {
      data: imageBlob,
      error: downloadError,
    } = await supabaseAdmin
      .storage
      .from(
        "vehicle-evidence",
      )
      .download(
        storagePath,
      );

    if (
      downloadError ||
      !imageBlob
    ) {
      return jsonResponse(
        {
          error:
            "Uploaded image could not be read for verification.",
        },
        400,
      );
    }

    if (
      !String(
        imageBlob.type || "",
      ).startsWith("image/")
    ) {
      return jsonResponse(
        {
          error:
            "AI verification requires an image file.",
        },
        400,
      );
    }

    const imageDataUrl =
      await dataUrlFromBlob(
        imageBlob,
        imageBlob.type ||
          "image/jpeg",
      );

    const expectedRegistration =
      String(
        vehicle.registration || "",
      ).trim();

    const expectedMake =
      String(
        vehicle.make || "",
      ).trim();

    const expectedModel =
      String(
        vehicle.model || "",
      ).trim();

    const isPlateRequired =
      [
        "vehicle-front",
        "vehicle-rear",
      ].includes(
        logicalType,
      );

    const isOdometer =
      logicalType ===
      "odometer";

    const prompt = `
You are verifying one fleet vehicle evidence photograph.

Assigned vehicle:
- Make: ${expectedMake || "unknown"}
- Model: ${expectedModel || "unknown"}
- Registration: ${expectedRegistration || "unknown"}

Required evidence type:
- ${logicalType}
- Expected visual content: ${viewDescription(logicalType)}

Verification rules:
1. Inspect only what is actually visible. Never invent text, registration characters, make/model, or odometer digits.
2. A random person, building, document, screenshot, logo, unrelated object, or unrelated vehicle must fail.
3. For vehicle exterior evidence, the vehicle must be the main subject and the required angle/view must be clearly shown.
4. For front and rear evidence, the registration plate must be visible and readable enough to compare to the assigned registration.
5. For side evidence, registration may be unavailable. Use visible make/model/body characteristics only as supporting context; do not invent a plate.
6. For an odometer image, the dashboard/odometer must be clearly visible and the numeric reading must be readable.
7. image_clear must be false when blur, darkness, obstruction, crop, glare, or distance prevents reliable verification.
8. vehicle_match_likely should describe whether the visible vehicle appears consistent with the assigned make/model. Be conservative.
9. requested_view_visible must be true only when the requested complete angle/content is actually visible.

Return ONLY valid JSON with this exact shape and no markdown:
{
  "vehicle_present": true,
  "requested_view_visible": true,
  "image_clear": true,
  "registration_visible": false,
  "detected_registration": null,
  "registration_confidence": 0.0,
  "detected_make": null,
  "detected_model": null,
  "vehicle_match_likely": true,
  "vehicle_match_confidence": 0.0,
  "odometer_visible": false,
  "detected_odometer": null,
  "odometer_confidence": 0.0,
  "overall_confidence": 0.0,
  "reason": "Brief factual explanation."
}

Additional requirement:
- Registration is ${isPlateRequired ? "REQUIRED for this view." : "not required for this view."}
- Odometer is ${isOdometer ? "REQUIRED for this image." : "not the primary target."}
`;

    let aiPayload: any;

    try {
      const aiResponse =
        await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              "Authorization":
                `Bearer ${openAIKey}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              model,
              input: [
                {
                  role: "user",
                  content: [
                    {
                      type:
                        "input_text",
                      text: prompt,
                    },
                    {
                      type:
                        "input_image",
                      image_url:
                        imageDataUrl,
                    },
                  ],
                },
              ],
              max_output_tokens: 900,
            }),
          },
        );

      if (!aiResponse.ok) {
        const responseText =
          await aiResponse.text();

        throw new Error(
          `OpenAI verification failed (${aiResponse.status}): ${responseText.slice(
            0,
            300,
          )}`,
        );
      }

      aiPayload =
        await aiResponse.json();
    } catch (error) {
      await writeAudit(
        supabaseAdmin,
        {
          storage_path:
            storagePath,
          vehicle_id:
            vehicleId,
          trip_id:
            tripId,
          request_id:
            requestId,
          employee_number:
            employeeNumber,
          evidence_stage:
            stage,
          logical_type:
            logicalType,
          decision:
            "error",
          expected_registration:
            expectedRegistration ||
            null,
          expected_make:
            expectedMake || null,
          expected_model:
            expectedModel || null,
          expected_odometer:
            expectedOdometer,
          reason:
            error instanceof Error
              ? error.message
              : "AI verification failed.",
          model_name:
            model,
        },
      );

      return jsonResponse(
        {
          error:
            "Photo verification service failed. Please try the upload again.",
        },
        503,
      );
    }

    let result: any;

    try {
      const aiText =
        extractOpenAIText(
          aiPayload,
        );

      result =
        parseJsonOnly(
          aiText,
        );
    } catch (error) {
      await writeAudit(
        supabaseAdmin,
        {
          storage_path:
            storagePath,
          vehicle_id:
            vehicleId,
          trip_id:
            tripId,
          request_id:
            requestId,
          employee_number:
            employeeNumber,
          evidence_stage:
            stage,
          logical_type:
            logicalType,
          decision:
            "error",
          expected_registration:
            expectedRegistration ||
            null,
          expected_make:
            expectedMake || null,
          expected_model:
            expectedModel || null,
          expected_odometer:
            expectedOdometer,
          reason:
            "AI returned an invalid verification response.",
          model_name:
            model,
          raw_result:
            aiPayload,
        },
      );

      return jsonResponse(
        {
          error:
            "The photo could not be verified reliably. Please retake a clearer photo.",
        },
        422,
      );
    }

    const vehiclePresent =
      Boolean(
        result.vehicle_present,
      );

    const requestedViewVisible =
      Boolean(
        result.requested_view_visible,
      );

    const imageClear =
      Boolean(
        result.image_clear,
      );

    const registrationVisible =
      Boolean(
        result.registration_visible,
      );

    const detectedRegistration =
      result.detected_registration
        ? String(
            result.detected_registration,
          ).trim()
        : null;

    const registrationMatch =
      detectedRegistration &&
      expectedRegistration
        ? normaliseRegistration(
            detectedRegistration,
          ) ===
          normaliseRegistration(
            expectedRegistration,
          )
        : null;

    const detectedOdometer =
      integerOrNull(
        result.detected_odometer,
      );

    const odometerMatch =
      isOdometer &&
      expectedOdometer !== null &&
      detectedOdometer !== null
        ? Math.abs(
            detectedOdometer -
              expectedOdometer,
          ) <= 2
        : null;

    const vehicleMatchLikely =
      result.vehicle_match_likely ===
      undefined
        ? null
        : Boolean(
            result.vehicle_match_likely,
          );

    const confidence =
      clamp01(
        result.overall_confidence,
      );

    let accepted = true;
    let userMessage =
      "Photo verified.";

    if (isOdometer) {
      if (!imageClear) {
        accepted = false;
        userMessage =
          "The odometer photo is not clear enough. Retake it with the dashboard in focus and without glare.";
      } else if (
        !Boolean(
          result.odometer_visible,
        ) ||
        detectedOdometer === null
      ) {
        accepted = false;
        userMessage =
          "The photo does not clearly show a readable vehicle odometer.";
      } else if (
        expectedOdometer === null
      ) {
        accepted = false;
        userMessage =
          "Enter the odometer reading before uploading the odometer photo.";
      } else if (
        odometerMatch !== true
      ) {
        accepted = false;
        userMessage =
          `The photographed odometer (${detectedOdometer.toLocaleString(
            "en-ZA",
          )} km) does not match the entered reading (${expectedOdometer.toLocaleString(
            "en-ZA",
          )} km).`;
      }
    } else {
      if (!vehiclePresent) {
        accepted = false;
        userMessage =
          "This photo does not clearly show a vehicle. Retake the required vehicle photo.";
      } else if (!imageClear) {
        accepted = false;
        userMessage =
          "The vehicle photo is not clear enough. Retake it in good lighting with the complete required view visible.";
      } else if (
        !requestedViewVisible
      ) {
        accepted = false;
        userMessage =
          `This does not clearly show the required ${viewDescription(
            logicalType,
          )}. Retake the photo from the instructed angle.`;
      } else if (
        isPlateRequired &&
        (
          !registrationVisible ||
          !detectedRegistration
        )
      ) {
        accepted = false;
        userMessage =
          "The registration plate is not readable. Retake the photo with the plate clearly visible.";
      } else if (
        isPlateRequired &&
        registrationMatch !== true
      ) {
        accepted = false;
        userMessage =
          `Registration does not match the assigned vehicle. Expected ${expectedRegistration}; detected ${detectedRegistration || "unreadable"}.`;
      } else if (
        vehicleMatchLikely === false &&
        numberOrNull(
          result.vehicle_match_confidence,
        ) !== null &&
        Number(
          result.vehicle_match_confidence,
        ) >= 0.8
      ) {
        accepted = false;
        userMessage =
          `The photographed vehicle does not appear consistent with the assigned ${expectedMake} ${expectedModel}. Retake a photo of the assigned vehicle.`;
      }
    }

    await writeAudit(
      supabaseAdmin,
      {
        storage_path:
          storagePath,
        vehicle_id:
          vehicleId,
        trip_id:
          tripId,
        request_id:
          requestId,
        employee_number:
          employeeNumber,
        evidence_stage:
          stage,
        logical_type:
          logicalType,
        decision:
          accepted
            ? "accepted"
            : "rejected",
        vehicle_present:
          vehiclePresent,
        requested_view_visible:
          requestedViewVisible,
        image_clear:
          imageClear,
        expected_registration:
          expectedRegistration ||
          null,
        detected_registration:
          detectedRegistration,
        registration_match:
          registrationMatch,
        expected_make:
          expectedMake || null,
        expected_model:
          expectedModel || null,
        detected_make:
          result.detected_make
            ? String(
                result.detected_make,
              )
            : null,
        detected_model:
          result.detected_model
            ? String(
                result.detected_model,
              )
            : null,
        vehicle_match_likely:
          vehicleMatchLikely,
        expected_odometer:
          expectedOdometer,
        detected_odometer:
          detectedOdometer,
        odometer_match:
          odometerMatch,
        confidence,
        reason:
          String(
            result.reason ||
            userMessage,
          ),
        model_name:
          model,
        raw_result:
          result,
      },
    );

    if (!accepted) {
      await supabaseAdmin
        .storage
        .from(
          "vehicle-evidence",
        )
        .remove([
          storagePath,
        ]);

      return jsonResponse(
        {
          accepted: false,
          message:
            userMessage,
          verification: {
            vehicle_present:
              vehiclePresent,
            requested_view_visible:
              requestedViewVisible,
            image_clear:
              imageClear,
            expected_registration:
              expectedRegistration ||
              null,
            detected_registration:
              detectedRegistration,
            registration_match:
              registrationMatch,
            expected_odometer:
              expectedOdometer,
            detected_odometer:
              detectedOdometer,
            odometer_match:
              odometerMatch,
            detected_make:
              result.detected_make ||
              null,
            detected_model:
              result.detected_model ||
              null,
            confidence,
          },
        },
        422,
      );
    }

    return jsonResponse(
      {
        accepted: true,
        message:
          userMessage,
        verification: {
          vehicle_present:
            vehiclePresent,
          requested_view_visible:
            requestedViewVisible,
          image_clear:
            imageClear,
          expected_registration:
            expectedRegistration ||
            null,
          detected_registration:
            detectedRegistration,
          registration_match:
            registrationMatch,
          expected_odometer:
            expectedOdometer,
          detected_odometer:
            detectedOdometer,
          odometer_match:
            odometerMatch,
          detected_make:
            result.detected_make ||
            null,
          detected_model:
            result.detected_model ||
            null,
          confidence,
        },
      },
    );
  },
);
