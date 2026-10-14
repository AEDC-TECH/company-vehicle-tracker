import { supabase } from "./supabase";


function normalizeEmployeeNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}


export async function listEmployeeDeliveries(
  employeeNumber
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "list_employee_delivery_jobs",
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


export async function getEmployeeDeliveryContext({
  tripId,
  employeeNumber,
}) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_employee_delivery_context",
    {
      p_trip_id: tripId,

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


export async function submitEmployeeProofOfDelivery({
  tripId,
  employeeNumber,
  deliveryResult,
  deliveredAt,
  deliveryLocation,
  recipientName,
  recipientRole,
  recipientPhone,
  recipientSignatureName,
  recipientConfirmed,
  goodsCondition,
  quantityReceived,
  documentReference,
  deliveryNotes,
  signatureData,
}) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "submit_employee_proof_of_delivery",
    {
      p_trip_id: tripId,

      p_employee_number:
        normalizeEmployeeNumber(
          employeeNumber
        ),

      p_delivery_result:
        deliveryResult,

      p_delivered_at:
        deliveredAt,

      p_delivery_location:
        deliveryLocation || null,

      p_recipient_name:
        recipientName || null,

      p_recipient_role:
        recipientRole || null,

      p_recipient_phone:
        recipientPhone || null,

      p_recipient_signature_name:
        recipientSignatureName || null,

      p_recipient_confirmed:
        Boolean(
          recipientConfirmed
        ),

      p_goods_condition:
        goodsCondition,

      p_quantity_received:
        quantityReceived === ""
          ? null
          : Number(
              quantityReceived
            ),

      p_document_reference:
        documentReference || null,

      p_delivery_notes:
        deliveryNotes || null,

      p_signature_data:
        signatureData || null,
    }
  );


  if (error) {
    throw error;
  }


  return data || null;
}