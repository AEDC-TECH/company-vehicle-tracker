import * as tf from "@tensorflow/tfjs";

import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";

import * as cocoSsd from "@tensorflow-models/coco-ssd";

import {
  createWorker,
} from "tesseract.js";


let detectorPromise = null;
let ocrWorkerPromise = null;


const VEHICLE_CLASSES = new Set([
  "car",
  "truck",
  "bus",
]);


function normaliseRegistration(
  value
) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}


function normaliseOcrText(
  value
) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}


function extractNumberCandidates(
  value
) {
  const text =
    String(value || "")
      .replace(/[,.\s]/g, "");

  const matches =
    text.match(/\d{3,8}/g) || [];

  return [
    ...new Set(
      matches
        .map(Number)
        .filter(Number.isFinite)
    ),
  ];
}


function getClosestNumber(
  values,
  expected
) {
  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return null;
  }

  if (
    expected === null ||
    expected === undefined ||
    expected === "" ||
    !Number.isFinite(Number(expected))
  ) {
    return values[0];
  }

  const target =
    Number(expected);

  return values.reduce(
    (
      closest,
      current
    ) => {
      if (closest === null) {
        return current;
      }

      return Math.abs(
        current - target
      ) <
        Math.abs(
          closest - target
        )
        ? current
        : closest;
    },
    null
  );
}


async function getDetector() {
  if (!detectorPromise) {
    detectorPromise =
      (async () => {
        try {
          await tf.setBackend(
            "webgl"
          );
        } catch {
          await tf.setBackend(
            "cpu"
          );
        }

        await tf.ready();

        return cocoSsd.load({
          base:
            "lite_mobilenet_v2",
        });
      })();
  }

  return detectorPromise;
}


async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise =
      createWorker("eng");
  }

  return ocrWorkerPromise;
}


function loadImageFromFile(
  file
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const url =
        URL.createObjectURL(
          file
        );

      const image =
        new Image();

      image.onload = () => {
        resolve({
          image,
          cleanup: () =>
            URL.revokeObjectURL(
              url
            ),
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          url
        );

        reject(
          new Error(
            "The selected image could not be opened."
          )
        );
      };

      image.src = url;
    }
  );
}


function findBestVehiclePrediction(
  predictions,
  image
) {
  const imageArea =
    Math.max(
      1,
      Number(
        image.naturalWidth ||
        image.width ||
        1
      ) *
        Number(
          image.naturalHeight ||
          image.height ||
          1
        )
    );

  return (
    predictions
      .filter(
        (prediction) =>
          VEHICLE_CLASSES.has(
            prediction.class
          ) &&
          prediction.score >=
            0.45
      )
      .map(
        (prediction) => {
          const [
            ,
            ,
            width,
            height,
          ] =
            prediction.bbox;

          const areaRatio =
            (
              width *
              height
            ) /
            imageArea;

          return {
            ...prediction,
            areaRatio,
          };
        }
      )
      .filter(
        (prediction) =>
          prediction.areaRatio >=
          0.08
      )
      .sort(
        (
          a,
          b
        ) =>
          (
            b.score *
            b.areaRatio
          ) -
          (
            a.score *
            a.areaRatio
          )
      )[0] || null
  );
}


async function runVehicleDetection(
  file
) {
  const {
    image,
    cleanup,
  } =
    await loadImageFromFile(
      file
    );

  try {
    const detector =
      await getDetector();

    const predictions =
      await detector.detect(
        image
      );

    const bestVehicle =
      findBestVehiclePrediction(
        predictions,
        image
      );

    return {
      vehicleDetected:
        Boolean(
          bestVehicle
        ),

      vehicleClass:
        bestVehicle
          ?.class || null,

      confidence:
        bestVehicle
          ?.score || 0,

      vehicleAreaRatio:
        bestVehicle
          ?.areaRatio || 0,

      predictions,
    };
  } finally {
    cleanup();
  }
}


async function runOcr(
  file
) {
  const worker =
    await getOcrWorker();

  const {
    data,
  } =
    await worker.recognize(
      file
    );

  return {
    text:
      data?.text || "",

    confidence:
      Number(
        data?.confidence || 0
      ),
  };
}


export function formatAssignedVehicleName(
  expectedVehicle
) {
  if (!expectedVehicle) {
    return "";
  }

  const make =
    String(
      expectedVehicle.make || ""
    ).trim();

  const model =
    String(
      expectedVehicle.model || ""
    ).trim();

  if (!make) {
    return model;
  }

  if (!model) {
    return make;
  }

  if (
    model
      .toLowerCase()
      .startsWith(
        make.toLowerCase()
      )
  ) {
    return model;
  }

  return `${make} ${model}`;
}


function buildAssignedVehicleLabel(
  expectedVehicle
) {
  return formatAssignedVehicleName(
    expectedVehicle
  );
}


export function isVehicleExteriorType(
  type
) {
  return [
    "vehicle-front",
    "vehicle-rear",
    "vehicle-driver-side",
    "vehicle-passenger-side",
  ].includes(type);
}


