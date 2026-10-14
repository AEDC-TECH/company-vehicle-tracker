import { supabase } from "./supabase";


function normalizeEmployeeNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}


export async function stageTripFuelForEmployee({
  tripId,
  employeeNumber,
  litres,
  station = "",
  paymentMethod = "fuel-card",
  fullTank = false,
}) {
  const { data, error } = await supabase.rpc(
    "stage_employee_trip_fuel",
    {
      p_trip_id: tripId,

      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),

      p_litres:
        Number(litres),

      p_station:
        station.trim() || null,

      p_payment_method:
        paymentMethod,

      p_full_tank:
        Boolean(fullTank),
    }
  );


  if (error) {
    throw error;
  }


  return data || null;
}