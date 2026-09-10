import { supabase } from "./supabase";

export async function lookupVehicleEmployee(employeeNumber) {
  const normalizedEmployeeNumber = String(employeeNumber || "")
    .trim()
    .toUpperCase();

  if (!normalizedEmployeeNumber) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "lookup_vehicle_employee",
    {
      p_employee_number: normalizedEmployeeNumber,
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}