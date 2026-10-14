import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";


/* =========================================================
   SECURITY
========================================================= */

import ProtectedAdminRoute from "./Components/ProtectedAdminRoute";

import {
  FeatureProvider,
} from "./Components/FeatureProvider";

import FeatureRoute from "./Components/FeatureRoute";

import FeatureSettingsShortcut from "./Components/FeatureSettingsShortcut";


/* =========================================================
   ADMIN PAGES
========================================================= */

import AdminLogin from "./Pages/AdminLogin";

import VehicleDashboard from "./Pages/VehicleDashboard";

import VehicleManagement from "./Pages/VehicleManagement";

import VehicleDetails from "./Pages/VehicleDetails";

import RequestVehicle from "./Pages/RequestVehicle";

import VehicleRequests from "./Pages/VehicleRequests";

import RequestApproval from "./Pages/RequestApproval";

import VehicleCheckout from "./Pages/VehicleCheckout";

import VehicleReturn from "./Pages/VehicleReturn";

import VehicleHistory from "./Pages/VehicleHistory";

import IncidentReport from "./Pages/IncidentReport";

import EmployeeRegister from "./Pages/EmployeeRegister";

import DriverManagement from "./Pages/DriverManagement";

import DefectManagement from "./Pages/DefectManagement";

import MaintenanceManagement from "./Pages/MaintenanceManagement";

import FuelManagement from "./Pages/FuelManagement";

import CustomerManagement from "./Pages/CustomerManagement";

import TransportJobs from "./Pages/TransportJobs";

import DispatchBoard from "./Pages/DispatchBoard";

import AdminProofOfDelivery from "./Pages/AdminProofOfDelivery";

import FeatureManagement from "./Pages/FeatureManagement";


/* =========================================================
   EMPLOYEE PAGES
========================================================= */

import EmployeeDashboard from "./Pages/EmployeeDashboard";

import EmployeeDeliveries from "./Pages/EmployeeDeliveries";

import EmployeeProofOfDelivery from "./Pages/EmployeeProofOfDelivery";

import EmployeeRequestVehicle from "./Pages/EmployeeRequestVehicle";

import EmployeeMyRequests from "./Pages/EmployeeMyRequests";

import EmployeePreInspection from "./Pages/EmployeePreInspection";

import EmployeeVehicleReturn from "./Pages/EmployeeVehicleReturn";

import EmployeeMyHistory from "./Pages/EmployeeMyHistory";


