import { supabase } from "./supabase";


function normalizeEmployeeNumber(
  employeeNumber
) {
  const normalized = String(
    employeeNumber || ""
  )
    .trim()
    .toUpperCase();

  return normalized || null;
}


export async function createVehicleEvidenceRecord({
  employeeNumber = null,
  vehicleId,
  tripId = null,
  requestId = null,
  incidentId = null,
  stage,
  type,
  storagePath,
  originalFileName,
  mimeType,
  fileSize,
}) {
  if (!vehicleId) {
    throw new Error(
      "Vehicle is required."
    );
  }

  if (!stage) {
    throw new Error(
      "Evidence stage is required."
    );
  }

  if (!type) {
    throw new Error(
      "Evidence type is required."
    );
  }

  if (!storagePath) {
    throw new Error(
      "Evidence storage path is required."
    );
  }

  const { data, error } = await supabase.rpc(
    "create_vehicle_evidence_record",
    {
      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),

      p_vehicle_id:
        vehicleId,

      p_trip_id:
        tripId || null,

      p_request_id:
        requestId || null,

      p_incident_id:
        incidentId || null,

      p_evidence_stage:
        stage,

      p_evidence_type:
        type,

      p_storage_path:
        storagePath,

      p_original_file_name:
        originalFileName || null,

      p_mime_type:
        mimeType || null,

      p_file_size:
        fileSize,
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}


export async function listVehiclePreUseEvidenceForRequest(
  requestId,
  employeeNumber = null
) {
  if (!requestId) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "list_vehicle_pre_use_evidence_for_request",
    {
      p_request_id:
        requestId,

      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


export async function listVehiclePostUseEvidenceForTrip(
  tripId,
  employeeNumber = null
) {
  if (!tripId) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "list_vehicle_post_use_evidence_for_trip",
    {
      p_trip_id:
        tripId,

      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),
    }
  );

  if (error) {
    throw error;
  }

  return data;
}


export async function countVehicleEvidenceForIncident(
  incidentId,
  employeeNumber = null
) {
  if (!incidentId) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "count_vehicle_evidence_for_incident",
    {
      p_incident_id:
        incidentId,

      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),
    }
  );

  if (error) {
    throw error;
  }

  if (data === null) {
    return null;
  }

  return Number(data);
}
