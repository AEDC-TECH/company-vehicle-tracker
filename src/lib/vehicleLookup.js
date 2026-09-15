import { supabase } from "./supabase";

function normalizeEmployeeNumber(value) {
  const normalized =
    String(value || "")
      .trim()
      .toUpperCase();

  return normalized || null;
}

export async function listAvailableVehiclesForEmployee(
  employeeNumber
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "list_available_vehicles_for_employee",
    {
      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),
    }
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
}

export async function listVehiclesForEmployee(
  employeeNumber
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "list_vehicles_for_employee",
    {
      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),
    }
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
}

export async function getVehicleForEmployeeContext({
  vehicleId,
  employeeNumber,
  requestId = null,
  tripId = null,
}) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_vehicle_for_employee_context",
    {
      p_vehicle_id:
        vehicleId,

      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),

      p_request_id:
        requestId || null,

      p_trip_id:
        tripId || null,
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}

export async function checkVehicleRequestabilityForEmployee(
  vehicleId,
  employeeNumber
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "check_vehicle_requestability_for_employee",
    {
      p_vehicle_id:
        vehicleId,

      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}
