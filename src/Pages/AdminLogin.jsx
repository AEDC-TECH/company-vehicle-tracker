import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  FaCarSide,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaFingerprint,
  FaLock,
  FaShieldAlt,
  FaSpinner,
  FaUserShield,
  FaWifi,
} from "react-icons/fa";

import { supabase } from "../lib/supabase";

import "../Styles/AdminLogin.css";


function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [alreadyAdmin, setAlreadyAdmin] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  const redirectPath =
    location.state?.from?.pathname || "/";


  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);


  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Admin role check failed:",
            profileError
          );
          return;
        }

        if (
          mounted &&
          profile?.role === "admin"
        ) {
          setAlreadyAdmin(true);
        }
      } catch (sessionError) {
        console.error(
          "Session check failed:",
          sessionError
        );
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, []);


  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        "Enter your admin email address and password."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setError(
          "The email address or password is incorrect."
        );
        return;
      }

      if (!data?.user) {
        setError(
          "Unable to verify this account."
        );
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Profile lookup failed:",
          profileError
        );

        await supabase.auth.signOut();

        setError(
          "Your account could not be authorised. Please contact the system administrator."
        );
        return;
      }

      if (
        !profile ||
        profile.role !== "admin"
      ) {
        await supabase.auth.signOut();

        setError(
          "This account does not have administrator access."
        );
        return;
      }

      setAppLoading(true);

      await new Promise((resolve) =>
        setTimeout(resolve, 2200)
      );

      navigate(redirectPath, {
        replace: true,
      });
    } catch (loginError) {
      console.error(
        "Admin login failed:",
        loginError
      );

      setError(
        "Something went wrong while signing in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }


  const timeText =
    new Intl.DateTimeFormat(
      "en-ZA",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).format(currentTime);


  if (appLoading) {
    return (
      <main className="admin-app-loading">
        <div className="admin-app-loading-background">
          <div className="admin-app-loading-orb admin-app-loading-orb-one" />
          <div className="admin-app-loading-orb admin-app-loading-orb-two" />
          <div className="admin-app-loading-orb admin-app-loading-orb-three" />
        </div>

        <section className="admin-app-loading-card">
          <div className="admin-app-loading-brand">
            <div className="admin-app-loading-logo">
              <FaCarSide />
            </div>

            <div>
              <span>AEDC</span>
              <strong>
                Vehicle Management System
              </strong>
            </div>
          </div>

          <div className="admin-app-loading-animation">
            <div className="admin-app-loading-ring admin-app-loading-ring-one" />
            <div className="admin-app-loading-ring admin-app-loading-ring-two" />

            <div className="admin-app-loading-car">
              <FaCarSide />
            </div>

            <div className="admin-app-loading-road">
              <div className="admin-app-loading-road-lines" />
            </div>
          </div>

          <div className="admin-app-loading-copy">
            <span>SECURE ADMIN PORTAL</span>

            <h2>
              Starting AEDC Vehicle Manager
            </h2>

            <p>
              Verifying your administrator session
              and preparing the dashboard...
            </p>
          </div>

          <div className="admin-app-loading-progress">
            <div className="admin-app-loading-progress-bar" />
          </div>

          <div className="admin-app-loading-dots">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }


  if (checkingSession) {
    return (
      <main className="admin-login-loading">
        <div className="admin-login-loading-card">
          <FaSpinner className="admin-login-spinner" />
          <strong>
            Initialising secure terminal
          </strong>
          <span>
            Verifying session integrity...
          </span>
        </div>
      </main>
    );
  }


  if (alreadyAdmin) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  return (
    <main className="admin-command-page">
      <div className="command-atmosphere">
        <div className="command-grid" />
        <div className="command-road command-road-one" />
        <div className="command-road command-road-two" />
        <div className="command-glow command-glow-one" />
        <div className="command-glow command-glow-two" />
        <div className="command-scan-line" />
      </div>

      <header className="command-topbar">
        <div className="command-brand">
          <div className="command-brand-mark">
            <FaCarSide />
          </div>

          <div>
            <span>AEDC</span>
            <strong>
              FLEET CONTROL
            </strong>
          </div>
        </div>

        <div className="command-topbar-status">
          <span className="command-live-dot" />

          <div>
            <small>SYSTEM STATUS</small>
            <strong>ONLINE</strong>
          </div>

          <div className="command-clock">
            <small>LOCAL TIME</small>
            <strong>{timeText}</strong>
          </div>
        </div>
      </header>

      <section className="command-stage">
        <div className="command-visual">
          <div className="command-kicker">
            <span />
            AEDC VEHICLE OPERATIONS
          </div>

          <h1>
            Your fleet.
            <br />
            <span>Under command.</span>
          </h1>

          <p>
            Secure operational access to AEDC vehicle
            bookings, employees, inspections,
            incidents and permanent fleet records.
          </p>

          <div className="command-car-scene">
            <div className="command-radar command-radar-one" />
            <div className="command-radar command-radar-two" />
            <div className="command-radar command-radar-three" />

            <div className="command-car-halo">
              <FaCarSide />
            </div>

            <div className="command-car-shadow" />
          </div>

          <div className="command-system-cards">
            <div className="command-system-card">
              <FaShieldAlt />

              <div>
                <span>AUTH LAYER</span>
                <strong>Protected</strong>
              </div>

              <FaCheckCircle className="command-check" />
            </div>

            <div className="command-system-card">
              <FaWifi />

              <div>
                <span>FLEET SYSTEM</span>
                <strong>Connected</strong>
              </div>

              <FaCheckCircle className="command-check" />
            </div>
          </div>
        </div>

        <div className="command-terminal-wrap">
          <div className="command-terminal-orbit command-terminal-orbit-one" />
          <div className="command-terminal-orbit command-terminal-orbit-two" />

          <section className="command-terminal">
            <div className="command-terminal-scan" />

            <div className="command-terminal-head">
              <div className="command-terminal-icon">
                <FaFingerprint />
              </div>

              <div>
                <span>IDENTITY GATEWAY</span>
                <h2>Administrator Access</h2>
              </div>

              <div className="command-terminal-code">
                01
              </div>
            </div>

            <div className="command-terminal-divider">
              <span />
              <small>
                AUTHENTICATED PERSONNEL ONLY
              </small>
              <span />
            </div>

            {error && (
              <div
                className="command-error"
                role="alert"
              >
                <FaShieldAlt />
                <span>{error}</span>
              </div>
            )}

            <form
              className="command-form"
              onSubmit={handleSubmit}
            >
              <div className="command-field">
                <label htmlFor="admin-email">
                  ADMIN EMAIL
                </label>

                <div className="command-input-shell">
                  <FaUserShield />

                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="name@company.com"
                    autoComplete="username"
                    disabled={loading}
                  />

                  <span className="command-field-index">
                    A1
                  </span>
                </div>
              </div>

              <div className="command-field">
                <label htmlFor="admin-password">
                  SECURE PASSWORD
                </label>

                <div className="command-input-shell">
                  <FaLock />

                  <input
                    id="admin-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter access key"
                    autoComplete="current-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="command-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </button>

                  <span className="command-field-index">
                    A2
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="command-access-button"
                disabled={loading}
              >
                <span className="command-button-sweep" />

                <span className="command-button-content">
                  {loading ? (
                    <>
                      <FaSpinner className="admin-login-button-spinner" />
                      VERIFYING IDENTITY
                    </>
                  ) : (
                    <>
                      <FaFingerprint />
                      ENTER COMMAND CENTRE
                    </>
                  )}
                </span>

                <span className="command-button-code">
                  →
                </span>
              </button>
            </form>

            <div className="command-terminal-footer">
              <div>
                <span className="command-live-dot" />
                <span>
                  SECURE CONNECTION ACTIVE
                </span>
              </div>

              <span>
                AEDC / ADMIN / VMS
              </span>
            </div>
          </section>
        </div>
      </section>

      <footer className="command-footer">
        <span>
          AFRICAN ENTREPRENEURSHIP DEVELOPMENT CORPORATION
        </span>

        <span>
          VEHICLE MANAGEMENT SYSTEM
        </span>
      </footer>
    </main>
  );
}


export default AdminLogin;
