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

export async function checkVehicleRequestConflicts(
  vehicleId,
  departureAt,
  returnAt
) {
  const normalizedVehicleId = String(
    vehicleId || ""
  ).trim();

  const normalizedDepartureAt = String(
    departureAt || ""
  ).trim();

  const normalizedReturnAt = String(
    returnAt || ""
  ).trim();

  if (
    !normalizedVehicleId ||
    !normalizedDepartureAt ||
    !normalizedReturnAt
  ) {
    return [];
  }

  const { data, error } = await supabase.rpc(
    "check_vehicle_request_conflicts",
    {
      p_vehicle_id:
        normalizedVehicleId,

      p_departure_at:
        normalizedDepartureAt,

      p_return_at:
        normalizedReturnAt,
    }
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
}

export async function createVehicleRequestForEmployee({
  vehicleId,
  requestedDriverName,
  employeeNumber,
  department,
  purpose,
  destination,
  requestedDepartureAt,
  requestedReturnAt,
  outOfProvince,
  itinerary,
  overnightLocation,
}) {
  const { data, error } = await supabase.rpc(
    "create_vehicle_request_for_employee",
    {
      p_vehicle_id:
        vehicleId,

      p_requested_driver_name:
        requestedDriverName,

      p_employee_number:
        employeeNumber,

      p_department:
        department,

      p_purpose:
        purpose,

      p_destination:
        destination,

      p_requested_departure_at:
        requestedDepartureAt,

      p_requested_return_at:
        requestedReturnAt,

      p_out_of_province:
        outOfProvince,

      p_itinerary:
        itinerary,

      p_overnight_location:
        overnightLocation,
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}