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


export async function getVehicleTripForIncident(
  tripId,
  employeeNumber = null
) {
  if (!tripId) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "get_vehicle_trip_for_incident",
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

  return data || null;
}


export async function getVehicleIncidentForTrip(
  tripId,
  employeeNumber = null
) {
  if (!tripId) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "get_vehicle_incident_for_trip",
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

  return data || null;
}


export async function createVehicleIncidentReport({
  tripId,
  employeeNumber = null,
  incidentType,
  incidentAt,
  location,
  description,
  injuriesReported,
  emergencyServicesContacted,
  facilitiesManagerNotified,
  facilitiesManagerNotifiedAt,
  policeReported,
  policeStation,
  policeCaseNumber,
  thirdPartyDetails,
  witnessDetails,
  thirdPartyInsuranceDetails,
}) {
  if (!tripId) {
    throw new Error(
      "Vehicle trip is required."
    );
  }

  const { data, error } = await supabase.rpc(
    "create_vehicle_incident_report",
    {
      p_trip_id:
        tripId,

      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),

      p_incident_type:
        String(
          incidentType || ""
        ).trim(),

      p_incident_at:
        incidentAt,

      p_location:
        String(
          location || ""
        ).trim() || null,

      p_description:
        String(
          description || ""
        ).trim(),

      p_injuries_reported:
        Boolean(
          injuriesReported
        ),

      p_emergency_services_contacted:
        Boolean(
          emergencyServicesContacted
        ),

      p_facilities_manager_notified:
        Boolean(
          facilitiesManagerNotified
        ),

      p_facilities_manager_notified_at:
        facilitiesManagerNotified
          ? facilitiesManagerNotifiedAt ||
            null
          : null,

      p_police_reported:
        Boolean(
          policeReported
        ),

      p_police_station:
        policeReported
          ? String(
              policeStation || ""
            ).trim() || null
          : null,

      p_police_case_number:
        policeReported
          ? String(
              policeCaseNumber || ""
            ).trim() || null
          : null,

      p_third_party_details:
        String(
          thirdPartyDetails || ""
        ).trim() || null,

      p_witness_details:
        String(
          witnessDetails || ""
        ).trim() || null,

      p_third_party_insurance_details:
        String(
          thirdPartyInsuranceDetails ||
            ""
        ).trim() || null,
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}
