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


export async function getVehicleTripForEmployee(
  tripId,
  employeeNumber
) {
  const normalizedEmployeeNumber = String(
    employeeNumber || ""
  )
    .trim()
    .toUpperCase();

  if (
    !tripId ||
    !normalizedEmployeeNumber
  ) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "get_vehicle_trip_for_employee",
    {
      p_trip_id:
        tripId,

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


export async function completeVehicleReturnForEmployee({
  tripId,
  employeeNumber,
  endOdometer,
  fuelAfter,
  fuelPurchased,
  fuelAmount,
  fuelReceiptSubmitted,
  fuelReceiptReference,
  conditionAfter,
  conditionChanges,
  newDamage,
  newDamageDescription,
  warningLightReported,
  warningLightDescription,
  mechanicalIssueReported,
  mechanicalIssueDescription,
  postUseNotes,
  returnParkingLocation,
  returnedToDesignatedBay,
  alternativeParkingReason,
  vehicleLocked,
  windowsClosed,
  personalBelongingsRemoved,
  companyPropertyRemoved,
  keysReturned,
  keysReturnedTo,
  returnConditionConfirmed,
  vehicleSecuredConfirmed,
  informationAccuracyConfirmed,
}) {
  const normalizedEmployeeNumber = String(
    employeeNumber || ""
  )
    .trim()
    .toUpperCase();

  if (!tripId) {
    throw new Error(
      "Vehicle trip is required."
    );
  }

  if (!normalizedEmployeeNumber) {
    throw new Error(
      "Employee number is required."
    );
  }

  const { data, error } = await supabase.rpc(
    "complete_vehicle_return_for_employee",
    {
      p_trip_id:
        tripId,

      p_employee_number:
        normalizedEmployeeNumber,

      p_end_odometer:
        Number(endOdometer),

      p_fuel_after:
        fuelAfter,

      p_fuel_purchased:
        Boolean(
          fuelPurchased
        ),

      p_fuel_amount:
        fuelPurchased
          ? Number(
              fuelAmount || 0
            )
          : 0,

      p_fuel_receipt_submitted:
        Boolean(
          fuelReceiptSubmitted
        ),

      p_fuel_receipt_reference:
        fuelReceiptSubmitted
          ? String(
              fuelReceiptReference ||
                ""
            ).trim() || null
          : null,

      p_condition_after:
        conditionAfter,

      p_condition_changes:
        Array.isArray(
          conditionChanges
        )
          ? conditionChanges
          : [],

      p_new_damage:
        Boolean(
          newDamage
        ),

      p_new_damage_description:
        newDamage
          ? String(
              newDamageDescription ||
                ""
            ).trim() || null
          : null,

      p_warning_light_reported:
        Boolean(
          warningLightReported
        ),

      p_warning_light_description:
        warningLightReported
          ? String(
              warningLightDescription ||
                ""
            ).trim() || null
          : null,

      p_mechanical_issue_reported:
        Boolean(
          mechanicalIssueReported
        ),

      p_mechanical_issue_description:
        mechanicalIssueReported
          ? String(
              mechanicalIssueDescription ||
                ""
            ).trim() || null
          : null,

      p_post_use_notes:
        String(
          postUseNotes || ""
        ).trim() || null,

      p_return_parking_location:
        String(
          returnParkingLocation || ""
        ).trim(),

      p_returned_to_designated_bay:
        Boolean(
          returnedToDesignatedBay
        ),

      p_alternative_parking_reason:
        returnedToDesignatedBay
          ? null
          : String(
              alternativeParkingReason ||
                ""
            ).trim() || null,

      p_vehicle_locked:
        Boolean(
          vehicleLocked
        ),

      p_windows_closed:
        Boolean(
          windowsClosed
        ),

      p_personal_belongings_removed:
        Boolean(
          personalBelongingsRemoved
        ),

      p_company_property_removed:
        Boolean(
          companyPropertyRemoved
        ),

      p_keys_returned:
        Boolean(
          keysReturned
        ),

      p_keys_returned_to:
        String(
          keysReturnedTo || ""
        ).trim(),

      p_return_condition_confirmed:
        Boolean(
          returnConditionConfirmed
        ),

      p_vehicle_secured_confirmed:
        Boolean(
          vehicleSecuredConfirmed
        ),

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