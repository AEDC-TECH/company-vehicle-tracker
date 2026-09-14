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


export async function getVehicleTripForEmployeeRequest(
  requestId,
  employeeNumber
) {
  const normalizedEmployeeNumber = String(
    employeeNumber || ""
  )
    .trim()
    .toUpperCase();

  if (
    !requestId ||
    !normalizedEmployeeNumber
  ) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "get_vehicle_trip_for_employee_request",
    {
      p_request_id:
        requestId,

      p_employee_number:
        normalizedEmployeeNumber,
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}


export async function completeVehiclePreInspectionForEmployee({
  requestId,
  employeeNumber,
  phone,
  driverLicenseNumber,
  licenseValidConfirmed,
  fitToDriveConfirmed,
  authorizedDriverConfirmed,
  policyAcknowledgedConfirmed,
  startOdometer,
  fuelBefore,
  conditionBefore,
  preExistingDamage,
  preExistingDamageDescription,
  preUseNotes,
  informationAccuracyConfirmed,
}) {
  const normalizedEmployeeNumber = String(
    employeeNumber || ""
  )
    .trim()
    .toUpperCase();

  if (!requestId) {
    throw new Error(
      "Vehicle request is required."
    );
  }

  if (!normalizedEmployeeNumber) {
    throw new Error(
      "Employee number is required."
    );
  }

  const { data, error } = await supabase.rpc(
    "complete_vehicle_pre_inspection_for_employee",
    {
      p_request_id:
        requestId,

      p_employee_number:
        normalizedEmployeeNumber,

      p_phone:
        String(phone || "").trim() ||
        null,

      p_driver_license_number:
        String(
          driverLicenseNumber || ""
        ).trim(),

      p_license_valid_confirmed:
        Boolean(
          licenseValidConfirmed
        ),

      p_fit_to_drive_confirmed:
        Boolean(
          fitToDriveConfirmed
        ),

      p_authorized_driver_confirmed:
        Boolean(
          authorizedDriverConfirmed
        ),

      p_policy_acknowledged_confirmed:
        Boolean(
          policyAcknowledgedConfirmed
        ),

      p_start_odometer:
        Number(startOdometer),

      p_fuel_before:
        fuelBefore,

      p_condition_before:
        conditionBefore,

      p_pre_existing_damage:
        Boolean(
          preExistingDamage
        ),

      p_pre_existing_damage_description:
        preExistingDamage
          ? String(
              preExistingDamageDescription ||
                ""
            ).trim() || null
          : null,

      p_pre_use_notes:
        String(
          preUseNotes || ""
        ).trim() || null,

      p_information_accuracy_confirmed:
        Boolean(
          informationAccuracyConfirmed
        ),
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}