function App() {
  return (
    <BrowserRouter>

      <FeatureProvider>

        {/* =================================================
            ADMIN FEATURE SETTINGS SHORTCUT
        ================================================= */}

        <FeatureSettingsShortcut />


        <Routes>


          {/* =================================================
              ADMIN LOGIN
          ================================================= */}

          <Route
            path="/admin-login"
            element={
              <AdminLogin />
            }
          />


          {/* =================================================
              PROTECTED ADMIN ROUTES
          ================================================= */}

          <Route
            element={
              <ProtectedAdminRoute />
            }
          >


            {/* ===============================================
                ADMIN DASHBOARD
            =============================================== */}

            <Route
              path="/"
              element={
                <VehicleDashboard />
              }
            />


            {/* ===============================================
                ADMIN FEATURE MANAGEMENT

                This page is intentionally NOT controlled
                by a feature flag.

                Otherwise the Admin could accidentally
                disable the page used to enable features.
            =============================================== */}

            <Route
              path="/settings/features"
              element={
                <FeatureManagement />
              }
            />


            {/* ===============================================
                ADMIN - VEHICLES

                Vehicle registry remains a CORE feature.
            =============================================== */}

            <Route
              path="/vehicles"
              element={
                <VehicleManagement />
              }
            />


            <Route
              path="/vehicles/:vehicleId"
              element={
                <VehicleDetails />
              }
            />


            {/* ===============================================
                ADMIN - EMPLOYEES
            =============================================== */}

            <Route
              path="/employees"
              element={
                <FeatureRoute
                  feature="employees"
                >
                  <EmployeeRegister />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                ADMIN - DRIVERS
            =============================================== */}

            <Route
              path="/drivers"
              element={
                <FeatureRoute
                  feature="drivers"
                >
                  <DriverManagement />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                ADMIN - DEFECTS
            =============================================== */}

            <Route
              path="/defects"
              element={
                <FeatureRoute
                  feature="defects"
                >
                  <DefectManagement />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                ADMIN - MAINTENANCE
            =============================================== */}

            <Route
              path="/maintenance"
              element={
                <FeatureRoute
                  feature="maintenance"
                >
                  <MaintenanceManagement />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                ADMIN - FUEL
            =============================================== */}

            <Route
              path="/fuel"
              element={
                <FeatureRoute
                  feature="fuel"
                >
                  <FuelManagement />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                TRANSPORT OPERATIONS - CUSTOMERS
            =============================================== */}

            <Route
              path="/customers"
              element={
                <FeatureRoute
                  feature="customers"
                >
                  <CustomerManagement />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                TRANSPORT OPERATIONS - JOBS
            =============================================== */}

            <Route
              path="/jobs"
              element={
                <FeatureRoute
                  feature="transport_jobs"
                >
                  <TransportJobs />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                TRANSPORT OPERATIONS - DISPATCH

                Dispatch depends on Transport Jobs.
            =============================================== */}

            <Route
              path="/dispatch"
              element={
                <FeatureRoute
                  features={[
                    "transport_jobs",
                    "dispatch",
                  ]}
                >
                  <DispatchBoard />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                TRANSPORT OPERATIONS - ADMIN POD

                POD depends on Transport Jobs.
            =============================================== */}

            <Route
              path="/pod/job/:jobId"
              element={
                <FeatureRoute
                  features={[
                    "transport_jobs",
                    "pod",
                  ]}
                >
                  <AdminProofOfDelivery />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                ADMIN - VEHICLE REQUEST
            =============================================== */}

            <Route
              path="/request-vehicle"
              element={
                <FeatureRoute
                  feature="vehicle_requests"
                >
                  <RequestVehicle />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                ADMIN - VEHICLE REQUESTS
            =============================================== */}

            <Route
              path="/requests"
              element={
                <FeatureRoute
                  feature="vehicle_requests"
                >
                  <VehicleRequests />
                </FeatureRoute>
              }
            />


            <Route
              path="/requests/:requestId"
              element={
                <FeatureRoute
                  feature="vehicle_requests"
                >
                  <RequestApproval />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                ADMIN - PRE-USE / CHECKOUT
            =============================================== */}

            <Route
              path="/checkout/:requestId"
              element={
                <FeatureRoute
                  feature="vehicle_requests"
                >
                  <VehicleCheckout />
                </FeatureRoute>
              }
            />


            {/* ===============================================
                ADMIN - VEHICLE RETURN

                Vehicle return remains CORE.

                We do not disable this because an active
                trip must always be able to complete its
                return workflow.
            =============================================== */}

            <Route
              path="/vehicles/return/:usageId"
              element={
                <VehicleReturn />
              }
            />


            {/* ===============================================
                ADMIN - HISTORY
            =============================================== */}

            <Route
              path="/history"
              element={
                <FeatureRoute
                  feature="trip_history"
                >
                  <VehicleHistory />
                </FeatureRoute>
              }
            />


          </Route>


          {/* =================================================
              SHARED INCIDENT REPORT

              This stays outside ProtectedAdminRoute because
              both Admin and Employee workflows currently
              use the incident page.

              FeatureRoute still allows the module itself
              to be disabled.
          ================================================= */}

          <Route
            path="/incidents/report/:tripId"
            element={
              <FeatureRoute
                feature="incidents"
              >
                <IncidentReport />
              </FeatureRoute>
            }
          />


          {/* =================================================
              EMPLOYEE PORTAL
          ================================================= */}

          <Route
            path="/employee"
            element={
              <FeatureRoute
                feature="employee_portal"
              >
                <EmployeeDashboard />
              </FeatureRoute>
            }
          />


          {/* =================================================
              EMPLOYEE - REQUEST VEHICLE
          ================================================= */}

          <Route
            path="/employee/request-vehicle"
            element={
              <FeatureRoute
                features={[
                  "employee_portal",
                  "vehicle_requests",
                ]}
              >
                <EmployeeRequestVehicle />
              </FeatureRoute>
            }
          />


          {/* =================================================
              EMPLOYEE - MY REQUESTS
          ================================================= */}

          <Route
            path="/employee/my-requests"
            element={
              <FeatureRoute
                features={[
                  "employee_portal",
                  "vehicle_requests",
                ]}
              >
                <EmployeeMyRequests />
              </FeatureRoute>
            }
          />


          {/* =================================================
              EMPLOYEE - PRE-USE INSPECTION
          ================================================= */}

          <Route
            path="/employee/pre-inspection/:requestId"
            element={
              <FeatureRoute
                features={[
                  "employee_portal",
                  "vehicle_requests",
                ]}
              >
                <EmployeePreInspection />
              </FeatureRoute>
            }
          />


          {/* =================================================
              EMPLOYEE - DELIVERIES
          ================================================= */}

          <Route
            path="/employee/deliveries"
            element={
              <FeatureRoute
                features={[
                  "employee_portal",
                  "transport_jobs",
                  "pod",
                ]}
              >
                <EmployeeDeliveries />
              </FeatureRoute>
            }
          />


          {/* =================================================
              EMPLOYEE - PROOF OF DELIVERY
          ================================================= */}

          <Route
            path="/employee/pod/:tripId"
            element={
              <FeatureRoute
                features={[
                  "employee_portal",
                  "transport_jobs",
                  "pod",
                ]}
              >
                <EmployeeProofOfDelivery />
              </FeatureRoute>
            }
          />


          {/* =================================================
              EMPLOYEE - VEHICLE RETURN

              Employee portal must be enabled.

              We deliberately do NOT link this to the
              vehicle_requests flag because a driver may
              already have an active vehicle when requests
              are later switched OFF.
          ================================================= */}

          <Route
            path="/employee/return/:tripId"
            element={
              <FeatureRoute
                feature="employee_portal"
              >
                <EmployeeVehicleReturn />
              </FeatureRoute>
            }
          />


          {/* =================================================
              EMPLOYEE - MY TRIP HISTORY
          ================================================= */}

          <Route
            path="/employee/my-history"
            element={
              <FeatureRoute
                features={[
                  "employee_portal",
                  "trip_history",
                ]}
              >
                <EmployeeMyHistory />
              </FeatureRoute>
            }
          />


          {/* =================================================
              UNKNOWN ROUTES
          ================================================= */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />


        </Routes>

      </FeatureProvider>

    </BrowserRouter>
  );
}


export default App;