export function shouldVerifyPhotoLocally(
  type
) {
  return (
    isVehicleExteriorType(
      type
    ) ||
    type === "odometer"
  );
}


export async function verifyVehiclePhoto({
  file,
  type,
  expectedVehicle = null,
  expectedOdometer = null,
}) {
  if (
    !file ||
    !String(
      file.type || ""
    ).startsWith(
      "image/"
    )
  ) {
    return {
      accepted: false,
      hardFailure: true,
      message:
        "This verification requires an image file.",
    };
  }


  if (
    isVehicleExteriorType(
      type
    )
  ) {
    const detection =
      await runVehicleDetection(
        file
      );

    if (
      !detection.vehicleDetected
    ) {
      return {
        accepted: false,
        hardFailure: true,
        kind:
          "vehicle",

        message:
          "This photo does not clearly contain a car, truck or bus. Please photograph the assigned vehicle.",

        vehicleDetected:
          false,

        assignedVehicle:
          buildAssignedVehicleLabel(
            expectedVehicle
          ),

        expectedRegistration:
          expectedVehicle
            ?.registration ||
          null,
      };
    }


    const result = {
      accepted: true,
      hardFailure: false,
      kind:
        "vehicle",

      message:
        "Vehicle detected.",

      vehicleDetected:
        true,

      detectedVehicleClass:
        detection
          .vehicleClass,

      vehicleConfidence:
        detection
          .confidence,

      assignedVehicle:
        buildAssignedVehicleLabel(
          expectedVehicle
        ),

      expectedRegistration:
        expectedVehicle
          ?.registration ||
        null,

      registrationStatus:
        "not-checked",

      registrationMatched:
        null,

      ocrText:
        "",
    };


    if (
      [
        "vehicle-front",
        "vehicle-rear",
      ].includes(type)
    ) {
      const expectedRegistration =
        String(
          expectedVehicle
            ?.registration || ""
        ).trim();

      if (!expectedRegistration) {
        return {
          ...result,
          accepted: false,
          hardFailure: true,
          registrationStatus:
            "missing-assigned-registration",
          registrationMatched:
            false,
          message:
            "This vehicle does not have a registration recorded in the fleet register. Admin must add the registration before front/rear photo verification can continue.",
        };
      }

      const ocr =
        await runOcr(
          file
        );

      const expected =
        normaliseRegistration(
          expectedRegistration
        );

      const recognised =
        normaliseOcrText(
          ocr.text
        );

      const matched =
        Boolean(
          expected &&
          recognised.includes(
            expected
          )
        );

      result.ocrText =
        ocr.text;

      result.ocrConfidence =
        ocr.confidence;

      result.registrationMatched =
        matched;

      if (matched) {
        result.registrationStatus =
          "matched";

        result.message =
          "Vehicle detected and assigned registration matched.";

        return result;
      }

      const readableEnough =
        recognised.length >= 4 &&
        ocr.confidence >= 20;

      return {
        ...result,
        accepted: false,
        hardFailure: true,

        registrationStatus:
          readableEnough
            ? "mismatch"
            : "unreadable",

        registrationMatched:
          false,

        message:
          readableEnough
            ? `The assigned registration ${expectedRegistration} was not found in this photo. Retake the photo of the correct vehicle with the full registration plate clearly visible.`
            : `The registration plate could not be read clearly. Retake the ${type === "vehicle-front" ? "front" : "rear"} photo closer, in good light, with the full plate visible.`,
      };
    }


    return result;
  }


  if (
    type === "odometer"
  ) {
    const ocr =
      await runOcr(
        file
      );

    const candidates =
      extractNumberCandidates(
        ocr.text
      );

    const expected =
      Number.isFinite(
        Number(
          expectedOdometer
        )
      )
        ? Math.round(
            Number(
              expectedOdometer
            )
          )
        : null;

    const detected =
      getClosestNumber(
        candidates,
        expected
      );

    if (
      detected === null
    ) {
      return {
        accepted: false,
        hardFailure: true,
        kind:
          "odometer",

        message:
          "No readable odometer-style number was detected. Retake the dashboard photo closer and in focus.",

        expectedOdometer:
          expected,

        detectedOdometer:
          null,

        ocrText:
          ocr.text,

        ocrConfidence:
          ocr.confidence,
      };
    }


    const difference =
      expected !== null
        ? Math.abs(
            detected -
            expected
          )
        : null;

    const matched =
      difference !== null
        ? difference <= 2
        : null;

    return {
      accepted: true,
      hardFailure: false,
      kind:
        "odometer",

      message:
        matched === true
          ? "Odometer digits detected and matched."
          : matched === false
          ? "Odometer digits were detected, but the local OCR reading does not match the entered value. Please review the photo and entered reading."
          : "Readable odometer digits were detected.",

      expectedOdometer:
        expected,

      detectedOdometer:
        detected,

      odometerMatched:
        matched,

      ocrText:
        ocr.text,

      ocrConfidence:
        ocr.confidence,
    };
  }


  return {
    accepted: true,
    hardFailure: false,
    kind:
      "not-required",

    message:
      "Local verification is not required for this evidence type.",
  };
}
