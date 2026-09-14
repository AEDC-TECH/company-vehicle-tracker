import { supabase } from "./supabase";

export async function listVehicleTripsForEmployee(
  employeeNumber,
  statuses = null
) {
  const normalizedEmployeeNumber = String(
    employeeNumber || ""
  )
    .trim()
    .toUpperCase();

  if (!normalizedEmployeeNumber) {
    return [];
  }

  const normalizedStatuses =
    Array.isArray(statuses) &&
    statuses.length > 0
      ? statuses
      : null;

  const { data, error } = await supabase.rpc(
    "list_vehicle_trips_for_employee",
    {
      p_employee_number:
        normalizedEmployeeNumber,

      p_statuses:
        normalizedStatuses,
    }
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
}