import { supabase } from "./supabase";

export async function listVehicleRequestsForEmployee(
  employeeNumber
) {
  const normalizedEmployeeNumber = String(
    employeeNumber || ""
  )
    .trim()
    .toUpperCase();

  if (!normalizedEmployeeNumber) {
    return [];
  }

  const { data, error } = await supabase.rpc(
    "list_vehicle_requests_for_employee",
    {
      p_employee_number:
        normalizedEmployeeNumber,
    }
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
}

export async function getVehicleRequestForEmployee(
  requestId,
  employeeNumber
) {
  const normalizedRequestId = String(
    requestId || ""
  ).trim();

  const normalizedEmployeeNumber = String(
    employeeNumber || ""
  )
    .trim()
    .toUpperCase();

  if (
    !normalizedRequestId ||
    !normalizedEmployeeNumber
  ) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "get_vehicle_request_for_employee",
    {
      p_request_id:
        normalizedRequestId,

      p_employee_number:
        normalizedEmployeeNumber,
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}