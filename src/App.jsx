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


/* =========================================================
   EMPLOYEE PAGES
========================================================= */

import EmployeeDashboard from "./Pages/EmployeeDashboard";

import EmployeeRequestVehicle from "./Pages/EmployeeRequestVehicle";

import EmployeeMyRequests from "./Pages/EmployeeMyRequests";

import EmployeePreInspection from "./Pages/EmployeePreInspection";

import EmployeeVehicleReturn from "./Pages/EmployeeVehicleReturn";

import EmployeeMyHistory from "./Pages/EmployeeMyHistory";


function App() {
  return (
    <BrowserRouter>

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
              ADMIN - VEHICLES
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
              <EmployeeRegister />
            }
          />


          {/* ===============================================
              ADMIN - VEHICLE REQUESTS
          =============================================== */}

          <Route
            path="/request-vehicle"
            element={
              <RequestVehicle />
            }
          />


          <Route
            path="/requests"
            element={
              <VehicleRequests />
            }
          />


          <Route
            path="/requests/:requestId"
            element={
              <RequestApproval />
            }
          />


          {/* ===============================================
              ADMIN - PRE-USE / CHECKOUT
          =============================================== */}

          <Route
            path="/checkout/:requestId"
            element={
              <VehicleCheckout />
            }
          />


          {/* ===============================================
              ADMIN - VEHICLE RETURN
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
              <VehicleHistory />
            }
          />


        </Route>


        {/* =================================================
            SHARED INCIDENT REPORT

            This route is intentionally outside the Admin
            wrapper for now because both Admin and Employee
            workflows currently use it.

            We will secure its Admin/Employee access
            separately in the next security step.
        ================================================= */}

        <Route
          path="/incidents/report/:tripId"
          element={
            <IncidentReport />
          }
        />


        {/* =================================================
            EMPLOYEE PORTAL
        ================================================= */}

        <Route
          path="/employee"
          element={
            <EmployeeDashboard />
          }
        />


        {/* =================================================
            EMPLOYEE - REQUEST VEHICLE
        ================================================= */}

        <Route
          path="/employee/request-vehicle"
          element={
            <EmployeeRequestVehicle />
          }
        />


        {/* =================================================
            EMPLOYEE - MY REQUESTS
        ================================================= */}

        <Route
          path="/employee/my-requests"
          element={
            <EmployeeMyRequests />
          }
        />


        {/* =================================================
            EMPLOYEE - PRE-USE INSPECTION
        ================================================= */}

        <Route
          path="/employee/pre-inspection/:requestId"
          element={
            <EmployeePreInspection />
          }
        />


        {/* =================================================
            EMPLOYEE - VEHICLE RETURN
        ================================================= */}

        <Route
          path="/employee/return/:tripId"
          element={
            <EmployeeVehicleReturn />
          }
        />


        {/* =================================================
            EMPLOYEE - MY TRIP HISTORY
        ================================================= */}

        <Route
          path="/employee/my-history"
          element={
            <EmployeeMyHistory />
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

    </BrowserRouter>
  );
}


export default App;
