export const FEATURE_DEFINITIONS = [
  {
    key: "vehicle_requests",
    label: "Vehicle Requests",
    group: "Core Operations",
    description:
      "Vehicle request, approval, checkout and pre-trip request workflow.",
  },

  {
    key: "trip_history",
    label: "Trip History",
    group: "Core Operations",
    description:
      "Admin fleet history and employee trip-history screens.",
  },

  {
    key: "employees",
    label: "Employee Register",
    group: "People",
    description:
      "Employee register and company work-number management.",
  },

  {
    key: "drivers",
    label: "Driver Management",
    group: "People",
    description:
      "Driver eligibility, licence and PrDP management.",
  },

  {
    key: "defects",
    label: "Defect Management",
    group: "Fleet Care",
    description:
      "Vehicle defect review, grounding and resolution workflow.",
  },

  {
    key: "maintenance",
    label: "Maintenance",
    group: "Fleet Care",
    description:
      "Maintenance records, repairs and vehicle service workflow.",
  },

  {
    key: "fuel",
    label: "Fuel Management",
    group: "Fleet Care",
    description:
      "Fuel purchases, odometer records and fuel-cost tracking.",
  },

  {
    key: "customers",
    label: "Customers",
    group: "Transport Operations",
    description:
      "Customer register used by transport jobs and deliveries.",
  },

  {
    key: "transport_jobs",
    label: "Jobs & Deliveries",
    group: "Transport Operations",
    description:
      "Transport jobs, assignments, cargo and customer deliveries.",
  },

  {
    key: "dispatch",
    label: "Dispatch Board",
    group: "Transport Operations",
    description:
      "Dispatch assigned jobs into approved bookings and active trips.",

    dependsOn: [
      "transport_jobs",
    ],
  },

  {
    key: "pod",
    label: "Proof of Delivery",
    group: "Transport Operations",
    description:
      "Digital POD, paper POD, signatures and downloadable delivery documents.",

    dependsOn: [
      "transport_jobs",
    ],
  },

  {
    key: "incidents",
    label: "Incident Reporting",
    group: "Safety",
    description:
      "Vehicle incident reporting during active trips.",
  },

  {
    key: "employee_portal",
    label: "Employee Portal",
    group: "Access",
    description:
      "Employee-facing request, delivery, POD, return and history screens.",
  },
];


export const DEFAULT_FEATURES =
  FEATURE_DEFINITIONS.reduce(
    (
      result,
      feature
    ) => ({
      ...result,

      [feature.key]:
        true,
    }),
    {}
  );


export function getFeatureDefinition(
  featureKey
) {
  return FEATURE_DEFINITIONS.find(
    (feature) =>
      feature.key ===
      featureKey
  );
}