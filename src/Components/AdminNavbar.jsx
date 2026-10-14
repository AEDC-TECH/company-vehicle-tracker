import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  FaCar,
  FaClock,
  FaSignOutAlt,
  FaSyncAlt,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import AEDCLogo from "./AEDCLogo";

import "../Styles/AdminNavbar.css";


function AdminNavbar({
  onRefresh = null,
}) {
  const navigate =
    useNavigate();

  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    new Date()
  );

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);


  /* =========================================================
     LIVE LOCAL TIME
  ========================================================= */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrentTime(
            new Date()
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);


  const dashboardTimeText =
    new Intl.DateTimeFormat(
      "en-ZA",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hour12:
          false,
      }
    ).format(
      currentTime
    );


  /* =========================================================
     REFRESH
  ========================================================= */

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);

      if (
        typeof onRefresh ===
        "function"
      ) {
        await onRefresh();
      } else {
        window.location.reload();
      }

    } catch (error) {
      console.error(
        "Navbar refresh error:",
        error
      );

    } finally {
      setRefreshing(false);
    }
  }


  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      const {
        error,
      } =
        await supabase.auth
          .signOut();

      if (error) {
        throw error;
      }

      navigate(
        "/admin-login",
        {
          replace: true,
        }
      );

    } catch (error) {
      console.error(
        "Admin logout error:",
        error
      );

      alert(
        error.message ||
          "Unable to log out. Please try again."
      );

    } finally {
      setLoggingOut(false);
    }
  }


  return (
    <header className="dashboard-header">

      <div className="dashboard-header-inner">

        {/* =================================================
            AEDC BRAND
        ================================================= */}

        <Link
          to="/"
          className="dashboard-brand admin-navbar-brand-link"
        >
          <AEDCLogo
            className="dashboard-brand-logo"
          />

          <div className="dashboard-brand-text">

            <span>
              COMPANY VEHICLE TRACKER
            </span>

            <h1>
              Fleet Dashboard
            </h1>

          </div>
        </Link>


        {/* =================================================
            RIGHT SIDE ACTIONS
        ================================================= */}

        <div className="dashboard-header-actions">

          {/* SYSTEM ONLINE */}

          <div className="dashboard-navbar-status">

            <span className="dashboard-navbar-live-dot" />

            <div>

              <small>
                SYSTEM
              </small>

              <strong>
                ONLINE
              </strong>

            </div>

          </div>


          {/* LOCAL TIME */}

          <div className="dashboard-navbar-time">

            <FaClock />

            <div>

              <small>
                LOCAL TIME
              </small>

              <strong>
                {dashboardTimeText}
              </strong>

            </div>

          </div>


          {/* MANAGE VEHICLES */}

          <Link
            to="/vehicles"
            className="dashboard-header-link"
          >
            <FaCar />

            Manage Vehicles
          </Link>


          {/* REFRESH */}

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
          >
            <FaSyncAlt
              className={
                refreshing
                  ? "admin-navbar-refresh-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>


          {/* LOGOUT */}

          <button
            type="button"
            className="dashboard-logout-button"
            onClick={
              handleLogout
            }
            disabled={
              loggingOut
            }
          >
            <FaSignOutAlt />

            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </button>

        </div>

      </div>

    </header>
  );
}


export default AdminNavbar;
